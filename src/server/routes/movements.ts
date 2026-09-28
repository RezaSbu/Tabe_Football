import express, { Express, Request, Response } from "express";
import { loadDB } from "../state";
import { logMessage } from "../utils/logger";
import { auditLog } from "../utils/audit";
import { saveDB, markTablesDirty } from "../services/database";
import { requirePermission } from "../middleware/auth";
import { pool } from "../db";

// Real club-movement ledger. Transfer News (`transfers`, /api/transfers) is a
// separate news-only domain and is NEVER touched here: creating a movement
// does not create news, and creating news never creates a movement.
export function registerMovementRoutes(app: Express) {
  app.get("/api/player-movements", requirePermission("players"), (req: Request, res: Response) => {
    const currentDB = loadDB();
    const { playerId, seasonId } = req.query as any;
    let rows = Array.isArray(currentDB.playerMovements) ? currentDB.playerMovements : [];
    if (playerId) rows = rows.filter((m: any) => String(m.playerId) === String(playerId));
    if (seasonId) rows = rows.filter((m: any) => String(m.seasonId) === String(seasonId));
    rows = [...rows].sort((a: any, b: any) => String(b.movementDate || "").localeCompare(String(a.movementDate || "")));
    res.json({ success: true, movements: rows });
  });

  app.get("/api/coach-movements", requirePermission("coaches"), (req: Request, res: Response) => {
    const currentDB = loadDB();
    const { coachId, seasonId } = req.query as any;
    let rows = Array.isArray(currentDB.coachMovements) ? currentDB.coachMovements : [];
    if (coachId) rows = rows.filter((m: any) => String(m.coachId) === String(coachId));
    if (seasonId) rows = rows.filter((m: any) => String(m.seasonId) === String(seasonId));
    rows = [...rows].sort((a: any, b: any) => String(b.movementDate || "").localeCompare(String(a.movementDate || "")));
    res.json({ success: true, movements: rows });
  });

  // Registers a real club change inside ONE Postgres transaction:
  // movement row + current team_id update, or nothing at all (ROLLBACK).
  // Release (to free agent) passes toTeamId null + release:true.
  // Coaches are unique per team: an occupied destination 409s with the
  // incumbent unless force:true (admin chose swap/release in the UI).
  async function createMovement(
    kind: "player" | "coach",
    body: any,
    actor?: { username?: string; role?: string }
  ): Promise<{ ok: boolean; status: number; payload: any }> {
    const entityId = String(body.playerId || body.coachId || "").trim();
    const release = body.release === true || body.toTeamId == null;
    const toTeamId = !release && body.toTeamId != null ? String(body.toTeamId).trim() : null;
    const movementDate = String(body.movementDate || "").trim();
    const seasonId = String(body.seasonId || "").trim();
    const note = body.note != null ? String(body.note) : null;
    if (!entityId || !movementDate || !seasonId || (!release && !toTeamId)) {
      return { ok: false, status: 400, payload: { success: false, message: "شناسه، تاریخ انتقال و فصل الزامی است." } };
    }

    const currentDB = loadDB();
    const entityKey = kind === "player" ? "players" : "coaches";
    const idField = kind === "player" ? "playerId" : "coachId";
    const entity = (currentDB[entityKey] || []).find((e: any) => String(e.id) === entityId);
    if (!entity) {
      return { ok: false, status: 404, payload: { success: false, message: "بازیکن/مربی یافت نشد." } };
    }
    const toTeam = !release
      ? (currentDB.teams || []).find((t: any) => String(t.id) === toTeamId)
      : null;
    if (!release && !toTeam) {
      return { ok: false, status: 404, payload: { success: false, message: "تیم مقصد یافت نشد." } };
    }
    const season = (currentDB.seasons || []).find((s: any) => String(s.id) === seasonId);
    if (!season) {
      return { ok: false, status: 404, payload: { success: false, message: "فصل یافت نشد." } };
    }
    const fromTeamId = entity.teamId != null ? String(entity.teamId) : null;
    if (release && !fromTeamId) {
      return { ok: false, status: 400, payload: { success: false, message: "این فرد هم‌اکنون بدون باشگاه است." } };
    }
    if (!release && fromTeamId && fromTeamId === toTeamId) {
      return { ok: false, status: 400, payload: { success: false, message: "تیم مقصد با تیم فعلی یکی است." } };
    }
    // From-team defaults to current team; explicit fromTeamId must match it.
    if (body.fromTeamId != null && String(body.fromTeamId).trim() !== "" && String(body.fromTeamId).trim() !== (fromTeamId || "")) {
      return { ok: false, status: 400, payload: { success: false, message: "تیم مبدأ با تیم فعلی بازیکن/مربی هم‌خوانی ندارد." } };
    }
    // Occupied destination (coaches only — squads take many players).
    const incumbent: any = (kind === "coach" && !release && toTeamId
      ? (currentDB.coaches || []).find(
          (c: any) => String(c.id) !== entityId && c.teamId != null && String(c.teamId) === toTeamId
        )
      : null) || null;
    // force:true on an occupied dugout = atomically release the incumbent
    // (B->NULL ledger row) inside the same transaction, then move in.
    // A bare retry without eviction could never satisfy the unique index.
    const evictIncumbent = !!(incumbent && body.force && kind === "coach" && !release && toTeamId);
    if (incumbent && !body.force) {
      return {
        ok: false, status: 409,
        payload: { success: false, occupied: true, message: `این تیم هم‌اکنون مربی دارد (${incumbent.name}).`, occupiedBy: { id: incumbent.id, name: incumbent.name } },
      };
    }
    const table = kind === "player" ? "player_club_movements" : "coach_club_movements";
    const idCol = kind === "player" ? "player_id" : "coach_id";
    const movementId = `${kind === "player" ? "pcm" : "ccm"}-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Duplicate guard inside the transaction (unique constraint is backstop;
      // COALESCE on both sides because releases store NULL teams).
      const dup = await client.query(
        `SELECT 1 FROM ${table} WHERE ${idCol} = $1 AND COALESCE(from_team_id,'') = $2 AND COALESCE(to_team_id,'') = $3 AND movement_date = $4`,
        [entityId, fromTeamId || "", toTeamId || "", movementDate]
      );
      if (dup.rows.length > 0) {
        await client.query("ROLLBACK");
        return { ok: false, status: 409, payload: { success: false, message: "این انتقال قبلاً ثبت شده است." } };
      }
      await client.query(
        `INSERT INTO ${table} (id, ${idCol}, from_team_id, to_team_id, season_id, movement_date, note, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
        [movementId, entityId, fromTeamId, toTeamId, seasonId, movementDate, note, nowIso]
      );
      if (evictIncumbent) {
        const dupRel = await client.query(
          `SELECT 1 FROM ${table} WHERE ${idCol} = $1 AND COALESCE(from_team_id,'') = $2 AND COALESCE(to_team_id,'') = '' AND movement_date = $3`,
          [incumbent.id, toTeamId, movementDate]
        );
        if (dupRel.rows.length === 0) {
          await client.query(
            `INSERT INTO ${table} (id, ${idCol}, from_team_id, to_team_id, season_id, movement_date, note, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
            [`${movementId}-rel`, incumbent.id, toTeamId, null, seasonId, movementDate, note, nowIso]
          );
        }
        await client.query(
          `UPDATE coaches SET team_id = NULL, team_name = NULL, updated_at = now() WHERE id = $1`,
          [incumbent.id]
        );
      }
      const entityTable = kind === "player" ? "players" : "coaches";
      await client.query(
        `UPDATE ${entityTable} SET team_id = $1, team_name = $2, updated_at = now() WHERE id = $3`,
        [toTeamId, toTeam ? toTeam.name : null, entityId]
      );
      await client.query("COMMIT");
    } catch (err: any) {
      try { await client.query("ROLLBACK"); } catch (rollbackErr: any) {
        logMessage("warn", "api", "rollback ناموفق بود:", rollbackErr.message || rollbackErr);
      }
      // Unique-violation race maps to duplicate, everything else to 500.
      if (err && (err.code === "23505" || String(err.message || "").includes("uq_"))) {
        const occupied = err.code === "23505" && String(err.constraint || err.message || "").includes("one_per_team");
        if (occupied) {
          return { ok: false, status: 409, payload: { success: false, occupied: true, message: "این تیم هم‌اکنون مربی دیگری دارد." } };
        }
        return { ok: false, status: 409, payload: { success: false, message: "این انتقال قبلاً ثبت شده است." } };
      }
      logMessage("error", "api", "خطا در ثبت انتقال باشگاه:", err.message || err);
      return { ok: false, status: 500, payload: { success: false, message: "خطا در ثبت انتقال." } };
    } finally {
      client.release();
    }

    // Denormalized team coach strings (display caches; mirror teams.ts PUT).
    // Old team cleared only when nobody else still points at it.
    let teamsTouched = false;
    if (kind === "coach") {
      const othersAt = (tid: string | null) =>
        tid != null && (currentDB.coaches || []).some((c: any) => String(c.id) !== entityId && c.teamId != null && String(c.teamId) === tid);
      if (fromTeamId) {
        const prevTeam = (currentDB.teams || []).find((t: any) => String(t.id) === fromTeamId);
        if (prevTeam && !othersAt(fromTeamId)) {
          if (prevTeam.stats) prevTeam.stats.coach = "";
          prevTeam.coach = "";
          teamsTouched = true;
        }
      }
      if (toTeamId) {
        const team = (currentDB.teams || []).find((t: any) => String(t.id) === toTeamId);
        if (team && toTeam) {
          if (!team.stats) team.stats = {};
          team.stats.coach = toTeam.name;
          team.coach = toTeam.name;
          teamsTouched = true;
        }
      }
    }

    // Mirror into in-memory state and persist via saveDB (append-only tables).
    const movement = {
      id: movementId,
      [idField]: entityId,
      fromTeamId,
      toTeamId,
      seasonId,
      movementDate,
      note,
      createdAt: nowIso,
      updatedAt: nowIso
    };
    if (kind === "player") {
      if (!Array.isArray(currentDB.playerMovements)) currentDB.playerMovements = [];
      currentDB.playerMovements.unshift(movement);
      const p = (currentDB.players || []).find((e: any) => String(e.id) === entityId);
      if (p) {
        p.teamId = toTeamId;
        p.teamName = toTeam ? toTeam.name : null;
        p.updatedAt = nowIso;
      }
      markTablesDirty("players", "playerMovements");
    } else {
      if (!Array.isArray(currentDB.coachMovements)) currentDB.coachMovements = [];
      currentDB.coachMovements.unshift(movement);
      if (evictIncumbent && incumbent) {
        currentDB.coachMovements.unshift({
          id: `${movementId}-rel`,
          [idField]: incumbent.id,
          fromTeamId: toTeamId,
          toTeamId: null,
          seasonId,
          movementDate,
          note,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        const y = (currentDB.coaches || []).find((e: any) => String(e.id) === String(incumbent.id));
        if (y) {
          y.teamId = null;
          y.teamName = null;
          y.updatedAt = nowIso;
        }
      }
      const c = (currentDB.coaches || []).find((e: any) => String(e.id) === entityId);
      if (c) {
        c.teamId = toTeamId;
        c.teamName = toTeam ? toTeam.name : null;
        c.updatedAt = nowIso;
      }
      markTablesDirty("coaches", "coachMovements");
      if (teamsTouched) markTablesDirty("teams");
    }
    await saveDB();
    try {
      auditLog({
        username: actor?.username || "admin",
        role: actor?.role,
        action: `movement.${kind}.change`,
        method: "POST",
        path: kind === "player" ? "/api/player-movements" : "/api/coach-movements",
        details: {
          personId: entityId,
          prevTeamId: fromTeamId,
          newTeamId: toTeamId,
          movementDate,
          seasonId,
          movementId,
          evicted: evictIncumbent ? incumbent?.id || null : null,
        },
      });
    } catch { /* audit is fire-and-forget */ }
    return { ok: true, status: 200, payload: { success: true, movement } };
  }

  // Atomic head-coach swap X(A) <-> Y(B): two ledger rows + both assignments
  // in ONE transaction. The only safe way to exchange occupied dugouts
  // (sequential single moves would 409 on the occupied side).
  app.post("/api/coach-movements/swap", requirePermission("coaches"), async (req: Request, res: Response) => {
    const body = req.body || {};
    const xId = String(body.coachIdX || "").trim();
    const yId = String(body.coachIdY || "").trim();
    const seasonId = String(body.seasonId || "").trim();
    const movementDate = String(body.movementDate || "").trim();
    const note = body.note != null ? String(body.note) : null;
    if (!xId || !yId || !seasonId || !movementDate || xId === yId) {
      return res.status(400).json({ success: false, message: "شناسه هر دو مربی، فصل و تاریخ الزامی است." });
    }
    const currentDB = loadDB();
    const x = (currentDB.coaches || []).find((c: any) => String(c.id) === xId);
    const y = (currentDB.coaches || []).find((c: any) => String(c.id) === yId);
    if (!x || !y) {
      return res.status(404).json({ success: false, message: "مربی یافت نشد." });
    }
    const teamA = x.teamId != null ? String(x.teamId) : null;
    const teamB = y.teamId != null ? String(y.teamId) : null;
    if (!teamA || !teamB || teamA === teamB) {
      return res.status(400).json({ success: false, message: "جابه‌جایی به دو تیم متفاوت و دارای مربی نیاز دارد." });
    }
    const season = (currentDB.seasons || []).find((s: any) => String(s.id) === seasonId);
    if (!season) {
      return res.status(404).json({ success: false, message: "فصل یافت نشد." });
    }
    const teamAName = (currentDB.teams || []).find((t: any) => String(t.id) === teamA)?.name || null;
    const teamBName = (currentDB.teams || []).find((t: any) => String(t.id) === teamB)?.name || null;
    const nowIso = new Date().toISOString();
    const idx = Date.now();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const [mid, cid, from, to] of [
        [`ccm-${idx}-x`, xId, teamA, teamB],
        [`ccm-${idx}-y`, yId, teamB, teamA],
      ] as const) {
        const dup = await client.query(
          `SELECT 1 FROM coach_club_movements WHERE coach_id = $1 AND COALESCE(from_team_id,'') = $2 AND COALESCE(to_team_id,'') = $3 AND movement_date = $4`,
          [cid, from || "", to || "", movementDate]
        );
        if (dup.rows.length > 0) {
          await client.query("ROLLBACK");
          return res.status(409).json({ success: false, message: "این جابه‌جایی قبلاً ثبت شده است." });
        }
        await client.query(
          `INSERT INTO coach_club_movements (id, coach_id, from_team_id, to_team_id, season_id, movement_date, note, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
          [mid, cid, from, to, seasonId, movementDate, note, nowIso]
        );
      }
      // Three-step vacate-then-fill INSIDE one transaction: PG checks
      // non-deferrable unique indexes row-by-row, so even a single CASE
      // UPDATE would transiently violate uq_coaches_one_per_team. NULLs are
      // exempt from the partial index, so vacating first is always safe.
      await client.query(
        `UPDATE coaches SET team_id = NULL, team_name = NULL, updated_at = now() WHERE id = $1`,
        [yId]
      );
      await client.query(
        `UPDATE coaches SET team_id = $1, team_name = $2, updated_at = now() WHERE id = $3`,
        [teamB, teamBName, xId]
      );
      await client.query(
        `UPDATE coaches SET team_id = $1, team_name = $2, updated_at = now() WHERE id = $3`,
        [teamA, teamAName, yId]
      );
      await client.query("COMMIT");
    } catch (err: any) {
      try { await client.query("ROLLBACK"); } catch (rollbackErr: any) {
        logMessage("warn", "api", "rollback ناموفق بود:", rollbackErr.message || rollbackErr);
      }
      logMessage("error", "api", "خطا در جابه‌جایی مربیان:", err.message || err);
      return res.status(500).json({ success: false, message: "خطا در جابه‌جایی." });
    } finally {
      client.release();
    }
    // Memory mirror (both histories, both assignments, both denorm strings).
    if (!Array.isArray(currentDB.coachMovements)) currentDB.coachMovements = [];
    currentDB.coachMovements.unshift(
      { id: `ccm-${idx}-x`, coachId: xId, fromTeamId: teamA, toTeamId: teamB, seasonId, movementDate, note, createdAt: nowIso, updatedAt: nowIso },
      { id: `ccm-${idx}-y`, coachId: yId, fromTeamId: teamB, toTeamId: teamA, seasonId, movementDate, note, createdAt: nowIso, updatedAt: nowIso }
    );
    const xc = (currentDB.coaches || []).find((c: any) => String(c.id) === xId);
    if (xc) { xc.teamId = teamB; xc.teamName = teamBName; xc.updatedAt = nowIso; }
    const yc = (currentDB.coaches || []).find((c: any) => String(c.id) === yId);
    if (yc) { yc.teamId = teamA; yc.teamName = teamAName; yc.updatedAt = nowIso; }
    for (const [tid, holder] of [[teamA, y.name], [teamB, x.name]] as const) {
      const team = (currentDB.teams || []).find((t: any) => String(t.id) === tid);
      if (team) {
        if (!team.stats) team.stats = {};
        team.stats.coach = holder;
        team.coach = holder;
      }
    }
    markTablesDirty("coaches", "coachMovements", "teams");
    await saveDB();
    try {
      auditLog({
        username: ((req as any).user || {}).username || "admin",
        role: ((req as any).user || {}).role,
        action: "movement.coach.swap",
        method: "POST",
        path: "/api/coach-movements/swap",
        details: { coachIdX: xId, coachIdY: yId, teamA, teamB, movementDate, seasonId },
      });
    } catch { /* audit is fire-and-forget */ }
    return res.json({ success: true });
  });

  app.post("/api/player-movements", requirePermission("players"), async (req: Request, res: Response) => {
    const result = await createMovement("player", req.body || {}, (req as any).user);
    res.status(result.status).json(result.payload);
  });

  app.post("/api/coach-movements", requirePermission("coaches"), async (req: Request, res: Response) => {
    const result = await createMovement("coach", req.body || {}, (req as any).user);
    res.status(result.status).json(result.payload);
  });
}
