import { describe, it, expect } from 'vitest';
import {
  toEnglishDigits,
  formatStatNumber,
  formatJalaliDate,
  normalizePersianString,
  getSafeImageUrl,
  convertGregorianToShamsi,
  convertShamsiToGregorian,
  getTodayShamsi,
  computeDynamicAppletStats,
} from './utils';

describe('toEnglishDigits', () => {
  it('converts Persian digits to English', () => {
    expect(toEnglishDigits('۱۲۳۴۵')).toBe('12345');
  });

  it('converts Arabic digits to English', () => {
    expect(toEnglishDigits('١٢٣')).toBe('123');
  });

  it('returns empty string for empty input', () => {
    expect(toEnglishDigits('')).toBe('');
  });

  it('leaves English digits unchanged', () => {
    expect(toEnglishDigits('abc123')).toBe('abc123');
  });

  it('handles mixed content', () => {
    expect(toEnglishDigits('Score: ۲-۱')).toBe('Score: 2-1');
  });
});

describe('formatStatNumber', () => {
  it('keeps Latin digits unchanged', () => {
    expect(formatStatNumber(123)).toBe('123');
  });

  it('keeps string numbers unchanged', () => {
    expect(formatStatNumber('456')).toBe('456');
  });

  it('handles zero', () => {
    expect(formatStatNumber(0)).toBe('0');
  });

  it('normalizes Persian digits to Latin for display', () => {
    expect(formatStatNumber('۱۲۳')).toBe('123');
  });

  it('returns empty string for nullish input', () => {
    expect(formatStatNumber(null)).toBe('');
    expect(formatStatNumber(undefined)).toBe('');
  });
});

describe('normalizePersianString', () => {
  it('returns empty string for falsy input', () => {
    expect(normalizePersianString('')).toBe('');
    expect(normalizePersianString(null as any)).toBe('');
    expect(normalizePersianString(undefined as any)).toBe('');
  });

  it('trims whitespace', () => {
    expect(normalizePersianString('  hello  ')).toBe('hello');
  });

  it('replaces Arabic Ye with Persian Ye', () => {
    expect(normalizePersianString('مسي')).toBe('مسی');
  });

  it('replaces Arabic Ke with Persian Ke', () => {
    expect(normalizePersianString('كريم')).toBe('کریم');
  });

  it('converts Persian digits to English', () => {
    expect(normalizePersianString('۱۲۳')).toBe('123');
  });

  it('lowercases the string', () => {
    expect(normalizePersianString('Hello')).toBe('hello');
  });

  it('removes zero-width spaces', () => {
    expect(normalizePersianString('he\u200Bllo')).toBe('hello');
  });

  it('normalizes multiple spaces to single space', () => {
    expect(normalizePersianString('hello   world')).toBe('hello world');
  });
});

describe('getSafeImageUrl', () => {
  it('returns fallback for empty URL', () => {
    const result = getSafeImageUrl('');
    expect(result).toContain('unsplash');
  });

  it('returns relative URL as-is', () => {
    expect(getSafeImageUrl('/uploads/photo.jpg')).toBe('/uploads/photo.jpg');
  });

  it('proxies Varzesh3 images', () => {
    const result = getSafeImageUrl('https://www.varzesh3.com/image.jpg');
    expect(result).toContain('/api/image-proxy?url=');
  });

  it('returns external URLs as-is', () => {
    const url = 'https://example.com/photo.jpg';
    expect(getSafeImageUrl(url)).toBe(url);
  });
});

describe('convertGregorianToShamsi', () => {
  it('converts a known Gregorian date to Shamsi', () => {
    const result = convertGregorianToShamsi('2024-03-20');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('returns original for empty input', () => {
    expect(convertGregorianToShamsi('')).toBe('');
  });

  it('returns original for invalid format', () => {
    expect(convertGregorianToShamsi('not-a-date')).toBe('not-a-date');
  });
});

describe('convertShamsiToGregorian', () => {
  it('converts a known Shamsi date to Gregorian', () => {
    const result = convertShamsiToGregorian('1403-01-01');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns original for empty input', () => {
    expect(convertShamsiToGregorian('')).toBe('');
  });
});

describe('getTodayShamsi', () => {
  it('returns a non-empty string', () => {
    const result = getTodayShamsi();
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });
});

describe('computeDynamicAppletStats — live minute persistence', () => {
  // Build a match whose start time is `pastMinutes` minutes ago (so elapsed
  // would normally drive the minute) and today's date/time.
  function liveMatch(pastMinutes: number, storedMinute?: string | null) {
    const past = new Date(Date.now() - pastMinutes * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const date = `${past.getFullYear()}-${pad(past.getMonth() + 1)}-${pad(past.getDate())}`;
    const time = `${pad(past.getHours())}:${pad(past.getMinutes())}:00`;
    return {
      id: 'm1',
      teamHome: 'تیم الف',
      teamAway: 'تیم ب',
      status: 'live',
      date,
      time,
      minutes: typeof storedMinute === 'undefined' ? '46' : storedMinute,
      scoreHome: 0,
      scoreAway: 0,
    };
  }

  it('keeps a manually stored minute instead of recomputing from elapsed', () => {
    // Match started only 2 min ago, but admin stored minute 46. The client-side
    // calculator must NOT overwrite it back to ~2.
    const { processedMatches } = computeDynamicAppletStats([liveMatch(2, '46')], [], [], {}, {});
    expect(processedMatches[0].minutes).toBe('46');
  });

  it('derives the minute from elapsed only when no stored minute exists', () => {
    const { processedMatches } = computeDynamicAppletStats([liveMatch(10, null)], [], [], {}, {});
    expect(parseInt(processedMatches[0].minutes, 10)).toBeGreaterThanOrEqual(1);
  });

  it('marks a live match with a stored minute as live', () => {
    const { processedMatches } = computeDynamicAppletStats([liveMatch(2, '46')], [], [], {}, {});
    expect(processedMatches[0].status).toBe('live');
  });
});

describe('computeDynamicAppletStats — ratings single source of truth', () => {
  function team(id: string, name: string): any {
    return {
      id,
      name,
      divisionKey: 'pro-league',
      stats: { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
    };
  }

  function playerRow(id: string, name: string, teamId: string, team: string, avgRating: number, games: number): any {
    return {
      id,
      name,
      teamName: team,
      teamId,
      position: 'مهاجم',
      leagueStats: { goals: 0, assists: 0, cleanSheets: 0, averageRating: avgRating, ratingCount: games },
      seasonStats: {},
    };
  }

  const teams = [team('t-یک', 'یک'), team('t-دو', 'دو')];

  it('prefers the server ratings (min-5 filtered) over a local recompute', () => {
    // The server leaderboard only ever contains min-5-rated players (players
    // with 1-4 rated games are excluded server-side). A local recompute without
    // the min-5 rule WOULD rank a 1-game player first; the pass-through must
    // never reintroduce such rows. The server array is rating-sorted already.
    const persistedStats = {
      'pro-league': {
        scorers: [],
        assists: [],
        cleansheets: [],
        ratings: [
          { rank: 1, id: 'a', name: 'الف', team: 'یک', rating: 8.5, matches: 6 },
          { rank: 2, id: 'b', name: 'ب', team: 'دو', rating: 7.2, matches: 5 },
        ],
      },
    };
    const players = [
      playerRow('a', 'الف', 't-یک', 'یک', 8.5, 6),
      // "ج" has a suspicious 9.5 from a single rated game: server excluded it,
      // and the client must NOT recompute it back into the list.
      playerRow('c', 'ج', 't-یک', 'یک', 9.5, 1),
      playerRow('b', 'ب', 't-دو', 'دو', 7.2, 5),
    ];
    const { processedStats } = computeDynamicAppletStats([], teams, players, {}, persistedStats);
    const ratings = processedStats['pro-league'].ratings;
    // Pass-through: exactly the two server rows, still rating-sorted.
    expect(ratings).toHaveLength(2);
    expect(ratings[0].id).toBe('a');
    expect(ratings[1].id).toBe('b');
    expect(ratings[0].matches).toBe(6);
    // The 1-game player ("ج") must stay absent regardless of its rating.
    expect(ratings.some((r: any) => r.id === 'c')).toBe(false);
  });

  it('recomputes locally only when the server provides no ratings', () => {
    const players = [
      playerRow('a', 'الف', 't-یک', 'یک', 8.5, 6),
      playerRow('b', 'ب', 't-دو', 'دو', 7.2, 5),
    ];
    const { processedStats } = computeDynamicAppletStats([], teams, players, {}, {});
    const ratings = processedStats['pro-league'].ratings;
    expect(ratings).toHaveLength(2);
    expect(ratings[0].name).toBe('الف');
    expect(ratings[1].name).toBe('ب');
    expect(ratings[0].matches).toBe(6);
  });

  it('applies the min-5 gate in the local fallback (1-game wonders stay out)', () => {
    // Regression: league-1/hazfi leaderboards once ranked a 1-game 9.5 first
    // whenever the server list was empty. The fallback mirrors the server gate.
    const players = [
      playerRow('c', 'ج', 't-یک', 'یک', 9.5, 1),
      playerRow('b', 'ب', 't-دو', 'دو', 7.2, 5),
    ];
    const { processedStats } = computeDynamicAppletStats([], teams, players, {}, {});
    const ratings = processedStats['pro-league'].ratings;
    expect(ratings).toHaveLength(1);
    expect(ratings[0].id).toBe('b');
    expect(ratings.some((r: any) => r.id === 'c')).toBe(false);
  });

  it('returns an empty fallback list when nobody reaches 5 rated games', () => {
    const players = [playerRow('c', 'ج', 't-یک', 'یک', 9.5, 1)];
    const { processedStats } = computeDynamicAppletStats([], teams, players, {}, {});
    expect(processedStats['pro-league'].ratings).toHaveLength(0);
  });

  it('keeps server ratings even when scorers/assists/cleansheets are empty', () => {
    const persistedStats = {
      'pro-league': {
        scorers: [],
        assists: [],
        cleansheets: [],
        ratings: [{ rank: 1, id: 'b', name: 'ب', team: 'دو', rating: 7.2, matches: 6 }],
      },
    };
    const players = [
      playerRow('a', 'الف', 't-یک', 'یک', 8.5, 3),
      playerRow('b', 'ب', 't-دو', 'دو', 7.2, 6),
    ];
    const { processedStats } = computeDynamicAppletStats([], teams, players, {}, persistedStats);
    const ratings = processedStats['pro-league'].ratings;
    expect(ratings).toHaveLength(1);
    expect(ratings[0].id).toBe('b');
    expect(ratings[0].matches).toBe(6);
  });
});

describe('formatJalaliDate', () => {
  it('converts the real live movement date 2026-09-23 to 1405/07/01', () => {
    expect(formatJalaliDate('2026-09-23')).toBe('1405/07/01');
  });

  it('strips ISO timestamps before converting', () => {
    expect(formatJalaliDate('2026-09-23T10:00:00.000Z')).toBe('1405/07/01');
  });

  it('falls back to the raw string for empty or non-date input', () => {
    expect(formatJalaliDate('')).toBe('');
    expect(formatJalaliDate(null)).toBe('');
    expect(formatJalaliDate(undefined)).toBe('');
    expect(formatJalaliDate('آینده')).toBe('آینده');
    expect(formatJalaliDate('1405/07/01')).toBe('1405/07/01');
  });
});
