/**
 * matchSourceParser.ts — Deterministic HTML parser for varzesh3 match pages.
 * 
 * Varzesh3 match URL format: https://www.varzesh3.com/football/match/{id}/{slug}
 * OR https://www.varzesh3.com/handball/match/{id}/{slug}
 *
 * Data is embedded in self.__next_f.push() RSC blocks.
 * eventType: 1=goal, 2=card, 4=substitution, 5=VAR
 * cardType: 1=yellow, 3=red
 * side: 0=host/home, 1=guest/away
 */

import { logMessage } from "./logger";

export interface Varzesh3MatchResult {
  matchMeta: {
    id: number;
    title: string;
    referee: string;
    stadium: string;
    date: string;
    time: string;
    status: number;
    goals: { host: number; guest: number };
    host: { id: number; name: string; logo: string };
    guest: { id: number; name: string; logo: string };
    league: { title?: string; season?: string };
  };
  events: any[];
  lineup: {
    host: { formation: string; players: any[]; benchedPlayers: any[]; coach?: any };
    guest: { formation: string; players: any[]; benchedPlayers: any[]; coach?: any };
  };
  stats: any[];
}

export interface ParsedMatchData {
  scoreHome: number;
  scoreAway: number;
  referee: string;
  venue: string;
  events: any[];
  scorersList: any[];
  lineups: { home: any[]; away: any[] };
  stats?: any;
}

export interface ParseResult {
  success: boolean;
  data?: ParsedMatchData;
  raw?: Varzesh3MatchResult;
  error?: string;
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * Fetch varzesh3 match page and extract embedded RSC data.
 * URL must be the full match page URL including slug, e.g.:
 *   https://www.varzesh3.com/football/match/482809/بازی-آرارات-ریگا
 */
export async function fetchVarzesh3Page(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.5',
    },
  });
  if (!resp.ok) {
    throw new Error(`varzesh3 fetch failed: HTTP ${resp.status} for ${url}`);
  }
  return resp.text();
}

/**
 * Extract and decode all self.__next_f.push([1,"..."]) RSC blocks from HTML.
 */
function extractRSCBlocks(html: string): string[] {
  const blocks: string[] = [];
  const marker = 'self.__next_f.push(';
  let searchIdx = 0;
  while (true) {
    const idx = html.indexOf(marker, searchIdx);
    if (idx === -1) break;
    const endIdx = html.indexOf('])', idx);
    if (endIdx === -1) break;
    const raw = html.substring(idx, endIdx + 2);
    searchIdx = endIdx + 2;

    const startQuote = raw.indexOf('"');
    const endQuote = raw.lastIndexOf('"');
    if (startQuote === -1 || endQuote === -1 || startQuote === endQuote) continue;

    const encoded = raw.substring(startQuote + 1, endQuote);
    const decoded = encoded
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
    blocks.push(decoded);
  }
  return blocks;
}

/**
 * Find the block containing match event data (has eventType).
 */
function findMatchBlock(blocks: string[]): string | null {
  for (const block of blocks) {
    if (block.includes('eventType') && block.includes('lineup')) {
      return block;
    }
  }
  return null;
}

/**
 * Find the enclosing JSON object that contains both "events" and "lineup" keys.
 * RSC blocks have format like: 5:["$","$L1f",null,{"children":[...,{...,"events":[...],"lineup":{...}}]}]
 * The match data is nested inside children, not under a "match": key.
 */
function findMatchDataObject(text: string): any | null {
  // Find where "events":[ starts
  const eventsIdx = text.indexOf('"events":[');
  if (eventsIdx === -1) return null;

  // Walk backwards from "events" tracking brace depth to find the enclosing {
  let depth = 0;
  let braceIdx = -1;
  for (let i = eventsIdx - 1; i >= 0; i--) {
    if (text[i] === '}') depth++;
    else if (text[i] === '{') {
      if (depth === 0) {
        braceIdx = i;
        break;
      }
      depth--;
    }
  }
  if (braceIdx === -1) return null;

  // Now find the matching closing } for this {
  depth = 0;
  for (let i = braceIdx; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        const objStr = text.substring(braceIdx, i + 1);
        try {
          return JSON.parse(objStr);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * Parse the varzesh3 match page HTML and extract structured match data.
 */
export function parseVarzesh3HTML(html: string): ParseResult {
  try {
    const blocks = extractRSCBlocks(html);
    const matchBlock = findMatchBlock(blocks);
    if (!matchBlock) {
      return { success: false, error: 'Could not find match data in page HTML (no eventType block found).' };
    }

    // RSC format: data is nested inside a children array, not under a "match" key.
    // Find the enclosing object that contains "events" and "lineup".
    const dataObj = findMatchDataObject(matchBlock);
    if (!dataObj) {
      return { success: false, error: 'Could not extract match data object from RSC block.' };
    }

    // The dataObj may itself contain the match fields, or they may be inside a "children" array.
    // Walk children to find the object with "events" + "lineup".
    let matchData = dataObj;
    if (dataObj.children && Array.isArray(dataObj.children)) {
      const found = findInChildren(dataObj.children);
      if (found) matchData = found;
    }

    // Extract match metadata from the match data object
    const matchMeta: Varzesh3MatchResult['matchMeta'] = {
      id: matchData.id || 0,
      title: matchData.title || '',
      referee: matchData.referee || '',
      stadium: matchData.stadium || '',
      date: matchData.date || '',
      time: matchData.time || '',
      status: matchData.status || 0,
      goals: matchData.goals || { host: 0, guest: 0 },
      host: matchData.host || { id: 0, name: '', logo: '' },
      guest: matchData.guest || { id: 0, name: '', logo: '' },
      league: matchData.league || {},
    };

    // Extract events
    const rawEvents: any[] = Array.isArray(matchData.events) ? matchData.events : [];
    if (rawEvents.length === 0) {
      return { success: false, error: 'Events array is empty or missing.' };
    }

    // Extract lineup
    const lineup: Varzesh3MatchResult['lineup'] = matchData.lineup || { host: { formation: '', players: [], benchedPlayers: [] }, guest: { formation: '', players: [], benchedPlayers: [] } };
    if (!lineup.host || !lineup.guest) {
      return { success: false, error: 'Lineup data is incomplete.' };
    }

    // Extract stats (optional)
    const stats: any[] = Array.isArray(matchData.stats) ? matchData.stats : [];

    // Validate goal count
    const eventGoals = rawEvents.filter((e: any) => e.eventType === 1).length;
    const metaGoals = (matchMeta.goals?.host || 0) + (matchMeta.goals?.guest || 0);
    if (eventGoals !== metaGoals) {
      logMessage('warn', 'parser', `Goal count mismatch: ${eventGoals} events vs ${metaGoals} in metadata. Using metadata scores.`);
    }

    // Convert to our format
    const parsed = convertToOurFormat(matchMeta, rawEvents, lineup, stats);
    const raw: Varzesh3MatchResult = { matchMeta, events: rawEvents, lineup, stats };

    return { success: true, data: parsed, raw };
  } catch (err: any) {
    return { success: false, error: `Parse error: ${err.message}` };
  }
}

/**
 * Recursively search a children array for an object that has both "events" and "lineup".
 */
function findInChildren(children: any[]): any | null {
  for (const child of children) {
    if (child && typeof child === 'object') {
      // Check if this object has both events and lineup
      if (Array.isArray(child.events) && child.lineup) {
        return child;
      }
      // Recurse into children if present
      if (Array.isArray(child.children)) {
        const found = findInChildren(child.children);
        if (found) return found;
      }
      // Check props.children (React pattern)
      if (child.props && Array.isArray(child.props.children)) {
        const found = findInChildren(child.props.children);
        if (found) return found;
      }
    }
  }
  return null;
}

/**
 * Convert varzesh3 structure to our internal format.
 */
function convertToOurFormat(
  meta: Varzesh3MatchResult['matchMeta'],
  rawEvents: any[],
  lineup: Varzesh3MatchResult['lineup'],
  stats: any[]
): ParsedMatchData {
  const events = rawEvents.map((ev: any) => convertEvent(ev, meta));
  const scorersList = buildScorersList(rawEvents, meta);
  const homeLineup = extractLineupPlayers(lineup.host);
  const awayLineup = extractLineupPlayers(lineup.guest);

  return {
    scoreHome: meta.goals?.host || 0,
    scoreAway: meta.goals?.guest || 0,
    referee: meta.referee || '',
    venue: meta.stadium || '',
    events,
    scorersList,
    lineups: { home: homeLineup, away: awayLineup },
    stats: convertStats(stats),
  };
}

/**
 * Convert a single varzesh3 event to our event format.
 */
function convertEvent(ev: any, meta: Varzesh3MatchResult['matchMeta']): any {
  const side = ev.side === 0 ? 'home' : 'away';
  const base: any = {
    id: String(ev.id),
    minute: ev.rawTime || ev.time,
    team: side,
  };

  switch (ev.eventType) {
    case 1: // Goal
      base.type = ev.goalType === 2 ? 'own-goal' : (ev.goalType === 1 ? 'penalty' : 'goal');
      base.playerName = ev.strickerName || '';
      base.playerId = ev.strikerId ? String(ev.strikerId) : undefined;
      if (ev.assisterId || ev.assisterName) {
        base.player2Name = ev.assisterName || '';
        base.player2Id = ev.assisterId ? String(ev.assisterId) : undefined;
        base.details = `assist: ${ev.assisterName || ''}`;
      }
      break;
    case 2: // Card
      base.type = ev.cardType === 3 ? 'red-card' : 'yellow-card';
      base.playerName = ev.offendingPlayerName || '';
      base.playerId = ev.offendingPlayerId ? String(ev.offendingPlayerId) : undefined;
      break;
    case 4: // Substitution
      base.type = 'substitution';
      base.playerName = ev.incomingPlayerName || '';
      base.playerId = ev.incomingPlayerId ? String(ev.incomingPlayerId) : undefined;
      base.player2Name = ev.outgoingPlayerName || '';
      base.player2Id = ev.outgoingPlayerId ? String(ev.outgoingPlayerId) : undefined;
      break;
    case 5: // VAR
      base.type = 'var';
      base.details = ev.description || '';
      break;
    default:
      base.type = 'other';
      base.details = ev.description || '';
      break;
  }

  return base;
}

/**
 * Build scorersList from goal events, matching our internal format.
 */
function buildScorersList(rawEvents: any[], meta: Varzesh3MatchResult['matchMeta']): any[] {
  const goals = rawEvents.filter((ev: any) => ev.eventType === 1);
  return goals.map((g: any) => ({
    scorerName: g.strickerName || '',
    scorerId: g.strikerId ? String(g.strikerId) : undefined,
    name: g.strickerName || '',
    goals: 1,
    assistName: g.assisterName || undefined,
    assistId: g.assisterId ? String(g.assisterId) : undefined,
    assist: g.assisterName || undefined,
    minute: g.rawTime || g.time,
    side: g.side === 0 ? 'home' : 'away',
    type: g.goalType === 2 ? 'own-goal' : (g.goalType === 1 ? 'penalty' : 'normal'),
    matchResult: g.matchResult,
  }));
}

/**
 * Extract all starting players from varzesh3 lineup for one side.
 */
function extractLineupPlayers(sideData: any): any[] {
  if (!sideData?.formationLines) return [];
  const players: any[] = [];
  for (const line of sideData.formationLines) {
    for (const p of (line.players || [])) {
      const ec = p.eventCollection || {};
      players.push({
        id: String(p.id),
        name: p.name,
        goals: ec.goals?.events?.length || 0,
        assists: ec.assists?.events?.length || 0,
        yellowCard: (ec.cards?.events || []).filter((c: any) => c.cardType === 1).length,
        redCard: (ec.cards?.events || []).filter((c: any) => c.cardType === 3).length,
      });
    }
  }
  return players;
}

/**
 * Convert varzesh3 stats to our format.
 */
function convertStats(rawStats: any[]): any {
  if (!rawStats || rawStats.length === 0) return null;

  const result: any = {};
  for (const half of rawStats) {
    const label = half.title || '';
    const halfStats = half.stats || {};
    if (halfStats.possession) {
      result[label || 'total'] = {
        possession: { home: halfStats.possession.hostValue, away: halfStats.possession.guestValue },
      };
    }
    for (const item of (halfStats.items || [])) {
      const key = (item.title || '').toLowerCase();
      if (!result[label || 'total']) result[label || 'total'] = {};
      result[label || 'total'][key] = { home: item.hostValue, away: item.guestValue };
    }
  }
  return result;
}

/**
 * Full pipeline: fetch URL → parse → convert.
 * This is the main entry point for the deterministic parser.
 */
export async function parseMatchFromUrl(url: string): Promise<ParseResult> {
  try {
    logMessage('info', 'parser', `Fetching match data from: ${url}`);
    const html = await fetchVarzesh3Page(url);
    logMessage('info', 'parser', `Fetched ${html.length} bytes from varzesh3.`);
    const result = parseVarzesh3HTML(html);
    if (result.success) {
      logMessage('info', 'parser', `Successfully parsed match: ${result.data!.scoreHome}-${result.data!.scoreAway}, ${result.data!.events.length} events.`);
    } else {
      logMessage('warn', 'parser', `Parse failed: ${result.error}`);
    }
    return result;
  } catch (err: any) {
    const msg = `varzesh3 fetch/parse error: ${err.message}`;
    logMessage('error', 'parser', msg);
    return { success: false, error: msg };
  }
}
