// useKaiLiveQuotes — fetch current price + change for a batch of tickers.
// Hits /api/kai/quotes (EODHD batch). Re-runs whenever the symbol set
// changes; refreshes every 30s while market is open.
import { useEffect, useRef, useState } from "react";

export interface KaiLiveQuote {
  symbol: string;
  price: number;
  change_pct: number;
  prev_close: number;
  volume: number;
  ts: number;
}

interface Args {
  symbols: string[];
  /** Refresh interval in ms while page is open. 0 = no auto-refresh. */
  refreshMs?: number;
}

export function useKaiLiveQuotes({ symbols, refreshMs = 30_000 }: Args): {
  quotesByTicker: Map<string, KaiLiveQuote>;
  loading: boolean;
  error: string | null;
} {
  const [quotesByTicker, setQuotes] = useState<Map<string, KaiLiveQuote>>(
    () => new Map(),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Stable join key — avoids re-fetch when array order changes but contents don't
  const key = useRef("");
  const dedupedKey = [...new Set(symbols.map((s) => s.toUpperCase()))].sort().join(",");

  useEffect(() => {
    if (!dedupedKey) {
      setQuotes(new Map());
      return;
    }
    if (key.current === dedupedKey) return;
    key.current = dedupedKey;

    let cancelled = false;
    let intervalId: number | null = null;

    const fetchQuotes = async () => {
      try {
        setLoading(true);
        setError(null);
        const r = await fetch(`/api/kai/quotes?symbols=${dedupedKey}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = (await r.json()) as { quotes: KaiLiveQuote[] };
        if (cancelled) return;
        const next = new Map<string, KaiLiveQuote>();
        for (const q of json.quotes ?? []) {
          if (q.symbol) next.set(q.symbol, q);
        }
        setQuotes(next);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Quote fetch failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchQuotes();

    if (refreshMs > 0) {
      intervalId = window.setInterval(fetchQuotes, refreshMs);
    }

    return () => {
      cancelled = true;
      if (intervalId != null) window.clearInterval(intervalId);
    };
  }, [dedupedKey, refreshMs]);

  return { quotesByTicker, loading, error };
}
