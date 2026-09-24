import { pool } from "../db";
import { loadDB } from "../state";
import { logMessage } from "../utils/logger";
import { auditLog } from "../utils/audit";
import { normalizeLifecycleDate, todayGregorian } from "../../shared/lifecycleDate";
import { saveDB, markTablesDirty } from "./database";

// Employment/Appointment Lifecycle service (P2).
//
// Two layers, exactly as the architecture proposal:
//   lifecycle_events  — WHAT happened (append-only facts, never updated)
//   coach_appointments — interval projection (WHO/WHERE/FROM/TO)
// Player events share the table with coach events (person_kind split) but
// each kind has its OWN rule set — never a generic transfer system.
//
// Invariants (enforced here, mirrored by DB constraints where possible):
// - event_date is a real Gregorian DATE (Jalali accepted at the gate and
//   normalized); garbage never reaches the ledger.
// - one open head-coach appointment per coach (uq partial index backstop).
// - RETIRED is terminal: hiring a retired person requires a correction event.
// - future-dated appointments are SCHEDULED (no effect until start_date).
// - legacy point-movements project to open-ended appointments ONLY for the
//   currently-assigned side; unknown starts stay NULL (honest).

export type PersonKind = "player" | "coach";

export interface LifecycleInput {
  personKind: PersonKind;
  personId: string;
  eventKind: string;
  teamId?: string | null;
  seasonId?: string | null;
  eventDate: string;
  sequence?: number;
  reasonCategory?: string | null;
  reasonCode?: string | null;
  correctionOf?: string | null;
  note?: string | null;
  actor?: string | null;
}

export interface LifecycleResult {
  ok: boolean;
  status: number;
  payload: any;
}

const PLAYER_APPOINT_KINDS = new Set(["TRANSFER", "SIGNING", "OTHER"]);
const PLAYER_DEPART_KINDS = new Set(["RELEASE", "CONTRACT_END", "RETIREMENT", "OTHER"]);
const COACH_APPOINT_KINDS = new Set(["APPOINTMENT"]);
const COACH_DEPART_KINDS = new Set(["DISMISSAL", "RESIGNATION", "MUTUAL_TERMINATION", "CONTRACT_END", "RETIRED", "OTHER"]);

export function reasonCategoryFor(kind: PersonKind, phase: "appointment" | "departure"): string {
  return kind === "coach"
    ? phase === "appointment" ? "coach_appointment" : "coach_departure"
    : phase === "appointment" ? "player_appointment" : "player_departure";
}

function fail(status: number, message: string, extra?: any): LifecycleResult {
  return { ok: false, status, payload: { success: false, message, ...(extra || {}) } };
}

export function validateReason(
  db: any,
  personKind: PersonKind,
  phase: "appointment" | "departure",
  code: string | null | undefined
): { ok: boolean; message?: string } {
  if (code == null || code === "") return { ok: true };
  const cat = reasonCategoryFor(personKind, phase);
  const hit = (db.lifecycleReasons || []).find((r: any) => r.category === cat && r.code === code);
  if (!hit) return { ok: false, message: `دلیل نامعتبر است: ${code}` };
  return { ok: true };
}

export function isRetired(db: any, kind: PersonKind, personId: string): boolean {
  const list = kind === "coach" ? db.coaches || [] : db.players || [];
  const p = list.find((e: any) => String(e.id) === String(personId));
  return !!p && p.isRetired === true;
}

/** Current team as-of a date, derived from open appointments (or legacy). */

function appointmentIdFor(teamId: string, startDate: string | null, personId: string): string {
  return `appt-${personId.slice(-8)}-${(teamId || "free").slice(-8)}-${(startDate || "unknown").replace(/-/g, "")}`;
}

/**
 * PG DATE columns come back as JS Date objects, not strings.
 * Normalizes either shape to YYYY-MM-DD for safe comparison.
 */
function pgDate(v: any): string | null {
  if (v == null) return null;
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    const p = (n: number) => String(n).padStart(2, "0");
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
  }
  const s = String(v).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/** Mirrors assignment changes into memory (PG already committed). */
function syncPersonAssignment(
  db: any,
  personKind: PersonKind,
  personId: string,
  input: LifecycleInput,
  eventDate: string,
  isFuture: boolean,
  isDeparture: boolean
): void {
  const list = personKind === "coach" ? db.coaches || [] : db.players || [];
  const person = list.find((e: any) => String(e.id) === String(personId));
  if (!person) return;
  const retired = personKind === "coach"
    ? input.eventKind === "RETIRED" || input.reasonCode === "RETIRED"
    : input.eventKind === "RETIREMENT";
  if (isFuture) {
    // Deferred effect: ledger + appointments record it; current assignment
    // flips only when the date arrives (a daily rollover or next write).
    return;
  }
  if (isDeparture) {
    const fromTeamId = person.teamId != null ? String(person.teamId) : null;
    person.teamId = null;
    person.teamName = null;
    person.isRetired = retired;
    person.updatedAt = new Date().toISOString();
    if (personKind === "coach" && fromTeamId) {
      const vacated = (db.teams || []).find((t: any) => String(t.id) === fromTeamId);
      const still = list.some((c: any) => String(c.id) !== String(personId) && c.teamId != null && String(c.teamId) === fromTeamId);
      if (vacated && !still) {
        if (vacated.stats) vacated.stats.coach = "";
        vacated.coach = "";
      }
    }
  } else if (input.teamId) {
    const team = (db.teams || []).find((t: any) => String(t.id) === String(input.teamId));
    person.teamId = String(input.teamId);
    person.teamName = team ? team.name : person.teamName;
    person.isRetired = false;
    person.updatedAt = new Date().toISOString();
    if (personKind === "coach" && team) {
      if (!team.stats) team.stats = {};
      team.stats.coach = person.name;
      team.coach = person.name;
    }
  }
  void eventDate;
}

/**
 * Records one lifecycle event + projects appointments, atomically.
 * Returns 4xx with a machine-readable payload on any rule violation.
 */
export async function recordLifecycleEvent(
  input: LifecycleInput,
  opts?: { actor?: string; path?: string }
): Promise<LifecycleResult> {
  const db = loadDB();
  const { personKind, personId } = input;
  if (personKind !== "player" && personKind !== "coach") {
    return fail(400, "نوع فرد نامعتبر است.");
  }
  const people = personKind === "coach" ? db.coaches || [] : db.players || [];
  const person = people.find((e: any) => String(e.id) === String(personId));
  if (!person) {
    return fail(404, "فرد یافت نشد.");
  }
  const validKinds = personKind === "coach"
    ? new Set([...COACH_APPOINT_KINDS, ...COACH_DEPART_KINDS])
    : new Set([...PLAYER_APPOINT_KINDS, ...PLAYER_DEPART_KINDS]);
  if (!validKinds.has(input.eventKind)) {
    return fail(400, `نوع رویداد برای ${personKind === "coach" ? "مربی" : "بازیکن"} نامعتبر است.`);
  }
  const norm = normalizeLifecycleDate(input.eventDate);
  if (!norm.ok || !norm.value) {
    return fail(400, `تاریخ نامعتبر است: ${input.eventDate || "—"}`);
  }
  const eventDate = norm.value;
  const isFuture = eventDate > todayGregorian();

  if (input.seasonId) {
    const season = (db.seasons || []).find((s: any) => String(s.id) === String(input.seasonId));
    if (!season) return fail(404, "فصل یافت نشد.");
  }
  if (input.teamId) {
    const team = (db.teams || []).find((t: any) => String(t.id) === String(input.teamId));
    if (!team) return fail(404, "تیم یافت نشد.");
  }

  const isAppointment = personKind === "coach"
    ? COACH_APPOINT_KINDS.has(input.eventKind)
    : PLAYER_APPOINT_KINDS.has(input.eventKind);
  const isDeparture = !isAppointment;
  const phase = isAppointment ? "appointment" : "departure";
  const reasonCheck = validateReason(db, personKind, phase as any, input.reasonCode);
  if (!reasonCheck.ok) return fail(400, reasonCheck.message!);

  // RETIRED is terminal: only a correction event may resurrect.
  if (isRetired(db, personKind, personId) && !input.correctionOf) {
    return fail(409, "این فرد بازنشسته است؛ بازگشت فقط با رویداد اصلاحی ممکن است.");
  }
  // Correction events must point at a real prior event of the same person.
  if (input.correctionOf) {
    const target = (db.lifecycleEvents || []).find(
      (e: any) => String(e.id) === String(input.correctionOf) && String(e.personId) === String(personId)
    );
    if (!target) return fail(404, "رویداد مبنا برای اصلاح یافت نشد.");
  }

  const nowIso = new Date().toISOString();
  const eventId = `le-${Date.now()}-${String(personId).slice(-6)}`;
  const seq = input.sequence || 0;
  const actor = input.actor || opts?.actor || null;

  // Same-day ordering: sequence must exceed the day's current max.
  // PG DATE columns return JS Date objects; compare via the YYYY-MM-DD slice.
  const dayMax = (db.lifecycleEvents || [])
    .filter((e: any) => String(e.personId) === String(personId) && String(e.eventDate).slice(0, 10) === eventDate)
    .reduce((m: number, e: any) => Math.max(m, Number(e.sequence) || 0), -1);
  if (seq <= dayMax) {
    return fail(409, "ترتیب عملیات هم‌روز نامعتبر است؛ sequence باید صعودی باشد.", { dayMax });
  }
  // Same-day chain guard: the day's last event must leave the person in a
  // state this event can start from (departure needs an open tenure,
  // appointment needs freedom). Prevents K-style collisions from passing
  // silently on stale reads.
  const sameDay = (db.lifecycleEvents || [])
    .filter((e: any) => String(e.personId) === String(personId) && String(e.eventDate).slice(0, 10) === eventDate)
    .sort((a: any, b: any) => (Number(a.sequence) || 0) - (Number(b.sequence) || 0));
  if (sameDay.length > 0 && personKind === "coach") {
    const last = sameDay[sameDay.length - 1];
    const lastWasDeparture = ["DISMISSAL", "RESIGNATION", "MUTUAL_TERMINATION", "CONTRACT_END", "RETIRED"].includes(String(last.eventKind));
    const lastWasAppointment = ["APPOINTMENT"].includes(String(last.eventKind));
    if (isDeparture && lastWasDeparture) {
      return fail(409, "این فرد امروز قبلاً آزاد شده است؛ انتصاب فعال دیگری ندارد.");
    }
    if (!isDeparture && lastWasAppointment) {
      return fail(409, "این مربی امروز قبلاً منصوب شده است؛ اول انتصاب فعال را پایان دهید.");
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const openAppts = personKind === "coach"
      ? await client.query(
          `SELECT * FROM coach_appointments WHERE coach_id = $1 AND status = 'ACTIVE' AND end_date IS NULL ORDER BY start_date DESC NULLS LAST, id DESC`,
          [personId]
        )
      : { rows: [] };

    if (personKind === "coach") {
      if (isDeparture) {
        // Must be currently appointed (open row) or legacy-holder of teamId.
        const teamId = input.teamId != null ? String(input.teamId) : null;
        let appt = openAppts.rows[0] || null;
        if (!appt && teamId) {
          // Legacy tenure without a projected row yet: allow closing by team.
          appt = { id: null, team_id: teamId, start_date: null };
        }
        if (!appt) {
          await client.query("ROLLBACK");
          return fail(409, "این مربی هم‌اکنون انتصاب فعالی ندارد.");
        }
        if (teamId && appt.team_id && String(appt.team_id) !== teamId) {
          await client.query("ROLLBACK");
          return fail(409, "تیم پایان همکاری با انتصاب فعال هم‌خوانی ندارد.");
        }
        if (pgDate(appt.start_date) && eventDate < pgDate(appt.start_date)!) {
          await client.query("ROLLBACK");
          return fail(400, "تاریخ پایان نمی‌تواند قبل از شروع انتصاب باشد.");
        }
        await client.query(
          `INSERT INTO lifecycle_events (id, person_kind, person_id, event_kind, team_id, season_id, event_date, sequence, reason_category, reason_code, appointment_id, correction_of, note, actor, created_at)
           VALUES ($1,'coach',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [eventId, personId, input.eventKind, teamId || appt.team_id, input.seasonId || null, eventDate, seq,
            reasonCategoryFor("coach", "departure"), input.reasonCode || null,
            appt.id || null, input.correctionOf || null, input.note || null, actor, nowIso]
        );
        if (appt.id) {
          await client.query(
            `UPDATE coach_appointments SET end_date = $1, status = 'ENDED', departure_reason = $2, end_event_id = $3, updated_at = now() WHERE id = $4`,
            [eventDate, input.reasonCode || null, eventId, appt.id]
          );
        }
        const retired = input.eventKind === "RETIRED" || input.reasonCode === "RETIRED";
        await client.query(
          `UPDATE coaches SET team_id = NULL, team_name = NULL, is_retired = $1, updated_at = now() WHERE id = $2`,
          [retired, personId]
        );
        // Denorm display strings on the vacated team (vacancy = cleared).
        if (teamId || appt.team_id) {
          const tid = teamId || String(appt.team_id);
          const still = await client.query(
            `SELECT 1 FROM coaches WHERE team_id = $1 AND id <> $2 LIMIT 1`, [tid, personId]
          );
          if (still.rows.length === 0) {
            await client.query(
              `UPDATE teams SET stats = jsonb_set(COALESCE(stats,'{}'::jsonb), '{coach}', '""'::jsonb) WHERE id = $1`, [tid]
            );
          }
        }
      } else {
        // Appointment: team required, no open appointment, no overlap, unique dugout.
        const teamId = input.teamId != null ? String(input.teamId) : null;
        if (!teamId) {
          await client.query("ROLLBACK");
          return fail(400, "انتصاب به تیم نیاز دارد.");
        }
        if (openAppts.rows.length > 0) {
          await client.query("ROLLBACK");
          return fail(409, "این مربی هم‌اکنون انتصاب فعال دیگری دارد؛ اول آن را پایان دهید.");
        }
        const overlap = await client.query(
          `SELECT 1 FROM coach_appointments WHERE coach_id = $1 AND status = 'ACTIVE'
             AND (start_date IS NULL OR start_date <= $2)
             AND (end_date IS NULL OR end_date >= $2) LIMIT 1`,
          [personId, eventDate]
        );
        if (overlap.rows.length > 0) {
          await client.query("ROLLBACK");
          return fail(409, "هم‌پوشانی با انتصاب فعال موجود.");
        }
        if (!isFuture) {
          const holder = await client.query(
            `SELECT id, name FROM coaches WHERE team_id = $1 AND id <> $2 LIMIT 1`, [teamId, personId]
          );
          if (holder.rows.length > 0) {
            await client.query("ROLLBACK");
            return fail(409, `این تیم هم‌اکنون مربی دارد (${holder.rows[0].name}).`, {
              occupied: true, occupiedBy: holder.rows[0],
            });
          }
        }
        const apptId = appointmentIdFor(teamId, eventDate, personId);
        const status = isFuture ? "SCHEDULED" : "ACTIVE";
        await client.query(
          `INSERT INTO lifecycle_events (id, person_kind, person_id, event_kind, team_id, season_id, event_date, sequence, reason_category, reason_code, appointment_id, correction_of, note, actor, created_at)
           VALUES ($1,'coach',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [eventId, personId, input.eventKind, teamId, input.seasonId || null, eventDate, seq,
            reasonCategoryFor("coach", "appointment"), input.reasonCode || null,
            apptId, input.correctionOf || null, input.note || null, actor, nowIso]
        );
        await client.query(
          `INSERT INTO coach_appointments (id, coach_id, team_id, role, start_date, end_date, status, appointment_reason, departure_reason, start_event_id, end_event_id, created_at, updated_at)
           VALUES ($1,$2,$3,'HEAD_COACH',$4,NULL,$5,$6,NULL,$7,NULL,$8,$8)
           ON CONFLICT (id) DO NOTHING`,
          [apptId, personId, teamId, eventDate, status, input.reasonCode || null, eventId, nowIso]
        );
        if (!isFuture) {
          const teamName = (await client.query(`SELECT name FROM teams WHERE id = $1`, [teamId])).rows[0]?.name || null;
          await client.query(
            `UPDATE coaches SET team_id = $1, team_name = $2, is_retired = false, updated_at = now() WHERE id = $3`,
            [teamId, teamName, personId]
          );
          await client.query(
            `UPDATE teams SET stats = jsonb_set(COALESCE(stats,'{}'::jsonb), '{coach}', to_jsonb($1::text)) WHERE id = $2`,
            [(db.coaches || []).find((c: any) => String(c.id) === String(personId))?.name || "", teamId]
          );
        }
      }
    } else {
      // Player branch: transfers may be direct A->B; releases close nothing
      // structural (squads are many). Rules stay player-shaped, never generic.
      if (isDeparture && input.eventKind === "RETIREMENT") {
        await client.query(
          `INSERT INTO lifecycle_events (id, person_kind, person_id, event_kind, team_id, season_id, event_date, sequence, reason_category, reason_code, appointment_id, correction_of, note, actor, created_at)
           VALUES ($1,'player',$2,$3,$4,$5,$6,$7,$8,$9,NULL,$10,$11,$12,$13)`,
          [eventId, personId, input.eventKind, input.teamId || null, input.seasonId || null, eventDate, seq,
            reasonCategoryFor("player", "departure"), input.reasonCode || null,
            input.correctionOf || null, input.note || null, actor, nowIso]
        );
        await client.query(
          `UPDATE players SET team_id = NULL, team_name = NULL, is_retired = true, updated_at = now() WHERE id = $1`,
          [personId]
        );
      } else {
        await client.query(
          `INSERT INTO lifecycle_events (id, person_kind, person_id, event_kind, team_id, season_id, event_date, sequence, reason_category, reason_code, appointment_id, correction_of, note, actor, created_at)
           VALUES ($1,'player',$2,$3,$4,$5,$6,$7,$8,$9,NULL,$10,$11,$12,$13)`,
          [eventId, personId, input.eventKind, input.teamId || null, input.seasonId || null, eventDate, seq,
            reasonCategoryFor("player", isAppointment ? "appointment" : "departure"), input.reasonCode || null,
            input.correctionOf || null, input.note || null, actor, nowIso]
        );
        if (isAppointment && input.teamId && !isFuture) {
          const teamName = (await client.query(`SELECT name FROM teams WHERE id = $1`, [input.teamId])).rows[0]?.name || null;
          await client.query(
            `UPDATE players SET team_id = $1, team_name = $2, is_retired = false, updated_at = now() WHERE id = $3`,
            [input.teamId, teamName, personId]
          );
        } else if (isDeparture && !isFuture) {
          await client.query(
            `UPDATE players SET team_id = NULL, team_name = NULL, updated_at = now() WHERE id = $1`,
            [personId]
          );
        }
      }
    }

    await client.query("COMMIT");
    // Memory mirror (same rows PG just committed) + persist via saveDB.
    // The service is the ONLY writer of these tables, so in-memory state
    // can be updated deterministically instead of refetching.
    try {
      const db = loadDB();
      const memEvent: any = {
        id: eventId,
        personKind,
        personId: String(personId),
        eventKind: input.eventKind,
        teamId: input.teamId || null,
        seasonId: input.seasonId || null,
        eventDate,
        sequence: seq,
        reasonCategory: input.reasonCode
          ? reasonCategoryFor(personKind, (COACH_APPOINT_KINDS.has(input.eventKind) || PLAYER_APPOINT_KINDS.has(input.eventKind) ? "appointment" : "departure") as any)
          : null,
        reasonCode: input.reasonCode || null,
        appointmentId: null,
        correctionOf: input.correctionOf || null,
        note: input.note || null,
        actor,
        createdAt: nowIso,
      };
      if (!Array.isArray(db.lifecycleEvents)) db.lifecycleEvents = [];
      db.lifecycleEvents.unshift(memEvent);
      if (personKind === "coach") {
        if (!Array.isArray(db.coachAppointments)) db.coachAppointments = [];
        if (isDeparture) {
          for (const a of db.coachAppointments) {
            if (String(a.coachId) === String(personId) && a.status === "ACTIVE" && a.endDate == null) {
              a.endDate = eventDate;
              a.status = "ENDED";
              a.departureReason = input.reasonCode || null;
              a.endEventId = eventId;
              a.updatedAt = nowIso;
            }
          }
        } else {
          const apptId = appointmentIdFor(String(input.teamId), eventDate, String(personId));
          memEvent.appointmentId = apptId;
          db.coachAppointments.unshift({
            id: apptId,
            coachId: String(personId),
            teamId: String(input.teamId),
            startDate: eventDate,
            endDate: null,
            status: isFuture ? "SCHEDULED" : "ACTIVE",
            appointmentReason: input.reasonCode || null,
            departureReason: null,
            startEventId: eventId,
            endEventId: null,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        }
      }
      // Person assignment mirror (coaches/players + denorm team strings).
      syncPersonAssignment(db, personKind, personId, input, eventDate, isFuture, isDeparture);
      markLifecycleDirty();
      await saveDB();
    } catch (mirrorErr: any) {
      logMessage("warn", "api", "lifecycle memory mirror failed (PG is authoritative):", mirrorErr.message || mirrorErr);
    }
    try {
      auditLog({
        username: actor || "admin",
        action: `lifecycle.${personKind}.${input.eventKind}`,
        method: "POST",
        path: opts?.path || "/api/lifecycle/events",
        details: {
          personKind, personId,
          eventKind: input.eventKind,
          teamId: input.teamId || null,
          eventDate,
          reasonCode: input.reasonCode || null,
          eventId,
        },
      });
    } catch { /* audit is fire-and-forget */ }
    return { ok: true, status: 200, payload: { success: true, eventId } };
  } catch (err: any) {
    try { await client.query("ROLLBACK"); } catch { /* ignore */ }
    if (err && err.code === "23505") {
      return fail(409, "رویداد تکراری است یا با انتصاب فعال تداخل دارد.");
    }
    logMessage("error", "api", "خطا در ثبت رویداد lifecycle:", err.message || err);
    return fail(500, "خطا در ثبت رویداد.");
  } finally {
    client.release();
  }
}

/** Read-side: who coached teamId on dateStr, from appointments first. */
export function coachOfTeamAtAppointments(
  teamId: string | null | undefined,
  dateStr: string | null | undefined,
  appointments: any[]
): string | null {
  if (teamId == null || teamId === "" || !dateStr) return null;
  const day = String(dateStr).slice(0, 10);
  const rows = (appointments || [])
    .filter((a: any) => a && String(a.teamId) === String(teamId) && a.status !== "ENDED" && a.startDate)
    .filter((a: any) => String(a.startDate).slice(0, 10) <= day && (a.endDate == null || String(a.endDate).slice(0, 10) >= day))
    .sort((a: any, b: any) => String(b.startDate).localeCompare(String(a.startDate)));
  return rows.length > 0 ? String(rows[0].coachId) : null;
}

export async function fetchLifecycleState(): Promise<{ events: any[]; appointments: any[]; reasons: any[] }> {
  const db = loadDB();
  if (Array.isArray(db.lifecycleEvents) && Array.isArray(db.coachAppointments)) {
    return { events: db.lifecycleEvents, appointments: db.coachAppointments, reasons: db.lifecycleReasons || [] };
  }
  const [ev, ap, rs] = await Promise.all([
    pool.query(`SELECT * FROM lifecycle_events ORDER BY event_date DESC, sequence DESC`),
    pool.query(`SELECT * FROM coach_appointments ORDER BY start_date DESC NULLS LAST`),
    pool.query(`SELECT * FROM lifecycle_reasons ORDER BY category, sort_order`),
  ]);
  return { events: ev.rows, appointments: ap.rows, reasons: rs.rows };
}

export function markLifecycleDirty(): void {
  markTablesDirty("lifecycleEvents", "coachAppointments", "coaches", "players", "teams");
}
