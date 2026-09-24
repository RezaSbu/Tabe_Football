// Movement-aware coach tenure: WHO coached team T on date D?
//
// Player attribution is match-embedded (lineup/event ids) and transfer-proof.
// Coaches had no match-embedded presence, so every transfer rewrote every
// coach's history on the next recalc (resolved via CURRENT team mapping).
// This module is the durable fix, used by the recalc AND CoachDetail with
// identical semantics:
//
//   stamped coachHomeId/AwayId  ->  tenure lookup  ->  (legacy current-holder)
//
// Identity is strictly coach_id + team_id + dates. Undated movements cannot
// be ordered and are ignored for intervals (documented, honest).
// A match without a parseable date falls back to the current holder.

export interface TenureMovement {
  coachId: string | null;
  fromTeamId: string | null;
  toTeamId: string | null;
  movementDate: string | null;
}

export interface TenureCoach {
  id: string;
  teamId: string | null;
}

// P2: appointment-interval source. Identical shape to the movement-derived
// intervals; the resolver prefers appointments when they exist and falls
// back to the legacy ledger otherwise (per-team, never mixed mid-stream).
export interface TenureAppointment {
  coachId: string | null;
  teamId: string | null;
  startDate: string | null;
  endDate: string | null;
  status?: string | null;
}

export interface TenureInterval {
  from: number | null; // inclusive day number, null = -infinity (tenure start unknown)
  to: number | null; // exclusive day number, null = +infinity (still holder)
}

// ---------- calendar ----------

function div(a: number, b: number): number {
  return Math.floor(a / b);
}

// Gregorian date -> day number (days since civil 1970-01-01 compatible scale).
function gregorianToDay(gy: number, gm: number, gd: number): number {
  const y = gm <= 2 ? gy - 1 : gy;
  const era = div(y >= 0 ? y : y - 399, 400);
  const yoe = y - era * 400;
  const mp = (gm + 9) % 12;
  const doy = div(153 * mp + 2, 5) + gd - 1;
  const doe = yoe * 365 + div(yoe, 4) - div(yoe, 100) + doy;
  return era * 146097 + doe - 719468;
}

// Jalali support: ONE ICU-verified anchor (1405-01-01 == Gregorian 2026-03-21)
// plus validated month lengths (leap flag below). The closed-form March
// anchor was empirically unreliable, so Farvardin-1 is reached by walking
// whole Jalali years from the anchor. Validated 0 failures vs ICU across
// Jalali 1300-1599 (see lifecycle-date tests). Public API unchanged.
const ANCHOR_DAY = (() => {
  const y = 2026;
  const m = 3;
  const d = 21;
  const yy = m <= 2 ? y - 1 : y;
  const era = div(yy >= 0 ? yy : yy - 399, 400);
  const yoe = yy - era * 400;
  const mp = (m + 9) % 12;
  const doy = div(153 * mp + 2, 5) + d - 1;
  const doe = yoe * 365 + div(yoe, 4) - div(yoe, 100) + doy;
  return era * 146097 + doe - 719468;
})();
const ANCHOR_JY = 1405;

// Jalali leap flag (validated: 0 mismatches vs ICU Esfand-30 existence,
// years 1300-1599). NOTE: leap flag alone is correct; only the old March
// anchor formula was wrong, which is why this file no longer uses it.
function jalLeapFlag(jy: number): boolean {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  const bl = breaks.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];
  let jump = 0;
  for (let i = 1; i < bl; i++) {
    const jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(jump % 33, 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ += div(n, 4);
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = (((n + 1) % 33) - 1) % 4;
  if (leap === -1) leap = 4;
  return leap === 0;
}

function jalaliYearLength(jy: number): number {
  let len = 0;
  for (let m = 1; m <= 12; m++) {
    if (m <= 6) len += 31;
    else if (m <= 11) len += 30;
    else len += jalLeapFlag(jy) ? 30 : 29;
  }
  return len;
}

function farvardin1Day(jy: number): number {
  let day = ANCHOR_DAY;
  if (jy >= ANCHOR_JY) {
    for (let y = ANCHOR_JY; y < jy; y++) day += jalaliYearLength(y);
  } else {
    for (let y = jy; y < ANCHOR_JY; y++) day -= jalaliYearLength(y);
  }
  return day;
}

function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return jalLeapFlag(jy) ? 30 : 29;
}

/** Jalali month length (shared with the lifecycle date gate). */
export function jalaliMonthDays(jy: number, jm: number): number {
  return jalaliMonthLength(jy, jm);
}

function jalaliToDay(jy: number, jm: number, jd: number): number {
  let day = farvardin1Day(jy) + (jd - 1);
  for (let i = 1; i < jm; i++) day += jalaliMonthLength(jy, i);
  return day;
}

/** Day number -> Gregorian {gy,gm,gd} (Howard Hinnant civil_from_days). */
export function dayToGregorian(z: number): { gy: number; gm: number; gd: number } {
  const a = z + 719468;
  const era = div(a >= 0 ? a : a - 146096, 146097);
  const doe = a - era * 146097;
  const yoe = div(doe - div(doe, 1460) + div(doe, 36524) - div(doe, 146096), 365);
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + div(yoe, 4) - div(yoe, 100));
  const mp = div(5 * doy + 2, 153);
  const d = doy - div(153 * mp + 2, 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  return { gy: y + (m <= 2 ? 1 : 0), gm: m, gd: d };
}

/** Jalali date -> day number (same scale as Gregorian). Exported for reuse. */
export function jalaliToDayNumber(jy: number, jm: number, jd: number): number {
  return jalaliToDay(jy, jm, jd);
}

/** "2026-09-24" or "1405-07-02" (or ISO prefix) -> comparable day number, else null. */
export function comparableDay(dateStr: string | null | undefined): number | null {
  if (dateStr == null) return null;
  let s = String(dateStr).trim();
  if (!s) return null;
  const t = s.indexOf("T");
  if (t > 0) s = s.slice(0, t);
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s) || /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(s);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  if (y > 1800) return gregorianToDay(y, mo, d);
  if (y < 1800 && y > 1000) return jalaliToDay(y, mo, d);
  return null;
}

// ---------- tenure intervals ----------

/**
 * All spans during which coachId coached teamId, oldest first.
 * - No movements at all for (coach,team) but currently holding -> [{-inf,+inf}]
 *   (legacy case: degenerates EXACTLY to the old current-mapping behavior).
 * - Serial stints pair chronologically (X->B, B->C, C->B supported).
 * - Unclosed tail while still holder -> open (+inf); while not holder ->
 *   closed at the last seen event (no fabricated tenure to present).
 * - Undated movements are skipped (cannot be ordered).
 */
export function tenureIntervals(
  coachId: string,
  teamId: string,
  movements: TenureMovement[],
  currentTeamId: string | null
): TenureInterval[] {
  const cid = String(coachId);
  const tid = String(teamId);
  const rel = (movements || [])
    .filter((mv) => mv && String(mv.coachId) === cid)
    .map((mv) => ({
      from: mv.fromTeamId != null ? String(mv.fromTeamId) : null,
      to: mv.toTeamId != null ? String(mv.toTeamId) : null,
      day: comparableDay(mv.movementDate),
    }))
    .filter((mv) => mv.day != null && (mv.from === tid || mv.to === tid))
    .sort((a, b) => (a.day as number) - (b.day as number));

  if (rel.length === 0) {
    if (currentTeamId != null && String(currentTeamId) === tid) {
      return [{ from: null, to: null }];
    }
    return [];
  }

  const out: TenureInterval[] = [];
  let openFrom: number | null = null;
  let open = false;
  if (rel.length > 0 && rel[0].from === tid) {
    // First ledger row is an outbound: holding since unknown.
    open = true;
    openFrom = null;
  }
  for (const mv of rel) {
    if (mv.to === tid && !open) {
      openFrom = mv.day;
      open = true;
    } else if (mv.from === tid && open) {
      out.push({ from: openFrom, to: mv.day });
      open = false;
      openFrom = null;
    } else if (mv.to === tid && open) {
      // Re-hire while (anomalously) open: close previous at re-hire date.
      out.push({ from: openFrom, to: mv.day });
      openFrom = mv.day;
      open = true;
    }
    // Outbound while closed (data gap): nothing to close; ignore.
  }
  if (open) {
    if (currentTeamId != null && String(currentTeamId) === tid) {
      out.push({ from: openFrom, to: null });
    } else if (rel.length > 0) {
      out.push({ from: openFrom, to: rel[rel.length - 1].day });
    }
  }
  return out;
}

function contains(iv: TenureInterval, day: number): boolean {
  if (iv.from != null && day < iv.from) return false;
  if (iv.to != null && day >= iv.to) return false;
  return true;
}

/**
 * Who coached teamId on matchDateStr? Returns coach id or null (honest
 * vacancy). Overlapping ledger anomalies resolve to the latest inbound.
 * Unparseable date -> null (caller falls back to current holder).
 *
 * Determinism rule: where the ledger speaks for a team (dated intervals),
 * it governs. Movement-less infinite claims are clipped to the gaps the
 * ledger leaves silent (legacy roster fills silence only). Remaining ties
 * break by input order. Teams with no ledger activity behave EXACTLY as
 * the old current-mapping rule.
 *
 * P2: when appointment intervals exist for a (team) they take precedence
 * over the movement-derived intervals for that team; teams without any
 * appointment rows keep the legacy ledger semantics. The two sources are
 * never mixed within one team.
 */
export function coachOfTeamAt(
  teamId: string | null | undefined,
  matchDateStr: string | null | undefined,
  coaches: TenureCoach[],
  movements: TenureMovement[],
  appointments?: TenureAppointment[]
): string | null {
  if (teamId == null || teamId === "") return null;
  const day = comparableDay(matchDateStr);
  if (day == null) return null;
  const tid = String(teamId);
  const list = coaches || [];

  const dated: { from: number; to: number }[] = [];
  const perCoach: { id: string; legacyInfinite: boolean; ivs: TenureInterval[] }[] = [];
  const teamAppointments = (appointments || []).filter(
    (a) => a && a.teamId != null && String(a.teamId) === tid && a.status !== "ENDED"
  );
  // Per-team source precedence: appointments win wherever they exist;
  // movement ledger stays authoritative for teams without appointment rows.
  const useAppointments = teamAppointments.length > 0;
  for (const c of list) {
    if (!c || c.id == null) continue;
    const cid = String(c.id);
    let ivs: TenureInterval[];
    if (useAppointments) {
      // Appointment-sourced intervals for this coach on this team.
      ivs = teamAppointments
        .filter((a) => a.coachId != null && String(a.coachId) === cid)
        .map((a) => {
          const s = a.startDate != null && String(a.startDate).trim() !== "" ? comparableDay(a.startDate) : null;
          const e = a.endDate != null && String(a.endDate).trim() !== "" ? comparableDay(a.endDate) : null;
          return { from: s, to: e };
        })
        .filter((iv) => iv.from != null || iv.to != null);
      // A coach with rows but no parseable interval contributes nothing;
      // do NOT fall back to legacy for this team (sources never mix).
      if (ivs.length === 0) continue;
    } else {
      ivs = tenureIntervals(cid, tid, movements, c.teamId != null ? String(c.teamId) : null);
    }
    let legacyInfinite = false;
    for (const iv of ivs) {
      if (iv.from == null && iv.to == null) {
        legacyInfinite = true;
      } else {
        dated.push({ from: iv.from == null ? Number.NEGATIVE_INFINITY : iv.from, to: iv.to == null ? Number.POSITIVE_INFINITY : iv.to });
      }
    }
    perCoach.push({ id: String(c.id), legacyInfinite, ivs });
  }

  // Union of dated coverage, then gaps on the infinite line.
  dated.sort((a, b) => a.from - b.from);
  const merged: { from: number; to: number }[] = [];
  for (const iv of dated) {
    const last = merged[merged.length - 1];
    if (last && iv.from <= last.to) {
      if (iv.to > last.to) last.to = iv.to;
    } else {
      merged.push({ from: iv.from, to: iv.to });
    }
  }
  const gaps: { from: number | null; to: number | null }[] = [];
  let cursor: number | null = null;
  for (const iv of merged) {
    gaps.push({
      from: cursor == null ? null : cursor,
      to: iv.from === Number.NEGATIVE_INFINITY ? null : iv.from,
    });
    cursor = iv.to === Number.POSITIVE_INFINITY ? null : iv.to;
  }
  gaps.push({ from: cursor, to: null });

  const hits: { id: string; since: number; order: number }[] = [];
  perCoach.forEach(({ id, legacyInfinite, ivs }, order) => {
    const consider: TenureInterval[] = [];
    for (const iv of ivs) {
      if (iv.from == null && iv.to == null && legacyInfinite) {
        if (merged.length === 0) {
          // No ledger for this team at all: legacy claim covers everything
          // (identical to the old current-mapping rule).
          consider.push(iv);
        } else {
          for (const g of gaps) {
            // Only true silence segments (at least one finite bound).
            if (g.from != null || g.to != null) consider.push(g);
          }
        }
      } else if (!(iv.from == null && iv.to == null)) {
        consider.push(iv);
      }
    }
    for (const iv of consider) {
      if (contains(iv, day)) {
        hits.push({ id, since: iv.from == null ? Number.NEGATIVE_INFINITY : iv.from, order });
        break;
      }
    }
  });
  if (hits.length === 0) return null;
  hits.sort((a, b) => (b.since - a.since) || (a.order - b.order));
  return hits[0].id;
}
