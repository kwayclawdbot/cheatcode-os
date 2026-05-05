// useKaiSystemUniverse — Today's curated picks from the SMS/trigger engine.
// Reads vault_store at Kai/Watchlist/{date}-swing.json. Phase 2 of the
// Module plan refactors this to read a new public.scan_universe table.
import { useEffect, useState } from "react";
import { fetchSystemUniverse } from "@/lib/kai/queries";
import type { KaiSystemPick, KaiWatchlistMeta } from "@/lib/kai/types";

export interface UseKaiSystemUniverse {
  picks: KaiSystemPick[];
  top10: KaiSystemPick[];
  rest: KaiSystemPick[];
  meta: KaiWatchlistMeta | null;
  /** Tickers that were in yesterday's Top 10 — used for PROMOTED/DEMOTED chips */
  prevTopTickers: Set<string>;
  prevDate: string | null;
  loading: boolean;
  error: string | null;
}

export function useKaiSystemUniverse(): UseKaiSystemUniverse {
  const [picks, setPicks] = useState<KaiSystemPick[]>([]);
  const [meta, setMeta] = useState<KaiWatchlistMeta | null>(null);
  const [prevTopTickers, setPrevTopTickers] = useState<Set<string>>(new Set());
  const [prevDate, setPrevDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSystemUniverse()
      .then((res) => {
        if (cancelled) return;
        const sorted = [...res.picks].sort((a, b) => {
          if (a.rank && b.rank) return a.rank - b.rank;
          return b.score - a.score;
        });
        sorted.forEach((p, i) => {
          if (!p.rank) p.rank = i + 1;
        });
        setPicks(sorted);
        setMeta(res.meta);
        setPrevTopTickers(res.prevTopTickers);
        setPrevDate(res.prevDate);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    picks,
    top10: picks.slice(0, 10),
    rest: picks.slice(10, 30),
    meta,
    prevTopTickers,
    prevDate,
    loading,
    error,
  };
}
