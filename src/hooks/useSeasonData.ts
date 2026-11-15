import { useState, useEffect } from "react";

// Shared season-data hook for League/Stats surfaces (profile pages use the
// detail embeds instead — no extra round trip there). Module-level caches so
// switching tabs never refetches: seasons list once, each season's bulk rows
// (47 team rows + ~650 player rows) once.

let seasonsCache: any[] | null = null;
let seasonsInflight: Promise<any[]> | null = null;
const rowsCache = new Map<string, { teamRows: any[]; playerRows: any[] }>();
// Career view needs every season's player rows at once (one request, then
// cached). Fetched lazily: visitors who stay on the current season never pay
// for it.
let careerPlayerRowsCache: any[] | null = null;
let careerPlayerRowsInflight: Promise<any[]> | null = null;

export function fetchSeasonsList(): Promise<any[]> {
  if (seasonsCache) return Promise.resolve(seasonsCache);
  if (!seasonsInflight) {
    seasonsInflight = fetch("/api/seasons")
      .then((r) => r.json())
      .then((d) => {
        seasonsCache = Array.isArray(d.seasons) ? d.seasons : [];
        return seasonsCache as any[];
      })
      .catch(() => {
        seasonsCache = [];
        return [];
      })
      .finally(() => {
        seasonsInflight = null;
      });
  }
  return seasonsInflight;
}

export function useSeasons() {
  const [seasons, setSeasons] = useState<any[]>(seasonsCache || []);
  useEffect(() => {
    let alive = true;
    fetchSeasonsList().then((list) => {
      if (alive) setSeasons(list);
    });
    return () => {
      alive = false;
    };
  }, []);
  return seasons;
}

export function useSeasonData(seasonId: string | null | undefined) {
  const [data, setData] = useState<{ teamRows: any[]; playerRows: any[] }>({ teamRows: [], playerRows: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!seasonId || seasonId === "career") {
      setData({ teamRows: [], playerRows: [] });
      setLoading(false);
      return;
    }
    const cached = rowsCache.get(seasonId);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    Promise.all([
      fetch(`/api/team-season-stats?seasonId=${encodeURIComponent(seasonId)}`, { signal: ctrl.signal }).then((r) => r.json()),
      fetch(`/api/player-season-stats?seasonId=${encodeURIComponent(seasonId)}`, { signal: ctrl.signal }).then((r) => r.json()),
    ])
      .then(([t, p]) => {
        const entry = {
          teamRows: Array.isArray(t.rows) ? t.rows : [],
          playerRows: Array.isArray(p.rows) ? p.rows : [],
        };
        rowsCache.set(seasonId, entry);
        setData(entry);
      })
      .catch(() => {
        // aborted or offline; keep previous data
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => {
      ctrl.abort();
    };
  }, [seasonId]);

  return { ...data, loading };
}

/**
 * Every season's player-stat rows, used only by the "career" view of the
 * per-position boards. The request is made once and cached at module level;
 * the hook is inert unless `enabled` is true.
 */
export function useCareerPlayerRows(enabled: boolean) {
  const [rows, setRows] = useState<any[]>(careerPlayerRowsCache || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (careerPlayerRowsCache) {
      setRows(careerPlayerRowsCache);
      return;
    }
    let alive = true;
    setLoading(true);
    if (!careerPlayerRowsInflight) {
      careerPlayerRowsInflight = fetch("/api/player-season-stats")
        .then((r) => r.json())
        .then((d) => {
          const list: any[] = Array.isArray(d.rows) ? d.rows : [];
          careerPlayerRowsCache = list;
          return list;
        })
        .catch(() => {
          careerPlayerRowsCache = [];
          return [] as any[];
        })
        .finally(() => {
          careerPlayerRowsInflight = null;
        });
    }
    const inflight = careerPlayerRowsInflight;
    if (!inflight) {
      setLoading(false);
      return;
    }
    inflight.then((list) => {
      if (alive) {
        setRows(list);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [enabled]);

  return { rows, loading };
}
