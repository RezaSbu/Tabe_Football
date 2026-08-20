/**
 * matchSourceParser.ts — Deterministic HTML parser for varzesh3 match pages.
 *
 * Varzesh3 match URL format: https://www.varzesh3.com/football/match/{id}/{slug}
 *
 * Data is embedded in self.__next_f.push() RSC blocks.
 * RSC blocks contain $D... and $L... references that break JSON.parse on the
 * full object. Strategy: extract events[], lineup{}, stats[] individually
 * (they are pure JSON), and extract metadata via regex on surrounding text.
 *
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
    minute?: string;
    goals: { host: number; guest: number };
    host: { id: number; name: string; logo: string };
    guest: { id: number; name: string; logo: string };
    league: { title?: string; season?: string };
  };
  events: any[];
  lineup: {
    host: { formation?: string; formationLines?: any[]; players?: any[]; benchedPlayers?: any[]; coach?: any };
    guest: { formation?: string; formationLines?: any[]; players?: any[]; benchedPlayers?: any[]; coach?: any };
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
  lineups: { home: any[]; away: any[]; homeFormation?: string; awayFormation?: string; homeSubs?: any[]; awaySubs?: any[] };
  stats?: any;
  currentMinute?: string;
  v3Status?: number;
}

export interface ParseResult {
  success: boolean;
  data?: ParsedMatchData;
  raw?: Varzesh3MatchResult;
  error?: string;
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * Fetch varzesh3 match page HTML.
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
 * Extract a balanced JSON substring. Finds `searchKey` then extracts the
 * balanced `openChar`/`closeChar` pair that follows.
 * The opening char is part of searchKey, so we start at depth 1.
 */
function extractBalanced(text: string, searchKey: string, openChar: string, closeChar: string): string | null {
  const idx = text.indexOf(searchKey);
  if (idx === -1) return null;
  const start = idx + searchKey.length;
  let depth = 1;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) return text.substring(start - 1, i + 1);
    }
  }
  return null;
}

/**
 * Extract metadata fields from the text before "events":[ using regex.
 * These fields are always in the same order and are pure JSON values.
 */
function extractMetadata(text: string, eventsOffset: number): Varzesh3MatchResult['matchMeta'] | null {
  // Only look at the text between the enclosing { and "events":[
  // The enclosing { is found by walking backward from eventsOffset
  let braceDepth = 0;
  let enclosingStart = 0;
  for (let i = eventsOffset - 1; i >= 0; i--) {
    if (text[i] === '}') braceDepth++;
    else if (text[i] === '{') {
      if (braceDepth === 0) { enclosingStart = i; break; }
      braceDepth--;
    }
  }

  const header = text.substring(enclosingStart, eventsOffset);

  // Extract fields using regex
  const idMatch = header.match(/"id":(\d+)/);
  const titleMatch = header.match(/"title":"((?:[^"\\]|\\.)*)"/);
  const refereeMatch = header.match(/"referee":"((?:[^"\\]|\\.)*)"/);
  const stadiumMatch = header.match(/"stadium":"((?:[^"\\]|\\.)*)"/);
  const dateMatch = header.match(/"date":"((?:[^"\\]|\\.)*)"/);
  const timeMatch = header.match(/"time":"((?:[^"\\]|\\.)*)"/);
  const statusMatch = header.match(/"status":(\d+)/);
  const goalsMatch = header.match(/"goals":\{"host":(\d+),"guest":(\d+)\}/);
  const hostMatch = header.match(/"host":\{"id":(\d+),"name":"((?:[^"\\]|\\.)*)","logo":"((?:[^"\\]|\\.)*)"/);
  const guestMatch = header.match(/"guest":\{"id":(\d+),"name":"((?:[^"\\]|\\.)*)","logo":"((?:[^"\\]|\\.)*)"/);
  const leagueMatch = header.match(/"league":\{"title":"((?:[^"\\]|\\.)*)","logo":"[^"]*","link":"[^"]*","season":"((?:[^"\\]|\\.)*)"/);
  const liveTimeMatch = header.match(/"liveTime":"((?:[^"\\]|\\.)*)"/);

  if (!idMatch) return null;

  return {
    id: parseInt(idMatch[1], 10),
    title: titleMatch ? titleMatch[1] : '',
    referee: refereeMatch ? refereeMatch[1] : '',
    stadium: stadiumMatch ? stadiumMatch[1] : '',
    date: dateMatch ? dateMatch[1] : '',
    time: timeMatch ? timeMatch[1] : '',
    status: statusMatch ? parseInt(statusMatch[1], 10) : 0,
    minute: liveTimeMatch ? liveTimeMatch[1] : undefined,
    goals: goalsMatch ? { host: parseInt(goalsMatch[1], 10), guest: parseInt(goalsMatch[2], 10) } : { host: 0, guest: 0 },
    host: hostMatch ? { id: parseInt(hostMatch[1], 10), name: hostMatch[2], logo: hostMatch[3] } : { id: 0, name: '', logo: '' },
    guest: guestMatch ? { id: parseInt(guestMatch[1], 10), name: guestMatch[2], logo: guestMatch[3] } : { id: 0, name: '', logo: '' },
    league: leagueMatch ? { title: leagueMatch[1], season: leagueMatch[2] } : {},
  };
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

    // Extract "events":[...] — pure JSON, no RSC refs inside event objects
    const eventsJSON = extractBalanced(matchBlock, '"events":[', '[', ']');
    if (!eventsJSON) {
      return { success: false, error: 'Could not extract events array from RSC block.' };
    }
    let rawEvents: any[];
    try {
      rawEvents = JSON.parse(eventsJSON);
    } catch (e: any) {
      return { success: false, error: `Failed to parse events JSON: ${e.message}` };
    }

    // Extract "lineup":{...} — pure JSON
    const lineupJSON = extractBalanced(matchBlock, '"lineup":{', '{', '}');
    if (!lineupJSON) {
      return { success: false, error: 'Could not extract lineup data from RSC block.' };
    }
    let lineup: Varzesh3MatchResult['lineup'];
    try {
      lineup = JSON.parse(lineupJSON);
    } catch (e: any) {
      return { success: false, error: `Failed to parse lineup JSON: ${e.message}` };
    }

    // Extract "stats":[...] — optional, pure JSON
    let stats: any[] = [];
    const statsJSON = extractBalanced(matchBlock, '"stats":[', '[', ']');
    if (statsJSON) {
      try { stats = JSON.parse(statsJSON); } catch { /* optional */ }
    }

    // Extract metadata via regex on the text before "events":[
    const eventsIdx = matchBlock.indexOf('"events":[');
    const matchMeta = extractMetadata(matchBlock, eventsIdx);
    if (!matchMeta) {
      return { success: false, error: 'Could not extract match metadata from RSC block.' };
    }

    // liveTime is AFTER events[] in varzesh3's JSON, so extract from full block
    const liveTimeMatch = matchBlock.match(/"liveTime":"((?:[^"\\]|\\.)*)"/);
    if (liveTimeMatch) {
      matchMeta.minute = liveTimeMatch[1];
    }

    if (!Array.isArray(lineup.host?.formationLines) || !Array.isArray(lineup.guest?.formationLines)) {
      return { success: false, error: 'Lineup data is incomplete (missing formationLines).' };
    }

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
  const homeData = extractLineupPlayers(lineup.host);
  const awayData = extractLineupPlayers(lineup.guest);

  let currentMinute = meta.minute || '';
  if (!currentMinute && events.length > 0) {
    const lastEvent = events[events.length - 1];
    if (lastEvent.minute) currentMinute = String(lastEvent.minute);
  }

  return {
    scoreHome: meta.goals?.host || 0,
    scoreAway: meta.goals?.guest || 0,
    referee: meta.referee || '',
    venue: meta.stadium || '',
    events,
    scorersList,
    lineups: {
      home: homeData.players,
      away: awayData.players,
      homeFormation: homeData.formation,
      awayFormation: awayData.formation,
      homeSubs: homeData.benched,
      awaySubs: awayData.benched,
    },
    stats: convertStats(stats),
    currentMinute,
    v3Status: meta.status,
  };
}

/**
 * Convert a single varzesh3 event to our event format.
 */
function convertEvent(ev: any, _meta: Varzesh3MatchResult['matchMeta']): any {
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
      base.playerName = ev.outgoingPlayerName || '';
      base.playerId = ev.outgoingPlayerId ? String(ev.outgoingPlayerId) : undefined;
      base.player2Name = ev.incomingPlayerName || '';
      base.player2Id = ev.incomingPlayerId ? String(ev.incomingPlayerId) : undefined;
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
 * Build scorersList from goal events.
 */
function buildScorersList(rawEvents: any[], _meta: Varzesh3MatchResult['matchMeta']): any[] {
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
 * Now preserves: formation, line index, shirt number, captain, benched players.
 */
function extractLineupPlayers(sideData: any): { players: any[]; benched: any[]; formation: string } {
  if (!sideData) return { players: [], benched: [], formation: '' };
  const formation = sideData.formation || '';
  const players: any[] = [];
  for (const line of (sideData.formationLines || [])) {
    const lineIdx = typeof line.line === 'number' ? line.line : -1;
    for (const p of (line.players || [])) {
      const ec = p.eventCollection || {};
      players.push({
        id: String(p.id),
        name: p.name,
        number: p.shirtNumber || null,
        formationLine: lineIdx,
        isCaptain: !!p.isCaptain,
        portrait: p.portrait || null,
        goals: ec.goals?.events?.length || 0,
        assists: ec.assists?.events?.length || 0,
        yellowCard: (ec.cards?.events || []).filter((c: any) => c.cardType === 1).length,
        redCard: (ec.cards?.events || []).filter((c: any) => c.cardType === 3).length,
        substituted: !!(ec.substitutions?.events || []).length,
        subMinute: ec.substitutions?.events?.[0]?.rawTime || ec.substitutions?.events?.[0]?.time || null,
      });
    }
  }
  const benched: any[] = [];
  for (const p of (sideData.benchedPlayers || [])) {
    benched.push({
      id: String(p.id),
      name: p.name,
      number: p.shirtNumber || null,
    });
  }
  return { players, benched, formation };
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
 * Full pipeline: fetch URL -> parse -> convert.
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
