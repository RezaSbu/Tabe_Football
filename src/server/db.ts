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
  password: process.env.DB_PASSWORD || "tabe_local_2026",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  options: "-c client_encoding=UTF8",
});

pool.on("error", (err) => {
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

  private async executeUpsert(): Promise<SupabaseResult> {
    const items = Array.isArray(this.upsertData) ? this.upsertData : [this.upsertData];
    if (items.length === 0) return { data: null, error: null };

    // Use first item to determine columns
    const firstItem = items[0];
    const columns = Object.keys(firstItem);
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

    const conflictCols = this.getConflictColumns();
    const updateCols = columns
      .filter((c) => c !== conflictCols[0])
      .map((c) => `${c} = EXCLUDED.${c}`)
      .join(", ");

    const sql = `INSERT INTO ${this.table} (${colStr}) VALUES ${valueSets.join(", ")}
      ON CONFLICT (${conflictCols.join(", ")})
      DO UPDATE SET ${updateCols || `${columns[0]} = EXCLUDED.${columns[0]}`}`;

    await pool.query(sql, allParams);
    return { data: items, error: null };
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
      archive: ["id"],
    };
    return pkMap[this.table] || ["id"];
  }
}

// ============================================
// Storage Adapter (local filesystem)
// ============================================

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

function ensureDirSync(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

class StorageBuilder {
  private bucket: string;

  constructor(bucket: string) {
    this.bucket = bucket;
  }

  async upload(
    filePath: string,
    buffer: Buffer,
    options?: { contentType?: string; upsert?: boolean }
  ): Promise<SupabaseResult> {
    try {
      const fullPath = path.join(UPLOADS_DIR, this.bucket, filePath);
      ensureDirSync(path.dirname(fullPath));

      if (!options?.upsert && fs.existsSync(fullPath)) {
        return { data: null, error: { message: "File already exists" } };
      }

      fs.writeFileSync(fullPath, buffer);
      return { data: { path: filePath }, error: null };
    } catch (err: any) {
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
        const fullPath = path.join(UPLOADS_DIR, this.bucket, p);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
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
