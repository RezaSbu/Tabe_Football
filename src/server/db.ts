import { Pool, QueryResult } from "pg";
import path from "path";
import fs from "fs";

// ============================================
// PostgreSQL Connection Pool
// ============================================

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "tabe_football",
  user: process.env.DB_USER || "tabe_admin",
  password: process.env.DB_PASSWORD || "",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // Guard: kill any single query past 30s instead of hanging a pooled
  // connection (matches the "Connection terminated due to connection
  // timeout" deaths seen in prod logs). Normal queries are milliseconds;
  // boot migrations + admin batches run far under this per statement.
  // NOTE (deliberate, measured): no extra indexes are created — all hot
  // reads are served from the in-memory DB (loadDB); Postgres only sees
  // full-table boot loads (seq scan is optimal) plus tiny/admin selective
  // queries (dedup checks, schema_migrations, system_info). Indexes would
  // add write overhead for zero measurable read gain.
  options: "-c client_encoding=UTF8 -c statement_timeout=30s",
});

pool.on("error", (err: Error) => {
  console.error("[DB] Unexpected pool error:", err.message);
});

export { pool };

// ============================================
// Supabase-compatible Query Builder
// ============================================

interface SupabaseResult {
  data: any;
  error: any;
}

// PostgreSQL allows at most 65535 bind parameters per statement. Keep a wide
// margin and derive how many rows fit in one INSERT for a given column count.
export const MAX_UPSERT_PARAMS = 30_000;
export function upsertRowsPerChunk(columnCount: number): number {
  return Math.max(1, Math.floor(MAX_UPSERT_PARAMS / Math.max(1, columnCount)));
}

class QueryBuilder {
  private table: string;
  private operation: "select" | "upsert" | "delete" = "select";
  private columns: string = "*";
  private whereClauses: string[] = [];
  private whereParams: any[] = [];
  private orderClause: string = "";
  private limitValue: number | null = null;
  private singleResult: boolean = false;
  private upsertData: any = null;
  private paramOffset: number = 0;

  constructor(table: string) {
    this.table = table;
  }

  // Make QueryBuilder thenable so it works with await and Promise.all
  then<TResult1 = SupabaseResult, TResult2 = never>(
    onfulfilled?: ((value: SupabaseResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  select(columns: string = "*"): this {
    this.operation = "select";
    this.columns = columns;
    return this;
  }

  eq(column: string, value: any): this {
    const paramIdx = this.whereParams.length + 1 + this.paramOffset;
    this.whereClauses.push(`${column} = $${paramIdx}`);
    this.whereParams.push(value);
    return this;
  }

  neq(column: string, value: any): this {
    const paramIdx = this.whereParams.length + 1 + this.paramOffset;
    this.whereClauses.push(`${column} != $${paramIdx}`);
    this.whereParams.push(value);
    return this;
  }

  not(column: string, operator: string, value: any): this {
    if (operator === "in") {
      // Parse "(id1,id2,id3)" format
      const ids = value.replace(/^\(/, "").replace(/\)$/, "").split(",").filter(Boolean);
      if (ids.length === 0) {
        // If no ids, add impossible condition to match nothing
        this.whereClauses.push(`1 = 0`);
      } else {
        const startIdx = this.whereParams.length + 1 + this.paramOffset;
        const placeholders = ids.map((_: any, i: number) => `$${startIdx + i}`).join(", ");
        this.whereClauses.push(`${column} NOT IN (${placeholders})`);
        this.whereParams.push(...ids);
      }
    }
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }): this {
    const dir = opts?.ascending !== false ? "ASC" : "DESC";
    this.orderClause = `ORDER BY ${column} ${dir}`;
    return this;
  }

  limit(n: number): this {
    this.limitValue = n;
    return this;
  }

  maybeSingle(): this {
    this.singleResult = true;
    this.limitValue = 1;
    return this;
  }

  upsert(data: any): this {
    this.operation = "upsert";
    this.upsertData = data;
    return this;
  }

  delete(): this {
    this.operation = "delete";
    return this;
  }

  async execute(): Promise<SupabaseResult> {
    try {
      switch (this.operation) {
        case "select":
          return await this.executeSelect();
        case "upsert":
          return await this.executeUpsert();
        case "delete":
          return await this.executeDelete();
        default:
          return { data: null, error: { message: "Unknown operation" } };
      }
    } catch (err: any) {
      return { data: null, error: { message: err.message || String(err) } };
    }
  }

  private async executeSelect(): Promise<SupabaseResult> {
    const params = [...this.whereParams];
    let paramIdx = 1 + this.paramOffset;

    const whereStr =
      this.whereClauses.length > 0
        ? "WHERE " + this.whereClauses.map((c) => c.replace(/\$\d+/g, () => `$${paramIdx++}`)).join(" AND ")
        : "";

    const orderStr = this.orderClause;
    const limitStr = this.limitValue ? `LIMIT ${this.limitValue}` : "";

    const sql = `SELECT ${this.columns} FROM ${this.table} ${whereStr} ${orderStr} ${limitStr}`;

    const result = await pool.query(sql, params);

    if (this.singleResult) {
      return { data: result.rows[0] || null, error: null };
    }
    return { data: result.rows, error: null };
  }

  private buildUpsertStatement(items: any[], columns: string[], conflictCols: string[]) {
    const colStr = columns.join(", ");
    const valueSets: string[] = [];
    const allParams: any[] = [];
    let paramIdx = 1 + this.paramOffset;

    for (const item of items) {
      const placeholders = columns.map(() => `$${paramIdx++}`).join(", ");
      valueSets.push(`(${placeholders})`);
      for (const col of columns) {
        let val = item[col] !== undefined ? item[col] : null;
        if (val !== null && typeof val === "object") {
          val = JSON.stringify(val);
        }
        allParams.push(val);
      }
    }

    const updateCols = columns
      .filter((c) => c !== conflictCols[0])
      .map((c) => `${c} = EXCLUDED.${c}`)
      .join(", ");

    const sql = `INSERT INTO ${this.table} (${colStr}) VALUES ${valueSets.join(", ")}
      ON CONFLICT (${conflictCols.join(", ")})
      DO UPDATE SET ${updateCols || `${columns[0]} = EXCLUDED.${columns[0]}`}`;

    return { sql, params: allParams };
  }

  private async executeUpsert(): Promise<SupabaseResult> {
    const items = Array.isArray(this.upsertData) ? this.upsertData : [this.upsertData];
    if (items.length === 0) return { data: null, error: null };

    // Use first item to determine columns
    const firstItem = items[0];
    const columns = Object.keys(firstItem);
    const conflictCols = this.getConflictColumns();

    // PostgreSQL allows at most 65535 bind parameters per statement. The old
    // single-statement upsert was already at 59,862 params for the news table
    // (5442 rows x 11 columns), i.e. ~300 more news articles away from failing
    // every save with "cannot insert more than 65535 parameters". Chunk rows
    // well below the limit and keep the chunks in one transaction so a failed
    // chunk cannot leave a half-written table.
    const rowsPerChunk = upsertRowsPerChunk(columns.length);

    if (items.length <= rowsPerChunk) {
      const { sql, params } = this.buildUpsertStatement(items, columns, conflictCols);
      await pool.query(sql, params);
      return { data: items, error: null };
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (let start = 0; start < items.length; start += rowsPerChunk) {
        const chunk = items.slice(start, start + rowsPerChunk);
        const { sql, params } = this.buildUpsertStatement(chunk, columns, conflictCols);
        await client.query(sql, params);
      }
      await client.query("COMMIT");
      return { data: items, error: null };
    } catch (err) {
      try { await client.query("ROLLBACK"); } catch { /* connection already broken */ }
      throw err;
    } finally {
      client.release();
    }
  }

  private async executeDelete(): Promise<SupabaseResult> {
    const params = [...this.whereParams];
    let paramIdx = 1 + this.paramOffset;

    const whereStr =
      this.whereClauses.length > 0
        ? "WHERE " + this.whereClauses.map((c) => c.replace(/\$\d+/g, () => `$${paramIdx++}`)).join(" AND ")
        : "";

    const sql = `DELETE FROM ${this.table} ${whereStr}`;
    await pool.query(sql, params);
    return { data: null, error: null };
  }

  private getConflictColumns(): string[] {
    const pkMap: Record<string, string[]> = {
      config: ["id"],
      system_info: ["key"],
      teams: ["id"],
      news: ["id"],
      players: ["id"],
      coaches: ["id"],
      matches: ["id"],
      transfers: ["id"],
      legionnaires: ["id"],
      images: ["id"],
      standings: ["league_key"],
      stats: ["league_key"],
      submissions: ["id"],
      hero_slides: ["id"],
      selected_combinations: ["id"],
      bracket: ["id"],
      bracket_slots: ["id"],
      team_transfers_list: ["id"],
      media_files: ["id"],
      player_club_movements: ["id"],
      coach_club_movements: ["id"],
      lifecycle_events: ["id"],
      coach_appointments: ["id"],
      lifecycle_reasons: ["category", "code"],
    };
    return pkMap[this.table] || ["id"];
  }
}

// ============================================
// Storage Adapter (local filesystem)
// ============================================

let _uploadsDir: string = path.join(process.cwd(), "uploads");

export function getUploadsDir(): string {
  return _uploadsDir;
}

export function setUploadsDir(dir: string): void {
  _uploadsDir = dir;
}

console.log("[STORAGE] UPLOADS_DIR resolved to:", _uploadsDir);

function ensureDirSync(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

class StorageBuilder {
  private bucket: string;
  private baseDir: string;

  constructor(bucket: string, baseDir?: string) {
    this.bucket = bucket;
    this.baseDir = baseDir || _uploadsDir;
  }

  async upload(
    filePath: string,
    buffer: Buffer,
    options?: { contentType?: string; upsert?: boolean }
  ): Promise<SupabaseResult> {
    try {
      const fullPath = path.join(this.baseDir, this.bucket, filePath);
      await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });

      if (!options?.upsert) {
        const exists = await fs.promises.access(fullPath).then(() => true, () => false);
        if (exists) {
          return { data: null, error: { message: "File already exists" } };
        }
      }

      // Async write: a multi-MB image used to block the only Node thread for
      // the whole disk write (writeFileSync), freezing every concurrent request.
      await fs.promises.writeFile(fullPath, buffer);
      return { data: { path: filePath }, error: null };
    } catch (err: any) {
      console.error("[STORAGE] upload() ERROR:", err.message);
      return { data: null, error: { message: err.message } };
    }
  }

  getPublicUrl(filePath: string): { data: { publicUrl: string } } {
    const publicUrl = `/uploads/${this.bucket}/${filePath}`;
    return { data: { publicUrl } };
  }

  async remove(paths: string[]): Promise<SupabaseResult> {
    try {
      for (const p of paths) {
        const fullPath = path.join(this.baseDir, this.bucket, p);
        // `force: true` ignores ENOENT, replacing the sync exists+unlink pair.
        await fs.promises.unlink(fullPath).catch((err: any) => {
          if (err?.code !== "ENOENT") throw err;
        });
      }
      return { data: null, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  }
}

// ============================================
// Main DB client (Supabase-compatible API)
// ============================================

function from(table: string): QueryBuilder {
  return new QueryBuilder(table);
}

function storageFrom(bucket: string): StorageBuilder {
  return new StorageBuilder(bucket);
}

export const db = {
  from,
  storage: {
    from: storageFrom,
  },
};

export { StorageBuilder, ensureDirSync };
export { _uploadsDir as UPLOADS_DIR };

// ============================================
// Direct query helpers (for optimized queries)
// ============================================

export async function dbQuery(sql: string, params?: any[]): Promise<QueryResult> {
  return pool.query(sql, params);
}

export async function dbTest(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

export async function dbClose(): Promise<void> {
  await pool.end();
}
