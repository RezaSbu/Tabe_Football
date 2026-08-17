/**
 * nameResolver.ts — 3-tier player name resolution.
 *
 * Tier 1: Exact ID match (fast, free)
 * Tier 2: Normalized Persian name match with team scoping (fast, free)
 * Tier 3: Gemini AI fuzzy match — Latin↔Persian, typos, full/short names (batched, single call)
 *
 * Used during sync to resolve varzesh3 player names to our DB player IDs.
 */

import { normalizePersianString } from "./persian";
import { logMessage } from "./logger";

export interface PlayerLike {
  id: string;
  name: string;
  teamId?: string;
  teamName?: string;
}

export interface ResolvedPlayer {
  dbPlayer: PlayerLike;
  matchTier: 1 | 2 | 3;
}

interface LookupIndices {
  byId: Map<string, PlayerLike>;
  byNormalizedName: Map<string, PlayerLike | 'ambiguous'>;
  byTeamAndName: Map<string, PlayerLike[]>;
}

function buildIndices(players: PlayerLike[]): LookupIndices {
  const byId = new Map<string, PlayerLike>();
  const byNormalizedName = new Map<string, PlayerLike | 'ambiguous'>();
  const byTeamAndName = new Map<string, PlayerLike[]>();

  for (const p of players) {
    byId.set(String(p.id), p);

    const norm = normalizePersianString(p.name);
    if (norm) {
      const existing = byNormalizedName.get(norm);
      if (existing && existing !== 'ambiguous') {
        byNormalizedName.set(norm, 'ambiguous');
      } else if (!existing) {
        byNormalizedName.set(norm, p);
      }
    }

    const teamNorm = normalizePersianString(p.teamName || '');
    if (teamNorm && norm) {
      const key = `${teamNorm}|${norm}`;
      const arr = byTeamAndName.get(key) || [];
      arr.push(p);
      byTeamAndName.set(key, arr);
    }
  }

  return { byId, byNormalizedName, byTeamAndName };
}

/**
 * Tier 3: Send ALL unresolved names to Gemini in a single batch call.
 */
async function resolveWithGemini(
  unresolved: { name: string; id?: string; teamHint?: string; index: number }[],
  allPlayers: PlayerLike[],
): Promise<Map<number, ResolvedPlayer>> {
  const result = new Map<number, ResolvedPlayer>();
  if (unresolved.length === 0) return result;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logMessage("warn", "resolver", "GEMINI_API_KEY not set, skipping Gemini name resolution.");
    return result;
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const client = new GoogleGenAI({ apiKey });

    const playerList = allPlayers
      .map(p => `${p.id}|${p.name}|${p.teamName || ""}`)
      .join("\n");

    const queryList = unresolved
      .map((u, i) => `${i}|${u.name}|${u.teamHint || ""}`)
      .join("\n");

    const prompt = `شما یک مطابقت‌دهنده نام بازیکن فوتبال هستید.

لیست بازیکنان پایگاه داده ما (فرمت: id|نام|تیم):
${playerList}

لیست نام‌های ورودی که باید مطابقت داده شوند (فرمت: شماره ردیف|نام ورودی|تیم):
${queryList}

برای هر ردیف ورودی، بهترین بازیکن مطابق را پیدا کنید.
معیارها: ترجمه لاتین↔فارسی، اسم کامل↔کوتاه، املای متفاوت، تطبیق تیم.

فقط JSON خالص:
{"matches":[{"i":<شماره ردیف>,"id":"<id بازیکن>","conf":<0.0-1.0>}]}

اگر مطمئن نیستید، conf کمتر از 0.6 بگذارید یا ردیف را حذف کنید.`;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json", temperature: 0 },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response");

    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.matches)) return result;

    const playerMap = new Map(allPlayers.map(p => [p.id, p]));

    for (const m of parsed.matches) {
      if (typeof m.i !== "number" || typeof m.id !== "string" || (m.conf ?? 0) < 0.6) continue;
      const dbPlayer = playerMap.get(m.id);
      const unresolvedItem = unresolved[m.i];
      if (dbPlayer && unresolvedItem) {
        result.set(unresolvedItem.index, { dbPlayer, matchTier: 3 });
        logMessage("info", "resolver",
          `Gemini: "${unresolvedItem.name}" → "${dbPlayer.name}" (${dbPlayer.id}) conf=${m.conf}`);
      }
    }
  } catch (err: any) {
    logMessage("error", "resolver", `Gemini name resolution failed: ${err.message}`);
  }

  return result;
}

/**
 * Resolve a list of varzesh3 player entries to our DB players.
 *
 * @param entries  { name, id?, teamHint? }[] from varzesh3 events/lineups
 * @param dbPlayers  Full player list from our DB
 * @returns  Parallel array — ResolvedPlayer or null (unresolved after all tiers)
 */
export async function resolvePlayerNames(
  entries: { name: string; id?: string; teamHint?: string }[],
  dbPlayers: PlayerLike[],
): Promise<(ResolvedPlayer | null)[]> {
  const results: (ResolvedPlayer | null)[] = new Array(entries.length).fill(null);
  const indices = buildIndices(dbPlayers);
  const geminiBatch: { name: string; id?: string; teamHint?: string; index: number }[] = [];

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (!e.name && !e.id) continue;

    // Tier 1: exact ID
    if (e.id) {
      const hit = indices.byId.get(String(e.id));
      if (hit) { results[i] = { dbPlayer: hit, matchTier: 1 }; continue; }
    }

    // Tier 2a: team-scoped normalized name (most precise)
    if (e.teamHint) {
      const key = `${normalizePersianString(e.teamHint)}|${normalizePersianString(e.name)}`;
      const candidates = indices.byTeamAndName.get(key);
      if (candidates?.length === 1) {
        results[i] = { dbPlayer: candidates[0], matchTier: 2 }; continue;
      }
    }

    // Tier 2b: global normalized name (only if unambiguous)
    const norm = normalizePersianString(e.name);
    if (norm) {
      const hit = indices.byNormalizedName.get(norm);
      if (hit && hit !== 'ambiguous') {
        results[i] = { dbPlayer: hit, matchTier: 2 }; continue;
      }
    }

    // Tier 3: needs Gemini
    geminiBatch.push({ name: e.name, id: e.id, teamHint: e.teamHint, index: i });
  }

  const t1t2Count = results.filter(Boolean).length;
  logMessage("info", "resolver",
    `Tier 1+2: ${t1t2Count}/${entries.length} resolved. ${geminiBatch.length} → Gemini.`);

  if (geminiBatch.length > 0) {
    const geminiResults = await resolveWithGemini(geminiBatch, dbPlayers);
    for (const [idx, resolved] of geminiResults) {
      results[idx] = resolved;
    }
  }

  const totalResolved = results.filter(Boolean).length;
  logMessage("info", "resolver",
    `Total resolved: ${totalResolved}/${entries.length} (${entries.length - totalResolved} unresolved)`);

  return results;
}

/**
 * Convenience: resolve a single player name.
 */
export async function resolveSinglePlayer(
  name: string,
  id: string | undefined,
  teamHint: string | undefined,
  dbPlayers: PlayerLike[],
): Promise<ResolvedPlayer | null> {
  const results = await resolvePlayerNames([{ name, id, teamHint }], dbPlayers);
  return results[0] || null;
}
