/**
 * WatchlistContext — Global watchlist state backed by localStorage.
 * Syncs to the Railway profile API when the user is authenticated.
 *
 * Usage:
 *   const { watchlist, toggleWatch, isWatched } = useWatchlist();
 */
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

const STORAGE_KEY = "cc_watchlist";

interface WatchlistContextValue {
  watchlist: string[];
  toggleWatch: (symbol: string) => void;
  isWatched: (symbol: string) => boolean;
  setWatchlist: (symbols: string[]) => void;
}

const WatchlistContext = createContext<WatchlistContextValue>({
  watchlist: [],
  toggleWatch: () => {},
  isWatched: () => false,
  setWatchlist: () => {},
});

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [watchlist, setWatchlistState] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed as string[];
      }
    } catch {}
    return [];
  });

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
    } catch {}
    // Optionally sync to Railway profile API
    import("@/lib/api").then(({ updateMyProfile }) => {
      updateMyProfile({ watchlist }).catch(() => {});
    }).catch(() => {});
  }, [watchlist]);

  const toggleWatch = useCallback((symbol: string) => {
    setWatchlistState(prev =>
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );
  }, []);

  const isWatched = useCallback((symbol: string) => watchlist.includes(symbol), [watchlist]);

  const setWatchlist = useCallback((symbols: string[]) => {
    setWatchlistState(symbols);
  }, []);

  return (
    <WatchlistContext.Provider value={{ watchlist, toggleWatch, isWatched, setWatchlist }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  return useContext(WatchlistContext);
}
