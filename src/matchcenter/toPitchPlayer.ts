/**
 * Shared pitch enrichment: turns a raw match + players + coaches into the
 * exact data shapes MatchPitch renders. Pure functions (no state, no DOM),
 * used identically by the match profile and the homepage week widget so the
 * two can never drift apart.
 */
import type { PitchCoach, PitchPlayer } from "./MatchPitch";

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

export interface EnrichedPitch {
  home: PitchPlayer[];
  away: PitchPlayer[];
  homeSubs: PitchPlayer[];
  awaySubs: PitchPlayer[];
  coaches: PitchCoach[];
}

export function enrichMatchForPitch(match: any, players: any[] = [], coaches: any[] = []): EnrichedPitch {
  const lineups = match?.lineups || {};
  const mapList = (list: any[]) => (list || []).map((p: any) => toPitchPlayer(match, players, p));
  const findCoach = (id: any) => (coaches || []).find((c: any) => String(c.id) === String(id));
  const out: PitchCoach[] = [];
  if (match?.coachHomeId) {
    const c = findCoach(match.coachHomeId);
    if (c) out.push({ id: String(c.id), name: c.name, side: "home", image: c.image });
  }
  if (match?.coachAwayId) {
    const c = findCoach(match.coachAwayId);
    if (c) out.push({ id: String(c.id), name: c.name, side: "away", image: c.image });
  }
  return {
    home: mapList(lineups.home),
    away: mapList(lineups.away),
    homeSubs: mapList(lineups.homeSubs),
    awaySubs: mapList(lineups.awaySubs),
    coaches: out,
  };
}
