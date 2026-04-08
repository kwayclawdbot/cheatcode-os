/**
 * AssetClassContext — Global multi-select asset class filter
 * Persists to localStorage and syncs to Railway user profile when authenticated.
 *
 * Usage:
 *   const { selected, toggle, isSelected, filterTickers } = useAssetClass();
 */
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type AssetClass = "stocks" | "futures" | "forex" | "crypto";

export const ASSET_CLASSES: { id: AssetClass; label: string; emoji: string; color: string }[] = [
  { id: "stocks",  label: "Stocks",  emoji: "📈", color: "#2E90FA" },
  { id: "futures", label: "Futures", emoji: "⚡", color: "#F79009" },
  { id: "forex",   label: "Forex",   emoji: "💱", color: "#7B2FBE" },
  { id: "crypto",  label: "Crypto",  emoji: "₿",  color: "#4DC820" },
];

// ─── Ticker classification ────────────────────────────────────────────────────

// Futures: slash-prefixed (TradingView style /ES) or exact CME/CBOT symbols
const FUTURES_PATTERNS = /^\/|^ES$|^NQ$|^YM$|^RTY$|^CL$|^GC$|^SI$|^NG$|^ZB$|^ZN$|^ZF$|^ZT$|^6E$|^6J$|^6B$|^MES$|^MNQ$|^MCL$|^MGC$|^VX$|^HG$|^ZC$|^ZS$|^ZW$|^LE$|^HE$/i;
// Forex: must be a 6-char currency pair (EURUSD) or slash-separated (EUR/USD) or DXY index
// NOT matching 3-letter stock tickers that start with currency codes (e.g. EUR≠EURONEXT stock)
const FOREX_PATTERNS   = /^[A-Z]{3}\/[A-Z]{3}$|^[A-Z]{6}$|^DXY$|^USDX$/i;
const CRYPTO_PATTERNS  = /^BTC$|^ETH$|^SOL$|^XRP$|^ADA$|^DOGE$|^AVAX$|^DOT$|^MATIC$|^LINK$|^UNI$|^LTC$|^BCH$|^ATOM$|^FIL$|^NEAR$|^ALGO$|^VET$|^ICP$|^HBAR$|^BNB$|^SHIB$|^TRX$|^TON$|^PEPE$/i;

export function classifyTicker(symbol: string): AssetClass {
  const s = symbol.toUpperCase().replace(/^[$]/, "");
  if (FUTURES_PATTERNS.test(s)) return "futures";
  if (FOREX_PATTERNS.test(s))   return "forex";
  if (CRYPTO_PATTERNS.test(s))  return "crypto";
  return "stocks";
}

export function tickerMatchesFilter(symbol: string, selected: AssetClass[]): boolean {
  if (selected.length === 0) return true; // "All" — no filter
  return selected.includes(classifyTicker(symbol));
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AssetClassContextValue {
  selected: AssetClass[];
  /** Single-select: switches to this class exclusively; clicking the active class returns to All */
  toggle: (ac: AssetClass) => void;
  selectAll: () => void;
  isSelected: (ac: AssetClass) => boolean;
  isAll: boolean;
  filterTickers: (symbols: string[]) => string[];
  matchesTicker: (symbol: string) => boolean;
}

const AssetClassContext = createContext<AssetClassContextValue>({
  selected: [],
  toggle: () => {},
  selectAll: () => {},
  isSelected: () => true,
  isAll: true,
  filterTickers: (s) => s,
  matchesTicker: () => true,
});

const STORAGE_KEY = "cc_asset_class_filter";

export function AssetClassProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<AssetClass[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed as AssetClass[];
      }
    } catch {}
    return []; // default = "All"
  });

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
    } catch {}
  }, [selected]);

  // Single-select radio: clicking the active class returns to All; clicking another switches to it
  const toggle = useCallback((ac: AssetClass) => {
    setSelected(prev => {
      // If this class is the only one selected, clicking it again → All Markets
      if (prev.length === 1 && prev[0] === ac) return [];
      // Otherwise switch exclusively to this class
      return [ac];
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected([]);
  }, []);

  const isSelected = useCallback((ac: AssetClass) => selected.includes(ac), [selected]);
  const isAll = selected.length === 0;

  const filterTickers = useCallback((symbols: string[]) => {
    if (isAll) return symbols;
    return symbols.filter(s => selected.includes(classifyTicker(s)));
  }, [selected, isAll]);

  const matchesTicker = useCallback((symbol: string) => {
    return tickerMatchesFilter(symbol, selected);
  }, [selected]);

  return (
    <AssetClassContext.Provider value={{ selected, toggle, selectAll, isSelected, isAll, filterTickers, matchesTicker }}>
      {children}
    </AssetClassContext.Provider>
  );
}

export function useAssetClass() {
  return useContext(AssetClassContext);
}
