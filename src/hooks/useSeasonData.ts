import { useState, useEffect } from "react";

// Shared season-data hook for League/Stats surfaces (profile pages use the
// detail embeds instead — no extra round trip there). Module-level caches so
// switching tabs never refetches: seasons list once, each season's bulk rows
// (47 team rows + ~650 player rows) once.

let seasonsCache: any[] | null = null;
let seasonsInflight: Promise<any[]> | null = null;
const rowsCache = new Map<string, { teamRows: any[]; playerRows: any[] }>();

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
