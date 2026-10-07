/**
 * Shared pitch enrichment: turns a raw match + players + coaches into the
 * exact data shapes MatchPitch renders. Pure functions (no state, no DOM),
 * used identically by the match profile and the homepage week widget so the
 * two can never drift apart.
 */
import type { PitchCoach, PitchPlayer } from "./MatchPitch";
import { coachOfTeamAt } from "../shared/coachTenure";
import { resolveTeam } from "../shared/teamMatch";
import { normalizePersianString } from "../utils";

type EventRole = "goal" | "assist" | "sub-out" | "sub-in" | "other";

export function getPlayerEvents(match: any, playerId: string, playerName: string): any[] {
  const events = match?.events || [];
  return events.filter((ev: any) => {
    if (!ev) return false;
    if (ev.playerId === playerId || ev.player2Id === playerId) return true;
    if (ev.playerId != null || ev.player2Id != null) return false;
    return ev.playerName === playerName || ev.player2Name === playerName;
  });
}

export function eventRoleFor(e: any, pid: string, pname: string): EventRole {
  const iamFirst = e.playerId === pid || (e.playerId == null && e.player2Id == null && e.playerName === pname);
  const iamSecond = e.player2Id === pid || (e.player2Id == null && e.player2Name === pname && !iamFirst);
  if (e.type === "substitution") {
    if (iamSecond && !iamFirst) return "sub-in";
    return "sub-out";
  }
  if ((e.type === "goal" || e.type === "penalty") && iamSecond && !iamFirst) return "assist";
  if (e.type === "assist") return "assist";
  if (e.type === "goal" || e.type === "penalty") return "goal";
  return "other";
}

export function toPitchPlayer(match: any, players: any[], p: any): PitchPlayer {
  const evs = getPlayerEvents(match, p.id, p.name);
  const subIn = (match.events || []).find((e: any) =>
    e.type === "substitution" &&
    (e.player2Id === p.id || (e.player2Id == null && e.player2Name === p.name))
  );
  const photo = (players || []).find((pl: any) => String(pl.id) === String(p.id))?.image;
  const rating = typeof p.rating === "number" ? p.rating : (p.rating ? parseFloat(p.rating) : null);
  return {
    id: String(p.id || ""),
    name: p.name,
    position: p.position,
    rating: rating != null && !isNaN(rating) ? rating : null,
    image: photo,
    captain: !!p.captain,
    x: typeof p.x === "number" ? p.x : undefined,
    y: typeof p.y === "number" ? p.y : undefined,
    events: evs.map((e: any) => ({ type: e.type, minute: e.minute, player2Name: e.player2Name, role: eventRoleFor(e, p.id, p.name) })),
    subInMinute: subIn?.minute,
    isMvp: match.mvpId != null && String(match.mvpId) === String(p.id),
  };
}

export interface PitchTenureCtx {
  movements?: any[];
  appointments?: any[];
  teams?: any[];
}

function toPitchCoach(c: any, side: "home" | "away"): PitchCoach {
  return { id: String(c.id), name: c.name, side, image: c.image };
}

/**
 * Coach for one side of a match, best evidence first:
 * 1. stamped coach id on the match,
 * 2. tenure holder on the match date (movements + appointments),
 * 3. current holder of the team (never empty when the team is known).
 */
export function resolveSideCoach(
  match: any,
  side: "home" | "away",
  coaches: any[] = [],
  ctx: PitchTenureCtx = {}
): PitchCoach | null {
  const list = coaches || [];
  const findCoach = (id: unknown) =>
    id != null && String(id).trim() !== ""
      ? list.find((c: any) => String(c?.id) === String(id))
      : undefined;
  const stampId = side === "home" ? match?.coachHomeId : match?.coachAwayId;
  const stamped = findCoach(stampId);
  if (stamped) return toPitchCoach(stamped, side);

  let tid: string | null =
    side === "home" ? match?.teamHomeId ?? null : match?.teamAwayId ?? null;
  tid = tid != null && String(tid).trim() !== "" ? String(tid) : null;
  const teamName = side === "home" ? match?.teamHome : match?.teamAway;
  if (!tid && teamName && ctx.teams) {
    const t: any = resolveTeam(ctx.teams, teamName);
    if (t?.id != null) tid = String(t.id);
  }
  if (tid) {
    const tenureCoaches = list.map((c: any) => ({
      id: String(c.id),
      teamId: c.teamId != null ? String(c.teamId) : null,
    }));
    const tenureMovements = (ctx.movements || []).map((m: any) => ({
      coachId: m.coachId != null ? String(m.coachId) : null,
      fromTeamId: m.fromTeamId != null ? String(m.fromTeamId) : null,
      toTeamId: m.toTeamId != null ? String(m.toTeamId) : null,
      movementDate: m.movementDate || null,
    }));
    const tenureAppointments = (ctx.appointments || []).map((a: any) => ({
      coachId: a.coachId != null ? String(a.coachId) : null,
      teamId: a.teamId != null ? String(a.teamId) : null,
      startDate: a.startDate || null,
      endDate: a.endDate || null,
      status: a.status || null,
    }));
    const holderId = coachOfTeamAt(tid, match?.date, tenureCoaches, tenureMovements, tenureAppointments);
    const holder = holderId && findCoach(holderId);
    if (holder) return toPitchCoach(holder, side);
  }
  // Current holder fallback: a coach whose team matches this side.
  const normName = normalizePersianString(teamName || "");
  const current = list.find((c: any) => {
    if (!c) return false;
    if (tid != null && c.teamId != null && String(c.teamId) === tid) return true;
    return normName !== "" && normalizePersianString(c.teamName || "") === normName;
  });
  return current ? toPitchCoach(current, side) : null;
}

export interface EnrichedPitch {
  home: PitchPlayer[];
  away: PitchPlayer[];
  homeSubs: PitchPlayer[];
  awaySubs: PitchPlayer[];
  coaches: PitchCoach[];
}

export function enrichMatchForPitch(match: any, players: any[] = [], coaches: any[] = [], ctx: PitchTenureCtx = {}): EnrichedPitch {
  const lineups = match?.lineups || {};
  const mapList = (list: any[]) => (list || []).map((p: any) => toPitchPlayer(match, players, p));
  const out: PitchCoach[] = [];
  const homeCoach = resolveSideCoach(match, "home", coaches, ctx);
  const awayCoach = resolveSideCoach(match, "away", coaches, ctx);
  if (homeCoach) out.push(homeCoach);
  if (awayCoach) out.push(awayCoach);
  return {
    home: mapList(lineups.home),
    away: mapList(lineups.away),
    homeSubs: mapList(lineups.homeSubs),
    awaySubs: mapList(lineups.awaySubs),
    coaches: out,
  };
}
