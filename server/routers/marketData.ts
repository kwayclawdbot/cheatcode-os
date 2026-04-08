/**
 * Market Data Router — live quotes via EODHD API
 *
 * Endpoints:
 * - quotes(symbols)  → batch real-time quotes for up to 50 symbols
 * - quote(symbol)    → single real-time quote
 * - search(query)    → symbol search
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";

const EODHD_BASE = "https://eodhd.com/api";

// ─── EODHD symbol normalisation ──────────────────────────────────────────────
// EODHD requires exchange suffix: AAPL.US, BTC-USD.CC, EURUSD.FOREX
function normaliseSymbol(raw: string): string {
  const s = raw.toUpperCase().trim();
  // Already has exchange suffix
  if (s.includes(".")) return s;
  // Crypto pairs (common patterns)
  if (/^(BTC|ETH|SOL|BNB|XRP|ADA|AVAX|DOGE|MATIC|DOT|LINK|UNI|AAVE|LTC|BCH|ATOM|FIL|NEAR|APT|ARB|OP|SUI|SEI|TIA|INJ|PEPE|WIF|BONK|JUP|PYTH|W|STRK|MANTA|ALT|DYM|PIXEL|PORTAL|MYRO|BOME|SLERF|WEN|TNSR|SAGA|ZETA|OMNI|REZ|BB|NOT|IO|ZK|LISTA|ZRO|BLAST|MOCA|LDO|RPL|FXS|CRV|CVX|BAL|SUSHI|COMP|MKR|SNX|YFI|1INCH|DYDX|GMX|GNS|PERP|RDNT|VELA|GAINS|HMX|LEVEL|KWENTA|VERTEX|LYRA|PREMIA|HEGIC|DOPEX|JONES|MAGIC|TREASURE|TRB|BAND|API3|PYTH|UMA|BADGER|ALPHA|CREAM|PICKLE|RARI|IDLE|RULER|COVER|ARMOR|NEXUS|OPYN|RIBBON|FRIKTION|KATANA|ZETA|DRIFT|MANGO|SERUM|RAYDIUM|ORCA|SABER|MERCURIAL|QUARRY|SUNNY|TULIP|PORT|SOLEND|LARIX|FRANCIUM|HUBBLE|CASHIO|PARROT|COPE|STEP|MEDIA|GRAPE|SAMO|CHEEMS|SAMU|NYAN|WOOF|FLOKI|SHIB|ELON|SAFEMOON|KISHU|AKITA|HOGE|VOLT|ELONGATE|SAFEMARS|MOONSHOT|ELONGD|MOONPIRATE|MOONSTAR|MOONTOKEN|MOONWALK|MOONWATCHER|MOONX|MOONY|MOONZ|MOOSE|MOPS|MORA|MORB|MORC|MORD|MORE|MORF|MORG|MORH|MORI|MORJ|MORK|MORL|MORM|MORN|MORO|MORP|MORQ|MORR|MORS|MORT|MORU|MORV|MORW|MORX|MORY|MORZ)$/.test(s)) {
    return `${s}-USD.CC`;
  }
  // Forex pairs (6 chars, all alpha)
  if (/^[A-Z]{6}$/.test(s)) return `${s}.FOREX`;
  // Default to US stocks
  return `${s}.US`;
}

// ─── Fetch single quote ───────────────────────────────────────────────────────
async function fetchEohdQuote(symbol: string) {
  const normSym = normaliseSymbol(symbol);
  const url = `${EODHD_BASE}/real-time/${normSym}?api_token=${ENV.eohdApiKey}&fmt=json`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`EODHD error ${resp.status} for ${symbol}`);
  const data = await resp.json();
  return {
    symbol: symbol.toUpperCase(),
    eohdSymbol: normSym,
    price: data.close ?? data.previousClose ?? 0,
    change: data.change ?? 0,
    changePercent: data.change_p ?? 0,
    open: data.open ?? 0,
    high: data.high ?? 0,
    low: data.low ?? 0,
    volume: data.volume ?? 0,
    previousClose: data.previousClose ?? 0,
    timestamp: data.timestamp ?? Math.floor(Date.now() / 1000),
    marketCap: data.marketCapitalization ?? null,
  };
}

// ─── Fetch batch quotes ───────────────────────────────────────────────────────
async function fetchEohdBatch(symbols: string[]) {
  const normSymbols = symbols.map(normaliseSymbol);
  const url = `${EODHD_BASE}/real-time/${normSymbols[0]}?api_token=${ENV.eohdApiKey}&fmt=json&s=${normSymbols.slice(1).join(",")}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`EODHD batch error ${resp.status}`);
  const raw = await resp.json();
  // EODHD returns array for batch, single object for single
  const items = Array.isArray(raw) ? raw : [raw];
  return items.map((data: any, i: number) => ({
    symbol: symbols[i]?.toUpperCase() ?? data.code?.split(".")[0] ?? "",
    eohdSymbol: normSymbols[i] ?? data.code ?? "",
    price: data.close ?? data.previousClose ?? 0,
    change: data.change ?? 0,
    changePercent: data.change_p ?? 0,
    open: data.open ?? 0,
    high: data.high ?? 0,
    low: data.low ?? 0,
    volume: data.volume ?? 0,
    previousClose: data.previousClose ?? 0,
    timestamp: data.timestamp ?? Math.floor(Date.now() / 1000),
    marketCap: data.marketCapitalization ?? null,
  }));
}

// ─── Curated symbol lists per asset class ───────────────────────────────────
const FOREX_SYMBOLS = [
  { symbol: "EURUSD", eohdSymbol: "EURUSD.FOREX", label: "EUR/USD" },
  { symbol: "GBPUSD", eohdSymbol: "GBPUSD.FOREX", label: "GBP/USD" },
  { symbol: "USDJPY", eohdSymbol: "USDJPY.FOREX", label: "USD/JPY" },
  { symbol: "AUDUSD", eohdSymbol: "AUDUSD.FOREX", label: "AUD/USD" },
  { symbol: "USDCAD", eohdSymbol: "USDCAD.FOREX", label: "USD/CAD" },
  { symbol: "USDCHF", eohdSymbol: "USDCHF.FOREX", label: "USD/CHF" },
  { symbol: "NZDUSD", eohdSymbol: "NZDUSD.FOREX", label: "NZD/USD" },
  { symbol: "EURGBP", eohdSymbol: "EURGBP.FOREX", label: "EUR/GBP" },
];

const CRYPTO_SYMBOLS = [
  { symbol: "BTC", eohdSymbol: "BTC-USD.CC", label: "Bitcoin" },
  { symbol: "ETH", eohdSymbol: "ETH-USD.CC", label: "Ethereum" },
  { symbol: "SOL", eohdSymbol: "SOL-USD.CC", label: "Solana" },
  { symbol: "BNB", eohdSymbol: "BNB-USD.CC", label: "BNB" },
  { symbol: "XRP", eohdSymbol: "XRP-USD.CC", label: "XRP" },
  { symbol: "DOGE", eohdSymbol: "DOGE-USD.CC", label: "Dogecoin" },
  { symbol: "ADA", eohdSymbol: "ADA-USD.CC", label: "Cardano" },
  { symbol: "AVAX", eohdSymbol: "AVAX-USD.CC", label: "Avalanche" },
];

// Futures tab uses major index instruments (continuous futures not available on this EODHD plan)
const INDICES_SYMBOLS = [
  { symbol: "SPX", eohdSymbol: "GSPC.INDX", label: "S&P 500" },
  { symbol: "NDX", eohdSymbol: "NDX.INDX", label: "Nasdaq 100" },
  { symbol: "DJI", eohdSymbol: "DJI.INDX", label: "Dow Jones" },
  { symbol: "RUT", eohdSymbol: "RUT.INDX", label: "Russell 2000" },
  { symbol: "VIX", eohdSymbol: "VIX.INDX", label: "VIX" },
  { symbol: "DAX", eohdSymbol: "GDAXI.INDX", label: "DAX" },
  { symbol: "FTSE", eohdSymbol: "FTSE.INDX", label: "FTSE 100" },
  { symbol: "N225", eohdSymbol: "N225.INDX", label: "Nikkei 225" },
];

async function fetchCuratedBatch(items: { symbol: string; eohdSymbol: string; label: string }[]) {
  const normSymbols = items.map(i => i.eohdSymbol);
  const url = `${EODHD_BASE}/real-time/${normSymbols[0]}?api_token=${ENV.eohdApiKey}&fmt=json&s=${normSymbols.slice(1).join(",")}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`EODHD curated batch error ${resp.status}`);
  const raw = await resp.json();
  const dataArr = Array.isArray(raw) ? raw : [raw];
  return dataArr.map((data: any, i: number) => ({
    symbol: items[i]?.symbol ?? data.code?.split(".")[0] ?? "",
    label: items[i]?.label ?? items[i]?.symbol ?? "",
    eohdSymbol: items[i]?.eohdSymbol ?? data.code ?? "",
    price: parseFloat(data.close ?? data.previousClose ?? 0) || 0,
    change: parseFloat(data.change ?? 0) || 0,
    change_pct: parseFloat(data.change_p ?? 0) || 0,
    open: parseFloat(data.open ?? 0) || 0,
    high: parseFloat(data.high ?? 0) || 0,
    low: parseFloat(data.low ?? 0) || 0,
    volume: parseFloat(data.volume ?? 0) || 0,
    previousClose: parseFloat(data.previousClose ?? 0) || 0,
    timestamp: data.timestamp ?? Math.floor(Date.now() / 1000),
  }));
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const marketDataRouter = router({
  /**
   * Batch real-time quotes — up to 50 symbols
   * Used by Terminal watchlist and home ticker rail
   */
  quotes: publicProcedure
    .input(z.object({ symbols: z.array(z.string().max(20)).max(50) }))
    .query(async ({ input }) => {
      if (!input.symbols.length) return [];
      if (!ENV.eohdApiKey) {
        throw new Error("EODHD_API_KEY not configured");
      }
      try {
        return await fetchEohdBatch(input.symbols);
      } catch (err) {
        console.error("[marketData.quotes]", err);
        throw err;
      }
    }),

  /**
   * Single real-time quote
   */
  quote: publicProcedure
    .input(z.object({ symbol: z.string().max(20) }))
    .query(async ({ input }) => {
      if (!ENV.eohdApiKey) throw new Error("EODHD_API_KEY not configured");
      return fetchEohdQuote(input.symbol);
    }),

  /**
   * Live Forex quotes — 8 major pairs
   */
  forexQuotes: publicProcedure
    .query(async () => {
      if (!ENV.eohdApiKey) throw new Error("EODHD_API_KEY not configured");
      try {
        return await fetchCuratedBatch(FOREX_SYMBOLS);
      } catch (err) {
        console.error("[marketData.forexQuotes]", err);
        throw err;
      }
    }),

  /**
   * Live Crypto quotes — top 8 by market cap
   */
  cryptoQuotes: publicProcedure
    .query(async () => {
      if (!ENV.eohdApiKey) throw new Error("EODHD_API_KEY not configured");
      try {
        return await fetchCuratedBatch(CRYPTO_SYMBOLS);
      } catch (err) {
        console.error("[marketData.cryptoQuotes]", err);
        throw err;
      }
    }),

  /**
   * Live Index/Futures quotes — major global indices
   * (EODHD plan does not support continuous futures contracts;
   *  indices are the closest proxy for the Futures filter)
   */
  indicesQuotes: publicProcedure
    .query(async () => {
      if (!ENV.eohdApiKey) throw new Error("EODHD_API_KEY not configured");
      try {
        return await fetchCuratedBatch(INDICES_SYMBOLS);
      } catch (err) {
        console.error("[marketData.indicesQuotes]", err);
        throw err;
      }
    }),

  /**
   * Symbol search — for watchlist add input
   */
  search: publicProcedure
    .input(z.object({ query: z.string().min(1).max(20) }))
    .query(async ({ input }) => {
      if (!ENV.eohdApiKey) return [];
      const url = `${EODHD_BASE}/search/${encodeURIComponent(input.query)}?api_token=${ENV.eohdApiKey}&limit=10&type=stock,etf,crypto`;
      const resp = await fetch(url);
      if (!resp.ok) return [];
      const data = await resp.json();
      return (Array.isArray(data) ? data : []).map((item: any) => ({
        symbol: item.Code ?? "",
        name: item.Name ?? "",
        exchange: item.Exchange ?? "",
        type: item.Type ?? "stock",
        isin: item.ISIN ?? null,
      }));
    }),
});
