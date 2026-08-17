/**
 * geminiClient.ts — Gemini AI fallback for match data parsing.
 * 
 * Used when the deterministic parser fails.
 * Model: gemini-2.5-flash
 * 
 * IMPORTANT: API key is server-side only — never exposed to the client.
 */

import { GoogleGenAI } from "@google/genai";
import { logMessage } from "./logger";
import type { ParsedMatchData } from "./matchSourceParser";

const MODEL = 'gemini-2.5-flash';

let genaiClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!genaiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables.');
    }
    genaiClient = new GoogleGenAI({ apiKey });
  }
  return genaiClient;
}

/**
 * Prompt to send to Gemini when deterministic parsing fails.
 */
function buildPrompt(htmlSnippet: string, existingError: string): string {
  return `شما یک استخراج‌کننده داده فوتبال هستید. صفحه HTML زیر از سایت ورزش۳ است.

خطای پارسر قطعی: ${existingError}

لطفاً از HTML زیر اطلاعات بازی را استخراج کنید و دقیقاً با فرمت JSON زیر پاسخ دهید.
فقط JSON خالص برگردانید، بدون متن اضافی.

فرمت مورد انتظار:
{
  "scoreHome": <عدد>,
  "scoreAway": <عدد>,
  "referee": "<نام داور>",
  "venue": "<ورزشگاه>",
  "events": [
    {
      "id": "<string>",
      "minute": "<string یا عدد>",
      "team": "home" یا "away",
      "type": "goal" | "own-goal" | "penalty" | "yellow-card" | "red-card" | "substitution",
      "playerName": "<نام بازیکن>",
      "playerId": "<شناسه بازیکن اگر موجود>",
      "player2Name": "<نام بازیکن دوم برای تعویض یا پاس گل>",
      "player2Id": "<شناسه بازیکن دوم>"
    }
  ],
  "scorersList": [
    {
      "scorerName": "<نام گلزن>",
      "scorerId": "<شناسه گلزن>",
      "name": "<نام گلزن>",
      "goals": <تعداد گل>,
      "assistName": "<نام پاس‌دهنده>",
      "assistId": "<شناسه پاس‌دهنده>",
      "minute": "<دقیقه گل>",
      "side": "home" یا "away"
    }
  ],
  "lineups": {
    "home": [
      {
        "id": "<شناسه>",
        "name": "<نام بازیکن>",
        "goals": <تعداد>,
        "assists": <تعداد>,
        "yellowCard": <تعداد>,
        "redCard": <تعداد>
      }
    ],
    "away": [ ... ]
  }
}

HTML صفحه:
${htmlSnippet.substring(0, 30000)}`;
}

/**
 * Call Gemini to parse match data from raw HTML.
 * Returns ParsedMatchData or throws.
 */
export async function parseMatchWithGemini(
  html: string,
  existingError: string
): Promise<ParsedMatchData> {
  logMessage('info', 'gemini', `Calling Gemini model ${MODEL} for match data extraction...`);

  const client = getClient();
  const prompt = buildPrompt(html, existingError);

  try {
    const response = await client.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Gemini returned empty response.');
    }

    // Parse the JSON response
    const parsed = JSON.parse(text);

    // Basic validation
    if (typeof parsed.scoreHome !== 'number' || typeof parsed.scoreAway !== 'number') {
      throw new Error('Gemini response missing score fields.');
    }
    if (!Array.isArray(parsed.events)) {
      throw new Error('Gemini response missing events array.');
    }
    if (!parsed.lineups || !Array.isArray(parsed.lineups.home) || !Array.isArray(parsed.lineups.away)) {
      throw new Error('Gemini response missing lineups.');
    }

    logMessage('info', 'gemini', `Gemini extracted: ${parsed.scoreHome}-${parsed.scoreAway}, ${parsed.events.length} events, ${parsed.scorersList?.length || 0} scorers.`);

    return parsed as ParsedMatchData;
  } catch (err: any) {
    const msg = `Gemini extraction failed: ${err.message}`;
    logMessage('error', 'gemini', msg);
    throw new Error(msg, { cause: err });
  }
}
