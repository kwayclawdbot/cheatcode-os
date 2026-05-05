// useKaiWatchlist — read user watchlist + add/remove with optimistic update.
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  addToWatchlist,
  fetchWatchlist,
  removeFromWatchlist,
} from "@/lib/kai/queries";
import type { KaiWatchlistRow } from "@/lib/kai/types";

export interface UseKaiWatchlist {
  watchlist: KaiWatchlistRow[];
  loading: boolean;
  error: string | null;
  add: (ticker: string, notes?: string) => Promise<void>;
  remove: (ticker: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useKaiWatchlist(): UseKaiWatchlist {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<KaiWatchlistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setWatchlist([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchWatchlist();
      setWatchlist(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load watchlist");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = useCallback(
    async (ticker: string, notes?: string) => {
      if (!user) return;
      const upper = ticker.toUpperCase();
      // Optimistic insert
      const optimistic: KaiWatchlistRow = {
        id: `optimistic-${upper}`,
        user_id: user.id,
        ticker: upper,
        added_at: new Date().toISOString(),
        notes: notes ?? null,
      };
      setWatchlist((prev) => [optimistic, ...prev.filter((r) => r.ticker !== upper)]);
      try {
        const real = await addToWatchlist(user.id, upper, notes);
        setWatchlist((prev) => prev.map((r) => (r.id === optimistic.id ? real : r)));
      } catch (e) {
        // Rollback
        setWatchlist((prev) => prev.filter((r) => r.id !== optimistic.id));
        throw e;
      }
    },
    [user],
  );

  const remove = useCallback(
    async (ticker: string) => {
      const upper = ticker.toUpperCase();
      const prev = watchlist;
      setWatchlist((curr) => curr.filter((r) => r.ticker !== upper));
      try {
        await removeFromWatchlist(upper);
      } catch (e) {
        setWatchlist(prev); // rollback
        throw e;
      }
    },
    [watchlist],
  );

  return { watchlist, loading, error, add, remove, refresh: load };
}
