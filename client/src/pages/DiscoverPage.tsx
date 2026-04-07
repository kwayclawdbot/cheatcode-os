// DiscoverPage — Ticker discovery hub
// Design: Robinhood/Spotify hybrid — clean rows, sparklines, score badges
// Layout: Full-width header, two-column bullish/bearish lists, watchlist sidebar
// Data: Live Kai Radar API + Yahoo Finance sparkline
import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useAssetClass } from "@/contexts/AssetClassContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Star, StarOff, Search, Filter,
  ArrowUpRight, ArrowDownRight, Minus, Zap, BarChart2, Eye,
  ChevronRight, RefreshCw,
} from "lucide-react";
import { Nav } from "@/components/layout/Nav";
import { SparklineChart } from "@/components/intelligence/SparklineChart";
import { TickerLogo } from "@/components/intelligence/TickerLogo";
import { fetchRadar } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type AssetClass = "all" | "stocks" | "forex" | "futures" | "crypto";
type SortBy = "score" | "change" | "mentions";

interface TickerRow {
  symbol: string;
  name: string;
  score: number;
  direction: "bullish" | "bearish" | "neutral";
  price: number;
  change_pct: number;
  mentions: number;
  assetClass: AssetClass;
  theme?: string;
}

// ─── Static ticker universe (augmented with live radar data) ─────────────────

const TICKER_UNIVERSE: TickerRow[] = [
  // Stocks
  { symbol: "NVDA", name: "NVIDIA Corp", score: 78, direction: "bullish", price: 118.45, change_pct: 2.34, mentions: 847, assetClass: "stocks", theme: "AI Infrastructure" },
  { symbol: "PLTR", name: "Palantir Technologies", score: 72, direction: "bullish", price: 24.18, change_pct: 1.87, mentions: 612, assetClass: "stocks", theme: "AI Infrastructure" },
  { symbol: "AAPL", name: "Apple Inc", score: 63, direction: "bullish", price: 172.80, change_pct: 0.94, mentions: 534, assetClass: "stocks", theme: "Big Tech" },
  { symbol: "AMZN", name: "Amazon.com", score: 61, direction: "bullish", price: 186.20, change_pct: 1.22, mentions: 489, assetClass: "stocks", theme: "Big Tech" },
  { symbol: "MSFT", name: "Microsoft Corp", score: 60, direction: "bullish", price: 384.50, change_pct: 0.67, mentions: 421, assetClass: "stocks", theme: "Big Tech" },
  { symbol: "META", name: "Meta Platforms", score: 58, direction: "bullish", price: 498.30, change_pct: 1.44, mentions: 398, assetClass: "stocks", theme: "Big Tech" },
  { symbol: "GLD", name: "SPDR Gold ETF", score: 68, direction: "bullish", price: 218.40, change_pct: 0.76, mentions: 312, assetClass: "stocks", theme: "Nuclear Renaissance" },
  { symbol: "CEG", name: "Constellation Energy", score: 65, direction: "bullish", price: 212.10, change_pct: 1.88, mentions: 287, assetClass: "stocks", theme: "Nuclear Renaissance" },
  { symbol: "TSLA", name: "Tesla Inc", score: 52, direction: "neutral", price: 248.50, change_pct: -0.43, mentions: 923, assetClass: "stocks", theme: "EV" },
  { symbol: "QQQ", name: "Invesco QQQ ETF", score: 48, direction: "neutral", price: 436.20, change_pct: -0.31, mentions: 445, assetClass: "stocks" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF", score: 45, direction: "bearish", price: 512.30, change_pct: -1.12, mentions: 1024, assetClass: "stocks", theme: "Tariff Impact" },
  { symbol: "SOXL", name: "Direxion Semi Bull 3X", score: 38, direction: "bearish", price: 18.42, change_pct: -3.21, mentions: 234, assetClass: "stocks", theme: "Tariff Impact" },
  { symbol: "AVGO", name: "Broadcom Inc", score: 67, direction: "bullish", price: 182.40, change_pct: 1.55, mentions: 267, assetClass: "stocks", theme: "AI Infrastructure" },
  { symbol: "AMD", name: "Advanced Micro Devices", score: 67, direction: "bullish", price: 152.30, change_pct: 1.23, mentions: 356, assetClass: "stocks", theme: "AI Infrastructure" },
  { symbol: "NFLX", name: "Netflix Inc", score: 68, direction: "bullish", price: 624.80, change_pct: 2.11, mentions: 312, assetClass: "stocks" },
  { symbol: "COIN", name: "Coinbase Global", score: 62, direction: "bullish", price: 218.40, change_pct: 2.88, mentions: 445, assetClass: "stocks", theme: "Crypto" },
  { symbol: "MSTR", name: "MicroStrategy", score: 64, direction: "bullish", price: 342.10, change_pct: 3.44, mentions: 389, assetClass: "stocks", theme: "Crypto" },
  { symbol: "RIOT", name: "Riot Platforms", score: 55, direction: "neutral", price: 12.90, change_pct: 0.31, mentions: 198, assetClass: "stocks", theme: "Crypto" },
  { symbol: "IWM", name: "iShares Russell 2000", score: 42, direction: "bearish", price: 198.40, change_pct: -1.44, mentions: 287, assetClass: "stocks" },
  { symbol: "TLT", name: "iShares 20Y Treasury", score: 44, direction: "bearish", price: 88.20, change_pct: -0.88, mentions: 234, assetClass: "stocks" },
  // Crypto
  { symbol: "BTC", name: "Bitcoin", score: 70, direction: "bullish", price: 83200, change_pct: 1.55, mentions: 1847, assetClass: "crypto" },
  { symbol: "ETH", name: "Ethereum", score: 65, direction: "bullish", price: 3180, change_pct: 2.10, mentions: 1234, assetClass: "crypto" },
  { symbol: "SOL", name: "Solana", score: 72, direction: "bullish", price: 148.20, change_pct: 3.44, mentions: 892, assetClass: "crypto" },
  { symbol: "XRP", name: "Ripple", score: 55, direction: "neutral", price: 0.5820, change_pct: 0.44, mentions: 678, assetClass: "crypto" },
  { symbol: "DOGE", name: "Dogecoin", score: 38, direction: "bearish", price: 0.1421, change_pct: -2.88, mentions: 934, assetClass: "crypto" },
  { symbol: "AVAX", name: "Avalanche", score: 60, direction: "bullish", price: 38.40, change_pct: 1.88, mentions: 312, assetClass: "crypto" },
  { symbol: "LINK", name: "Chainlink", score: 58, direction: "bullish", price: 14.20, change_pct: 1.44, mentions: 287, assetClass: "crypto" },
  { symbol: "ADA", name: "Cardano", score: 45, direction: "neutral", price: 0.4820, change_pct: -0.31, mentions: 445, assetClass: "crypto" },
  // Forex
  { symbol: "EURUSD", name: "Euro / US Dollar", score: 55, direction: "neutral", price: 1.0842, change_pct: 0.12, mentions: 234, assetClass: "forex" },
  { symbol: "GBPUSD", name: "British Pound / USD", score: 48, direction: "bearish", price: 1.2634, change_pct: -0.34, mentions: 198, assetClass: "forex" },
  { symbol: "USDJPY", name: "USD / Japanese Yen", score: 62, direction: "bullish", price: 151.42, change_pct: 0.28, mentions: 312, assetClass: "forex" },
  { symbol: "AUDUSD", name: "Australian Dollar / USD", score: 44, direction: "bearish", price: 0.6521, change_pct: -0.51, mentions: 156, assetClass: "forex" },
  { symbol: "USDCAD", name: "USD / Canadian Dollar", score: 58, direction: "bullish", price: 1.3612, change_pct: 0.19, mentions: 178, assetClass: "forex" },
  { symbol: "USDCHF", name: "USD / Swiss Franc", score: 52, direction: "neutral", price: 0.9012, change_pct: -0.08, mentions: 134, assetClass: "forex" },
  // Futures
  { symbol: "ES", name: "E-mini S&P 500", score: 40, direction: "bearish", price: 5180, change_pct: -0.88, mentions: 445, assetClass: "futures" },
  { symbol: "NQ", name: "E-mini Nasdaq 100", score: 45, direction: "bearish", price: 17840, change_pct: -1.04, mentions: 389, assetClass: "futures" },
  { symbol: "CL", name: "Crude Oil WTI", score: 65, direction: "bullish", price: 78.42, change_pct: 1.33, mentions: 312, assetClass: "futures" },
  { symbol: "GC", name: "Gold Futures", score: 68, direction: "bullish", price: 2342.10, change_pct: 0.82, mentions: 287, assetClass: "futures" },
  { symbol: "ZB", name: "30-Year T-Bond", score: 52, direction: "neutral", price: 118.20, change_pct: -0.14, mentions: 198, assetClass: "futures" },
  { symbol: "SI", name: "Silver Futures", score: 62, direction: "bullish", price: 27.84, change_pct: 0.94, mentions: 178, assetClass: "futures" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(4)}`;
}

function directionColor(direction: string) {
  if (direction === "bullish") return "#4DC820";
  if (direction === "bearish") return "#E8193C";
  return "#F79009";
}

// ─── Ticker Row Component ─────────────────────────────────────────────────────

function TickerListRow({
  ticker,
  rank,
  isWatched,
  onToggleWatch,
  onClick,
}: {
  ticker: TickerRow;
  rank: number;
  isWatched: boolean;
  onToggleWatch: (symbol: string) => void;
  onClick: (symbol: string) => void;
}) {
  const color = directionColor(ticker.direction);
  const isUp = ticker.change_pct >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.02 }}
      className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/40 transition-colors group cursor-pointer"
      onClick={() => onClick(ticker.symbol)}
    >
      {/* Rank */}
      <span className="text-[11px] font-black text-muted-foreground w-5 text-right flex-shrink-0">
        {rank}
      </span>
      {/* Logo */}
      <TickerLogo symbol={ticker.symbol} size={30} className="flex-shrink-0" />
      {/* Symbol + name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-black tracking-tight" style={{ color: "var(--foreground)" }}>
            {ticker.symbol}
          </span>
          {ticker.theme && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full hidden md:inline-block"
              style={{ background: color + "15", color }}>
              {ticker.theme}
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground truncate">{ticker.name}</p>
      </div>

      {/* Sparkline */}
      <div className="w-14 flex-shrink-0">
        <SparklineChart symbol={ticker.symbol} color={color} height={32} width={56} price={ticker.price} changePct={ticker.change_pct} />
      </div>

      {/* Score badge */}
      <div className="flex-shrink-0 text-center w-10">
        <div className="text-[13px] font-black" style={{ color }}>{ticker.score}</div>
        <div className="text-[8px] font-bold text-muted-foreground uppercase">score</div>
      </div>

      {/* Price + change */}
      <div className="flex-shrink-0 text-right w-20">
        <div className="text-[12px] font-bold" style={{ color: "var(--foreground)" }}>
          {formatPrice(ticker.price)}
        </div>
        <div className="flex items-center justify-end gap-0.5">
          {isUp ? <ArrowUpRight size={10} color="#4DC820" /> : <ArrowDownRight size={10} color="#E8193C" />}
          <span className="text-[10px] font-bold" style={{ color: isUp ? "#4DC820" : "#E8193C" }}>
            {Math.abs(ticker.change_pct).toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Mentions */}
      <div className="flex-shrink-0 text-center w-12 hidden lg:block">
        <div className="text-[11px] font-bold text-muted-foreground">{ticker.mentions}</div>
        <div className="text-[8px] font-bold text-muted-foreground uppercase">posts</div>
      </div>

      {/* Watch button */}
      <button
        onClick={e => { e.stopPropagation(); onToggleWatch(ticker.symbol); }}
        className="flex-shrink-0 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
        style={{ color: isWatched ? "#F79009" : "var(--muted-foreground)" }}
      >
        {isWatched ? <Star size={14} fill="currentColor" /> : <StarOff size={14} />}
      </button>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const { selected: globalSelected, isAll: globalIsAll, toggle: toggleAssetClass, selectAll: selectAllAssets } = useAssetClass();
  // Map global multi-select to local single AssetClass for backward compat
  const activeAsset: AssetClass = globalIsAll ? "all" : (globalSelected[0] as AssetClass) ?? "all";
  const setActiveAsset = (id: AssetClass) => {
    if (id === "all") selectAllAssets();
    else toggleAssetClass(id as any);
  };
  const [sortBy, setSortBy] = useState<SortBy>("score");
  const [searchQuery, setSearchQuery] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("cc_watchlist") || "[]"); } catch { return []; }
  });
  const [radarTickers, setRadarTickers] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<"lists" | "watchlist">("lists");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRadar().then(r => {
      const all = [...(r.critical || []), ...(r.high_conviction || []), ...(r.watch || [])];
      setRadarTickers(all);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  // Merge live radar data into the universe
  const mergedTickers = TICKER_UNIVERSE.map(t => {
    const live = radarTickers.find(r => r.symbol === t.symbol);
    return live ? { ...t, score: live.convergence_score ?? t.score, direction: live.direction ?? t.direction } : t;
  });

  // Filter by asset class + search
  const filtered = mergedTickers.filter(t => {
    if (activeAsset !== "all" && t.assetClass !== activeAsset) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q);
    }
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "score") return b.score - a.score;
    if (sortBy === "change") return Math.abs(b.change_pct) - Math.abs(a.change_pct);
    return b.mentions - a.mentions;
  });

  // Split into bullish and bearish top 20
  const top20Bullish = sorted.filter(t => t.direction === "bullish").slice(0, 20);
  const top20Bearish = sorted.filter(t => t.direction === "bearish").slice(0, 20);
  const watchlistTickers = sorted.filter(t => watchlist.includes(t.symbol));

  const toggleWatch = (symbol: string) => {
    setWatchlist(prev => {
      const next = prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol];
      localStorage.setItem("cc_watchlist", JSON.stringify(next));
      return next;
    });
  };

  const handleTickerClick = (symbol: string) => {
    window.location.href = `/community?ticker=${symbol}`;
  };

  const ASSET_TABS: { id: AssetClass; label: string }[] = [
    { id: "all", label: "All" },
    { id: "stocks", label: "Stocks" },
    { id: "crypto", label: "Crypto" },
    { id: "forex", label: "Forex" },
    { id: "futures", label: "Futures" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* ── Page Header ── */}
      <div className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
                Discover
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Top tickers by Kai signal score — updated daily
              </p>
            </div>
            {/* Controls row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Asset class tabs */}
              <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
                {ASSET_TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveAsset(tab.id)}
                    className="px-2.5 py-1.5 text-[11px] font-bold rounded-md transition-all"
                    style={{
                      background: activeAsset === tab.id ? "#4DC820" : "transparent",
                      color: activeAsset === tab.id ? "#101828" : "var(--muted-foreground)",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {/* Sort */}
              <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
                {(["score", "change", "mentions"] as SortBy[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setSortBy(s)}
                    className="px-2.5 py-1.5 text-[11px] font-bold rounded-md transition-all capitalize"
                    style={{
                      background: sortBy === s ? "var(--card)" : "transparent",
                      color: sortBy === s ? "var(--foreground)" : "var(--muted-foreground)",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {/* Search */}
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value.toUpperCase())}
                  placeholder="Search ticker..."
                  className="pl-7 pr-3 py-1.5 text-xs bg-muted border border-border rounded-lg focus:outline-none focus:border-[#4DC820] transition-colors w-32 text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 mt-4">
            <button
              onClick={() => setActiveView("lists")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all"
              style={{
                background: activeView === "lists" ? "rgba(77,200,32,0.12)" : "transparent",
                color: activeView === "lists" ? "#4DC820" : "var(--muted-foreground)",
                border: activeView === "lists" ? "1px solid rgba(77,200,32,0.3)" : "1px solid transparent",
              }}
            >
              <BarChart2 size={11} /> Top Lists
            </button>
            <button
              onClick={() => setActiveView("watchlist")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all"
              style={{
                background: activeView === "watchlist" ? "rgba(247,144,9,0.12)" : "transparent",
                color: activeView === "watchlist" ? "#F79009" : "var(--muted-foreground)",
                border: activeView === "watchlist" ? "1px solid rgba(247,144,9,0.3)" : "1px solid transparent",
              }}
            >
              <Star size={11} /> Watchlist ({watchlist.length})
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <AnimatePresence mode="wait">
          {activeView === "watchlist" ? (
            <motion.div key="watchlist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {watchlistTickers.length === 0 ? (
                <div className="text-center py-20">
                  <Star size={40} className="mx-auto text-muted-foreground mb-4 opacity-30" />
                  <p className="text-muted-foreground font-bold">Your watchlist is empty</p>
                  <p className="text-sm text-muted-foreground mt-1">Hover over any ticker and click the star to add it</p>
                </div>
              ) : (
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                    <Star size={14} color="#F79009" fill="#F79009" />
                    <span className="text-sm font-black">My Watchlist</span>
                    <span className="text-xs text-muted-foreground">({watchlistTickers.length} tickers)</span>
                  </div>
                  {watchlistTickers.map((t, i) => (
                    <TickerListRow
                      key={t.symbol}
                      ticker={t}
                      rank={i + 1}
                      isWatched={true}
                      onToggleWatch={toggleWatch}
                      onClick={handleTickerClick}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="lists" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top 20 Bullish */}
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                  <div className="px-4 py-3.5 border-b border-border flex items-center justify-between"
                    style={{ background: "rgba(77,200,32,0.04)" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(77,200,32,0.15)" }}>
                        <TrendingUp size={14} color="#4DC820" />
                      </div>
                      <div>
                        <p className="text-sm font-black" style={{ color: "#4DC820" }}>Top Bullish</p>
                        <p className="text-[10px] text-muted-foreground">Highest Kai signal scores</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isLoading && <RefreshCw size={12} className="animate-spin text-muted-foreground" />}
                      <Link href="/community">
                        <button className="text-[10px] font-bold text-muted-foreground hover:text-[#4DC820] transition-colors flex items-center gap-0.5">
                          View feed <ChevronRight size={10} />
                        </button>
                      </Link>
                    </div>
                  </div>
                  {/* Column headers */}
                  <div className="flex items-center gap-3 px-4 py-2 border-b border-border">
                    <span className="w-5 text-[9px] font-bold text-muted-foreground uppercase text-right">#</span>
                    <span className="flex-1 text-[9px] font-bold text-muted-foreground uppercase">Ticker</span>
                    <span className="w-16 text-[9px] font-bold text-muted-foreground uppercase hidden sm:block">Chart</span>
                    <span className="w-10 text-[9px] font-bold text-muted-foreground uppercase text-center">Score</span>
                    <span className="w-20 text-[9px] font-bold text-muted-foreground uppercase text-right">Price</span>
                    <span className="w-12 text-[9px] font-bold text-muted-foreground uppercase text-center hidden lg:block">Posts</span>
                    <span className="w-8" />
                  </div>
                  {top20Bullish.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm">No bullish tickers found</div>
                  ) : (
                    top20Bullish.map((t, i) => (
                      <TickerListRow
                        key={t.symbol}
                        ticker={t}
                        rank={i + 1}
                        isWatched={watchlist.includes(t.symbol)}
                        onToggleWatch={toggleWatch}
                        onClick={handleTickerClick}
                      />
                    ))
                  )}
                </div>

                {/* Top 20 Bearish */}
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                  <div className="px-4 py-3.5 border-b border-border flex items-center justify-between"
                    style={{ background: "rgba(232,25,60,0.04)" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(232,25,60,0.15)" }}>
                        <TrendingDown size={14} color="#E8193C" />
                      </div>
                      <div>
                        <p className="text-sm font-black" style={{ color: "#E8193C" }}>Top Bearish</p>
                        <p className="text-[10px] text-muted-foreground">Lowest Kai signal scores</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isLoading && <RefreshCw size={12} className="animate-spin text-muted-foreground" />}
                      <Link href="/community">
                        <button className="text-[10px] font-bold text-muted-foreground hover:text-[#E8193C] transition-colors flex items-center gap-0.5">
                          View feed <ChevronRight size={10} />
                        </button>
                      </Link>
                    </div>
                  </div>
                  {/* Column headers */}
                  <div className="flex items-center gap-3 px-4 py-2 border-b border-border">
                    <span className="w-5 text-[9px] font-bold text-muted-foreground uppercase text-right">#</span>
                    <span className="flex-1 text-[9px] font-bold text-muted-foreground uppercase">Ticker</span>
                    <span className="w-16 text-[9px] font-bold text-muted-foreground uppercase hidden sm:block">Chart</span>
                    <span className="w-10 text-[9px] font-bold text-muted-foreground uppercase text-center">Score</span>
                    <span className="w-20 text-[9px] font-bold text-muted-foreground uppercase text-right">Price</span>
                    <span className="w-12 text-[9px] font-bold text-muted-foreground uppercase text-center hidden lg:block">Posts</span>
                    <span className="w-8" />
                  </div>
                  {top20Bearish.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm">No bearish tickers found</div>
                  ) : (
                    top20Bearish.map((t, i) => (
                      <TickerListRow
                        key={t.symbol}
                        ticker={t}
                        rank={i + 1}
                        isWatched={watchlist.includes(t.symbol)}
                        onToggleWatch={toggleWatch}
                        onClick={handleTickerClick}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* ── Most Discussed ── */}
              <div className="mt-6 bg-card rounded-2xl border border-border overflow-hidden">
                <div className="px-4 py-3.5 border-b border-border flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted">
                    <Eye size={14} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-black">Most Discussed</p>
                    <p className="text-[10px] text-muted-foreground">Tickers with the most community posts today</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 border-b border-border">
                  <span className="w-5 text-[9px] font-bold text-muted-foreground uppercase text-right">#</span>
                  <span className="flex-1 text-[9px] font-bold text-muted-foreground uppercase">Ticker</span>
                  <span className="w-16 text-[9px] font-bold text-muted-foreground uppercase hidden sm:block">Chart</span>
                  <span className="w-10 text-[9px] font-bold text-muted-foreground uppercase text-center">Score</span>
                  <span className="w-20 text-[9px] font-bold text-muted-foreground uppercase text-right">Price</span>
                  <span className="w-12 text-[9px] font-bold text-muted-foreground uppercase text-center hidden lg:block">Posts</span>
                  <span className="w-8" />
                </div>
                {[...sorted].sort((a, b) => b.mentions - a.mentions).slice(0, 10).map((t, i) => (
                  <TickerListRow
                    key={t.symbol}
                    ticker={t}
                    rank={i + 1}
                    isWatched={watchlist.includes(t.symbol)}
                    onToggleWatch={toggleWatch}
                    onClick={handleTickerClick}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
