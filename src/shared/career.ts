export interface CareerSeasonRef {
  id: string;
  name: string;
  label?: string | null;
  isActive?: boolean;
  status?: string | null;
}

export interface CareerMovementRef {
  id: string;
  fromTeamId?: string | null;
  toTeamId?: string | null;
  seasonId?: string | null;
  movementDate?: string | null;
}

export interface CareerCard {
  key: string;
  seasonId: string | null;
  seasonName: string | null;
  seasonLabel: string | null;
  clubId: string | null;
  clubName: string | null;
  // Player metrics (null section for coaches).
  matches: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  minutes: number;
  mvps: number;
  avgRating: number | null;
  split: { league: Record<string, number | null>; cup: Record<string, number | null> };
  // Coach metrics (null section for players).
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  winRate: number | null;
  teamPoints: number | null;
  teamRank: number | null;
  isEmpty: boolean;
}

export interface CareerSeasonTotal {
  seasonId: string | null;
  seasonName: string | null;
  seasonLabel: string | null;
  clubs: number;
  matches: number;
  goals: number;
  assists: number;
  cleanSheets: number;
}

export interface CareerView {
  cards: CareerCard[];
  totals: CareerSeasonTotal[];
  /** Free-agent spans (release -> next signing), display-only, never a club card. */
  freeSpans: { from: string | null; to: string | null }[];
}

// Pure Career builder (shared by PlayerDetail + CoachDetail, unit-tested).
//
// Identity is strictly (person, season id, club id) — never names. One card
// per (season, club) actually performed for, newest season first. A mid-season
// transfer therefore yields TWO cards for the same season (never merged).
// A transfer with no matches yet yields an explicit zero card (no fake
// matches are created). The current club in the CURRENT season also yields a
// zero card when it has no row (transfer-not-yet-played coverage).
export function buildCareerCards(args: {
  kind: "player" | "coach";
  seasonRows: any[];
  movements: CareerMovementRef[];
  seasons: CareerSeasonRef[];
  currentClubId?: string | null;
  currentClubName?: string | null;
}): CareerView {
  const { kind, movements, seasons } = args;
  const rows = Array.isArray(args.seasonRows) ? args.seasonRows : [];
  const isPlayer = kind === "player";

  const seasonById = new Map<string, CareerSeasonRef>();
  for (const s of seasons || []) {
    if (s && s.id && !seasonById.has(String(s.id))) seasonById.set(String(s.id), s);
  }
  const seasonRank = (sid: string | null): string =>
    seasonById.get(String(sid || ""))?.name || String(sid || "");

  const cardByKey = new Map<string, CareerCard>();
  const keyOf = (sid: string | null, cid: string | null) =>
    `${String(sid || "noseason")}~${String(cid || "noclub")}`;

  const newCard = (sid: string | null, cid: string | null, cname: string | null): CareerCard => {
    const s = seasonById.get(String(sid || ""));
    const zeroSplit = { matches: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, minutes: 0, mvps: 0, ratingSum: 0, ratingCount: 0, averageRating: null as number | null };
    return {
      key: keyOf(sid, cid),
      seasonId: sid,
      seasonName: s?.name ?? null,
      seasonLabel: s?.label ?? null,
      clubId: cid,
      clubName: cname,
      matches: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0,
      minutes: 0, mvps: 0, avgRating: null,
      split: { league: { ...zeroSplit }, cup: { ...zeroSplit } },
      wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, winRate: null,
      teamPoints: null, teamRank: null,
      isEmpty: true,
    };
  };

  const getCard = (sid: string | null, cid: string | null, cname: string | null): CareerCard => {
    const k = keyOf(sid, cid);
    let c = cardByKey.get(k);
    if (!c) {
      c = newCard(sid, cid, cname);
      cardByKey.set(k, c);
    }
    if (cname && !c.clubName) c.clubName = cname;
    return c;
  };

  // Free-agent spans (display only): release (to == null) opens a span,
  // the next dated inbound closes it. Never a club card, never fake matches.
  // Undated rows cannot be ordered and are skipped for spans.
  const freeSpans: { from: string | null; to: string | null }[] = [];
  {
    const dated = (movements || [])
      .filter((m) => m && m.movementDate && String(m.movementDate).trim() !== "")
      .map((m) => ({
        from: m.fromTeamId != null ? String(m.fromTeamId) : null,
        to: m.toTeamId != null ? String(m.toTeamId) : null,
        date: String(m.movementDate),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    let openFrom: string | null = null;
    for (const m of dated) {
      if (m.to == null && openFrom == null) {
        openFrom = m.date;
      } else if (m.to != null && openFrom != null && m.from == null) {
        freeSpans.push({ from: openFrom, to: m.date });
        openFrom = null;
      } else if (m.to != null && openFrom != null) {
        // Direct club->club while a span was open: close at the new start.
        freeSpans.push({ from: openFrom, to: m.date });
        openFrom = null;
      }
    }
    if (openFrom != null) freeSpans.push({ from: openFrom, to: null });
  }

  if (isPlayer) {
    for (const r of rows) {
      const cid = r.teamId != null ? String(r.teamId) : null;
      const c = getCard(r.seasonId != null ? String(r.seasonId) : null, cid, r.teamName || null);
      c.isEmpty = false;
      c.matches += Number(r.matches) || 0;
      c.goals += Number(r.goals) || 0;
      c.assists += Number(r.assists) || 0;
      c.cleanSheets += Number(r.cleanSheets) || 0;
      c.yellowCards += Number(r.yellowCards) || 0;
      c.redCards += Number(r.redCards) || 0;
      c.minutes += Number(r.minutes) || 0;
      c.mvps += Number(r.mvps) || 0;
      const rSum = Number(r.ratings?.sum) || 0;
      const rCount = Number(r.ratings?.count) || 0;
      const prevSum = c.avgRating != null ? c.avgRating * ((c as any)._rc || 0) : 0;
      const prevCount = (c as any)._rc || 0;
      const tot = prevCount + rCount;
      (c as any)._rc = tot;
      c.avgRating = tot > 0 ? parseFloat(((prevSum + rSum) / tot).toFixed(1)) : null;
      for (const sp of ["league", "cup"] as const) {
        const src = sp === "league" ? r.leagueStats : r.cupStats;
        if (!src) continue;
        for (const k of ["matches", "goals", "assists", "cleanSheets", "yellowCards", "redCards", "minutes", "mvps", "ratingSum", "ratingCount"] as const) {
          (c.split[sp][k] as number) = (Number(c.split[sp][k]) || 0) + (Number((src as any)[k]) || 0);
        }
        const sc = Number(c.split[sp].ratingCount) || 0;
        c.split[sp].averageRating = sc > 0
          ? parseFloat(((Number(c.split[sp].ratingSum) || 0) / sc).toFixed(1))
          : null;
      }
    }
    // Zero cards for movement destinations with no performance row yet.
    // Releases (to == null) are spans, not club cards — skipped here.
    const rowKeys = new Set(rows.map((r: any) => keyOf(r.seasonId != null ? String(r.seasonId) : null, r.teamId != null ? String(r.teamId) : null)));
    for (const m of movements || []) {
      if (m.toTeamId == null) continue;
      const k = keyOf(m.seasonId != null ? String(m.seasonId) : null, m.toTeamId != null ? String(m.toTeamId) : null);
      if (!rowKeys.has(k)) getCard(m.seasonId != null ? String(m.seasonId) : null, m.toTeamId != null ? String(m.toTeamId) : null, null);
    }
    // Zero card for the current club in the current season (most common
    // transfer-not-yet-played shape, even with no movement row at all).
    const currentSeason = (seasons || []).find((s) => s.isActive || s.status === "current");
    if (args.currentClubId && currentSeason) {
      const k = keyOf(String(currentSeason.id), String(args.currentClubId));
      if (!cardByKey.has(k) && !rowKeys.has(k)) {
        getCard(String(currentSeason.id), String(args.currentClubId), args.currentClubName || null);
      }
    }
  } else {
    for (const r of rows) {
      const cid = r.teamId != null ? String(r.teamId) : null;
      const c = getCard(r.seasonId != null ? String(r.seasonId) : null, cid, r.teamName || null);
      c.isEmpty = false;
      c.matches += Number(r.matches) || 0;
      c.wins += Number(r.wins) || 0;
      c.draws += Number(r.draws) || 0;
      c.losses += Number(r.losses) || 0;
      c.goalsFor += Number(r.goalsFor) || 0;
      c.goalsAgainst += Number(r.goalsAgainst) || 0;
      if (r.teamPoints != null) c.teamPoints = (c.teamPoints || 0) + (Number(r.teamPoints) || 0);
      if (r.teamRank != null && (c.teamRank == null || Number(r.teamRank) < c.teamRank)) {
        c.teamRank = Number(r.teamRank);
      }
    }
    for (const c of cardByKey.values()) {
      c.winRate = c.matches > 0 ? parseFloat(((c.wins / c.matches) * 100).toFixed(1)) : null;
    }
    const rowKeys = new Set(rows.map((r: any) => keyOf(r.seasonId != null ? String(r.seasonId) : null, r.teamId != null ? String(r.teamId) : null)));
    for (const m of movements || []) {
      if (m.toTeamId == null) continue;
      const k = keyOf(m.seasonId != null ? String(m.seasonId) : null, m.toTeamId != null ? String(m.toTeamId) : null);
      if (!rowKeys.has(k)) getCard(m.seasonId != null ? String(m.seasonId) : null, m.toTeamId != null ? String(m.toTeamId) : null, null);
    }
    const currentSeason = (seasons || []).find((s) => s.isActive || s.status === "current");
    if (args.currentClubId && currentSeason) {
      const k = keyOf(String(currentSeason.id), String(args.currentClubId));
      if (!cardByKey.has(k) && !rowKeys.has(k)) {
        getCard(String(currentSeason.id), String(args.currentClubId), args.currentClubName || null);
      }
    }
  }

  const cards = [...cardByKey.values()];
  cards.sort((a, b) => {
    const r = seasonRank(b.seasonId).localeCompare(seasonRank(a.seasonId));
    if (r !== 0) return r;
    return String(a.clubName || "").localeCompare(String(b.clubName || ""));
  });

  // Season totals (additive display only; never replace the club breakdown).
  const totalsBySeason = new Map<string, CareerSeasonTotal>();
  for (const c of cards) {
    if (c.isEmpty) continue;
    const k = String(c.seasonId || "noseason");
    let t = totalsBySeason.get(k);
    if (!t) {
      t = { seasonId: c.seasonId, seasonName: c.seasonName, seasonLabel: c.seasonLabel, clubs: 0, matches: 0, goals: 0, assists: 0, cleanSheets: 0 };
      totalsBySeason.set(k, t);
    }
    t.clubs += 1;
    t.matches += c.matches;
    t.goals += c.goals;
    t.assists += c.assists;
    t.cleanSheets += c.cleanSheets;
  }
  const totals = [...totalsBySeason.values()].sort((a, b) =>
    String(b.seasonName || b.seasonId || "").localeCompare(String(a.seasonName || a.seasonId || ""))
  );

  return { cards, totals, freeSpans };
}
