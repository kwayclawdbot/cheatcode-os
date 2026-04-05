// CheatCode OS — Community Page
// Design: StockTwits × Twitter/X for traders. Fully theme-aware (light/dark).
// Key features:
//   - Trending ticker pills strip (live from Kai's Radar API)
//   - Ticker search bar → opens per-ticker feed view
//   - Asset class tabs: All / Stocks / Forex / Futures / Crypto
//   - Per-ticker feed: header with Kai score + link to Intelligence
//   - Post types: Trade Idea, P&L Share, Market Take, Chart Post, Question
//   - Reactions: 🔥 Bullish, 🐻 Bearish, 👀 Watching, ❤️ Like

import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Minus, Heart, MessageCircle, Repeat2,
  Bookmark, Share2, Flame, Search, X, ChevronRight, Zap, Award,
  Users, Clock, BarChart2, ArrowUpRight, ChevronLeft, ChevronRight as ChevronRightIcon,
  Globe, DollarSign, Activity, Bitcoin
} from "lucide-react";
import { toast } from "sonner";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { fetchRadar } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type PostType = "trade_idea" | "pl_share" | "market_take" | "chart_post" | "question";
type Sentiment = "bullish" | "bearish" | "neutral";
type FeedTab = "trending" | "following" | "latest" | "trade_ideas";
type AssetClass = "all" | "stocks" | "forex" | "futures" | "crypto";

interface Reaction {
  emoji: string;
  label: string;
  count: number;
  active?: boolean;
}

interface Post {
  id: string;
  type: PostType;
  assetClass?: AssetClass;
  user: {
    name: string;
    handle: string;
    initials: string;
    color: string;
    style: string;
    level: string;
    levelColor: string;
    xp: number;
    verified?: boolean;
  };
  timestamp: string;
  sentiment?: Sentiment;
  ticker?: string;
  timeframe?: string;
  entry?: string;
  target?: string;
  stop?: string;
  thesis?: string;
  text?: string;
  outcome?: "win" | "loss" | "open";
  pnl?: string;
  reactions: Reaction[];
  comments: number;
  reposts: number;
  bookmarked?: boolean;
}

// ─── Seed posts ───────────────────────────────────────────────────────────────

const SEED_POSTS: Post[] = [
  {
    id: "1", type: "trade_idea", assetClass: "stocks",
    user: { name: "Jordan Davis", handle: "@jdtrader", initials: "JD", color: "#4DC820", style: "Swing Trader", level: "Expert", levelColor: "#F79009", xp: 12450 },
    timestamp: "2h ago", sentiment: "bullish", ticker: "PLTR", timeframe: "Swing",
    entry: "$24.50", target: "$32.00", stop: "$21.80",
    thesis: "Breaking out of a 6-week base on heavy volume. Institutional accumulation visible on the daily. Target is the prior high from November. Risk/reward is 3:1 here.",
    reactions: [{ emoji: "🔥", label: "Bullish", count: 47 }, { emoji: "🐻", label: "Bearish", count: 8 }, { emoji: "👀", label: "Watching", count: 23 }],
    comments: 14, reposts: 6,
  },
  {
    id: "2", type: "pl_share", assetClass: "stocks",
    user: { name: "Alex Kim", handle: "@alphatrader", initials: "AK", color: "#00AEEF", style: "Day Trader", level: "Veteran", levelColor: "#F04438", xp: 8200 },
    timestamp: "4h ago", outcome: "win", ticker: "NVDA", pnl: "+$2,840",
    text: "Caught the morning breakout on NVDA. Entered at $118.20 off the 9 EMA, took half off at $121 and let the rest run to $124.50. Clean setup, clean execution. The discipline is everything.",
    reactions: [{ emoji: "🔥", label: "Bullish", count: 89 }, { emoji: "❤️", label: "Like", count: 134 }],
    comments: 28, reposts: 19,
  },
  {
    id: "3", type: "market_take", assetClass: "stocks",
    user: { name: "Sam Rivera", handle: "@macrotrader", initials: "SR", color: "#7B2FBE", style: "Macro", level: "Elite", levelColor: "#E8193C", xp: 21000 },
    timestamp: "6h ago", sentiment: "bearish",
    text: "The market is pricing in 3 rate cuts this year but the data doesn't support it. CPI is still sticky, the labor market is too strong, and the Fed has been clear. I think we see a repricing in Q2 that catches a lot of people off guard. Staying defensive, rotating into energy and healthcare.",
    reactions: [{ emoji: "🐻", label: "Bearish", count: 62 }, { emoji: "🔥", label: "Bullish", count: 31 }, { emoji: "👀", label: "Watching", count: 44 }],
    comments: 41, reposts: 27,
  },
  {
    id: "4", type: "trade_idea", assetClass: "forex",
    user: { name: "Taylor Morgan", handle: "@chartmaster", initials: "TM", color: "#E8193C", style: "Technical", level: "Trader", levelColor: "#7B2FBE", xp: 3800 },
    timestamp: "8h ago", sentiment: "bullish", ticker: "EUR/USD", timeframe: "Swing",
    thesis: "EUR/USD is forming a double bottom on the 4H chart. If it holds above 1.0850 I'm looking for a move to 1.0950. Stop below 1.0800. Clean structure, good R/R.",
    reactions: [{ emoji: "🔥", label: "Bullish", count: 38 }, { emoji: "🐻", label: "Bearish", count: 12 }, { emoji: "👀", label: "Watching", count: 29 }],
    comments: 11, reposts: 5,
  },
  {
    id: "5", type: "trade_idea", assetClass: "crypto",
    user: { name: "Maya Chen", handle: "@cryptomaya", initials: "MC", color: "#F79009", style: "Crypto Trader", level: "Expert", levelColor: "#4DC820", xp: 9100 },
    timestamp: "9h ago", sentiment: "bullish", ticker: "BTC", timeframe: "Swing",
    entry: "$62,000", target: "$72,000", stop: "$58,500",
    thesis: "BTC reclaimed the 200-day MA and is holding above it. On-chain data shows accumulation by long-term holders. The halving narrative is building. This is a high-conviction swing setup.",
    reactions: [{ emoji: "🔥", label: "Bullish", count: 112 }, { emoji: "🐻", label: "Bearish", count: 24 }, { emoji: "👀", label: "Watching", count: 87 }],
    comments: 56, reposts: 34,
  },
  {
    id: "6", type: "trade_idea", assetClass: "futures",
    user: { name: "Derek Walsh", handle: "@futurestrader", initials: "DW", color: "#00AEEF", style: "Futures Trader", level: "Veteran", levelColor: "#F79009", xp: 14200 },
    timestamp: "11h ago", sentiment: "bearish", ticker: "ES", timeframe: "Day Trade",
    thesis: "ES is at a key resistance zone from the March highs. Volume has been declining on the rallies. I'm short with a stop above 5280, targeting a move back to 5200. Tight risk, defined setup.",
    reactions: [{ emoji: "🐻", label: "Bearish", count: 44 }, { emoji: "🔥", label: "Bullish", count: 18 }, { emoji: "👀", label: "Watching", count: 31 }],
    comments: 22, reposts: 9,
  },
  {
    id: "7", type: "question", assetClass: "stocks",
    user: { name: "Chris Lee", handle: "@newtrader99", initials: "CL", color: "#667085", style: "Beginner", level: "Rookie", levelColor: "#667085", xp: 120 },
    timestamp: "12h ago",
    text: "Question for the swing traders here — do you use the weekly chart or daily chart as your primary timeframe for entries? I've been trying to figure out which one to anchor to. Any help appreciated.",
    reactions: [{ emoji: "❤️", label: "Like", count: 24 }],
    comments: 18, reposts: 2,
  },
];

const SENTIMENT_CONFIG = {
  bullish: { color: "#4DC820", icon: TrendingUp, label: "Bullish" },
  bearish: { color: "#E8193C", icon: TrendingDown, label: "Bearish" },
  neutral: { color: "#F79009", icon: Minus, label: "Neutral" },
};

const POST_TYPE_CONFIG: Record<PostType, { label: string; color: string }> = {
  trade_idea:  { label: "Trade Idea",  color: "#00AEEF" },
  pl_share:    { label: "P&L Share",   color: "#4DC820" },
  market_take: { label: "Market Take", color: "#7B2FBE" },
  chart_post:  { label: "Chart",       color: "#F79009" },
  question:    { label: "Question",    color: "#667085" },
};

const ASSET_TABS: { id: AssetClass; label: string; icon: React.ReactNode }[] = [
  { id: "all",     label: "All",     icon: <Globe size={12} /> },
  { id: "stocks",  label: "Stocks",  icon: <DollarSign size={12} /> },
  { id: "forex",   label: "Forex",   icon: <Activity size={12} /> },
  { id: "futures", label: "Futures", icon: <BarChart2 size={12} /> },
  { id: "crypto",  label: "Crypto",  icon: <Bitcoin size={12} /> },
];

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post, onReact, onTickerClick }: {
  post: Post;
  onReact: (postId: string, emoji: string) => void;
  onTickerClick: (ticker: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = POST_TYPE_CONFIG[post.type];
  const sentConfig = post.sentiment ? SENTIMENT_CONFIG[post.sentiment] : null;
  const displayText = post.text || post.thesis || "";
  const isLong = displayText.length > 200;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border p-4 hover:shadow-sm transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
             style={{ background: post.user.color }}>
          {post.user.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/traders/${post.user.handle.replace("@", "")}`}>
              <span className="font-bold text-foreground text-sm hover:underline cursor-pointer">{post.user.name}</span>
            </Link>
            <span className="text-xs text-muted-foreground">{post.user.handle}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: post.user.levelColor }}>
              {post.user.level}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground"
                  style={{ color: typeConfig.color }}>
              {typeConfig.label}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              {post.user.style}
            </span>
            <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">{post.timestamp}</span>
          </div>
        </div>
      </div>

      {/* Trade Idea ticker strip */}
      {post.type === "trade_idea" && post.ticker && (
        <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-muted">
          <button
            onClick={() => onTickerClick(post.ticker!)}
            className="ticker-mono text-base font-black text-foreground hover:text-[#4DC820] transition-colors"
          >
            ${post.ticker}
          </button>
          {sentConfig && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ background: sentConfig.color }}>
              {sentConfig.label}
            </span>
          )}
          {post.timeframe && (
            <span className="text-xs text-muted-foreground ml-auto">{post.timeframe}</span>
          )}
        </div>
      )}

      {/* P&L Share */}
      {post.type === "pl_share" && post.pnl && (
        <div className="flex items-center gap-2 mb-3 p-3 rounded-xl bg-muted">
          <span className="text-lg font-black"
                style={{ color: post.outcome === "win" ? "#4DC820" : "#E8193C" }}>
            {post.pnl}
          </span>
          {post.ticker && (
            <button
              onClick={() => onTickerClick(post.ticker!)}
              className="ticker-mono text-sm font-bold text-foreground hover:text-[#4DC820] transition-colors"
            >
              on ${post.ticker}
            </button>
          )}
          <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full text-white"
                style={{ background: post.outcome === "win" ? "#4DC820" : "#E8193C" }}>
            {post.outcome === "win" ? "✓ Win" : "✗ Loss"}
          </span>
        </div>
      )}

      {/* Key levels */}
      {post.type === "trade_idea" && (post.entry || post.target || post.stop) && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: "Entry", value: post.entry, color: "text-muted-foreground" },
            { label: "Target", value: post.target, color: "text-[#4DC820]" },
            { label: "Stop", value: post.stop, color: "text-[#E8193C]" },
          ].filter(k => k.value).map(k => (
            <div key={k.label} className="bg-muted rounded-xl p-2 text-center border border-border">
              <p className={`text-[9px] font-bold uppercase tracking-wide mb-0.5 ${k.color}`}>{k.label}</p>
              <p className="ticker-mono text-xs font-bold text-foreground">{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Text body */}
      {displayText && (
        <div className="mb-3">
          <p className="text-sm text-foreground leading-relaxed">
            {isLong && !expanded ? displayText.slice(0, 200) + "…" : displayText}
          </p>
          {isLong && (
            <button onClick={() => setExpanded(!expanded)}
                    className="text-xs font-bold text-[#4DC820] hover:underline mt-1">
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      )}

      {/* Reactions */}
      <div className="flex items-center gap-1 flex-wrap mb-2">
        {post.reactions.map(r => (
          <button
            key={r.emoji}
            onClick={() => onReact(post.id, r.emoji)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 border"
            style={{
              background: r.active ? "rgba(77,200,32,0.12)" : "var(--muted)",
              borderColor: r.active ? "#4DC820" : "var(--border)",
              color: r.active ? "#4DC820" : "var(--muted-foreground)",
            }}
          >
            <span>{r.emoji}</span>
            <span>{r.count}</span>
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-2 border-t border-border">
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <MessageCircle size={13} /> <span>{post.comments}</span>
        </button>
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#4DC820] transition-colors">
          <Repeat2 size={13} /> <span>{post.reposts}</span>
        </button>
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Bookmark size={13} />
        </button>
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto">
          <Share2 size={13} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Compose Box ──────────────────────────────────────────────────────────────

function ComposeBox({ onPost, prefillTicker }: { onPost: (text: string) => void; prefillTicker?: string }) {
  const [text, setText] = useState(prefillTicker ? `$${prefillTicker} ` : "");
  const [type, setType] = useState<PostType>("market_take");

  useEffect(() => {
    if (prefillTicker) setText(`$${prefillTicker} `);
  }, [prefillTicker]);

  return (
    <div className="bg-card rounded-2xl border border-border p-4 mb-4">
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-[#4DC820] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          You
        </div>
        <div className="flex-1">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="What's your market take? Share a trade idea, P&L, or question…"
            rows={3}
            className="w-full text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none bg-transparent leading-relaxed"
          />
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
            <div className="flex gap-1 flex-wrap">
              {(["trade_idea", "pl_share", "market_take", "question"] as PostType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg transition-all border"
                  style={{
                    background: type === t ? "rgba(77,200,32,0.12)" : "transparent",
                    color: type === t ? POST_TYPE_CONFIG[t].color : "var(--muted-foreground)",
                    borderColor: type === t ? POST_TYPE_CONFIG[t].color + "60" : "var(--border)",
                  }}
                >
                  {POST_TYPE_CONFIG[t].label}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                if (text.trim()) {
                  onPost(text);
                  setText("");
                  toast.success("Posted! +25 XP", { duration: 2000 });
                }
              }}
              disabled={!text.trim()}
              className="ml-auto text-xs font-bold px-4 py-1.5 rounded-xl cc-gradient-bg text-[#101828] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Zap size={11} /> Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Trending Ticker Pill Strip ───────────────────────────────────────────────

function TickerPillStrip({ radarTickers, onTickerClick, activeTicker }: {
  radarTickers: any[];
  onTickerClick: (ticker: string) => void;
  activeTicker: string | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
    }
  };

  // Static popular tickers as fallback + live radar
  const staticTickers = [
    { symbol: "NVDA", score: 78, direction: "bullish" },
    { symbol: "TSLA", score: 52, direction: "neutral" },
    { symbol: "AAPL", score: 61, direction: "bullish" },
    { symbol: "SPY",  score: 45, direction: "bearish" },
    { symbol: "QQQ",  score: 48, direction: "neutral" },
    { symbol: "BTC",  score: 72, direction: "bullish" },
    { symbol: "EUR/USD", score: 55, direction: "neutral" },
    { symbol: "ES",   score: 40, direction: "bearish" },
    { symbol: "GLD",  score: 68, direction: "bullish" },
    { symbol: "AMZN", score: 63, direction: "bullish" },
  ];

  const allTickers = radarTickers.length > 0 ? radarTickers : staticTickers;

  return (
    <div className="relative flex items-center gap-1 bg-card border-b border-border px-4 py-2">
      <button
        onClick={() => scroll("left")}
        className="flex-shrink-0 w-6 h-6 rounded-full bg-muted hover:bg-accent flex items-center justify-center transition-colors"
      >
        <ChevronLeft size={12} className="text-muted-foreground" />
      </button>

      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1 px-1"
        style={{ scrollbarWidth: "none" }}
      >
        {allTickers.map((t: any) => {
          const isBull = t.direction?.toLowerCase() === "bullish";
          const isBear = t.direction?.toLowerCase() === "bearish";
          const color = isBull ? "#4DC820" : isBear ? "#E8193C" : "#F79009";
          const isActive = activeTicker === t.symbol;

          return (
            <button
              key={t.symbol}
              onClick={() => onTickerClick(isActive ? "" : t.symbol)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border"
              style={{
                background: isActive ? color + "22" : "var(--muted)",
                borderColor: isActive ? color : "var(--border)",
                color: isActive ? color : "var(--foreground)",
              }}
            >
              <span className="ticker-mono">{t.symbol}</span>
              <span className="text-[10px]" style={{ color }}>
                {isBull ? "↑" : isBear ? "↓" : "→"}
              </span>
              {t.score && (
                <span className="text-[9px] font-bold opacity-70">{Math.round(t.score)}</span>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => scroll("right")}
        className="flex-shrink-0 w-6 h-6 rounded-full bg-muted hover:bg-accent flex items-center justify-center transition-colors"
      >
        <ChevronRightIcon size={12} className="text-muted-foreground" />
      </button>
    </div>
  );
}

// ─── Ticker Feed Header ───────────────────────────────────────────────────────

function TickerFeedHeader({ ticker, radarTickers, onClear }: {
  ticker: string;
  radarTickers: any[];
  onClear: () => void;
}) {
  const tickerData = radarTickers.find((t: any) => t.symbol === ticker);
  const isBull = tickerData?.direction?.toLowerCase() === "bullish";
  const isBear = tickerData?.direction?.toLowerCase() === "bearish";
  const color = isBull ? "#4DC820" : isBear ? "#E8193C" : "#F79009";
  const dirLabel = isBull ? "Bullish" : isBear ? "Bearish" : "Neutral";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border p-4 mb-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white"
               style={{ background: color + "22", border: `2px solid ${color}`, color }}>
            {ticker.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="ticker-mono font-black text-foreground text-lg">${ticker}</span>
              {tickerData && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ background: color }}>
                  {dirLabel}
                </span>
              )}
              {tickerData?.score && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  Kai Score: {Math.round(tickerData.score)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Showing all ${ticker} posts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/intelligence?ticker=${ticker}`}>
            <button className="text-xs font-bold px-3 py-1.5 rounded-xl border border-[#00AEEF] text-[#00AEEF] hover:bg-[rgba(0,174,239,0.1)] transition-colors flex items-center gap-1">
              Full Analysis <ArrowUpRight size={11} />
            </button>
          </Link>
          <button
            onClick={onClear}
            className="w-7 h-7 rounded-full bg-muted hover:bg-accent flex items-center justify-center transition-colors"
          >
            <X size={13} className="text-muted-foreground" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Right Sidebar ────────────────────────────────────────────────────────────

function TrendingSidebar({ radarTickers, onTickerClick }: {
  radarTickers: any[];
  onTickerClick: (ticker: string) => void;
}) {
  const trending = [
    { tag: "PLTR", posts: 284, dir: "bullish" },
    { tag: "NVDA", posts: 219, dir: "bullish" },
    { tag: "TSLA", posts: 198, dir: "neutral" },
    { tag: "SPY",  posts: 176, dir: "bearish" },
    { tag: "QQQ",  posts: 142, dir: "neutral" },
    { tag: "BTC",  posts: 138, dir: "bullish" },
  ];

  return (
    <div className="space-y-4">
      {/* Trending tickers */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <h3 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
          <Flame size={14} className="text-[#E8193C]" /> Trending Now
        </h3>
        <div className="space-y-1">
          {trending.map((t, i) => {
            const color = t.dir === "bullish" ? "#4DC820" : t.dir === "bearish" ? "#E8193C" : "#F79009";
            return (
              <button
                key={t.tag}
                onClick={() => onTickerClick(t.tag)}
                className="w-full flex items-center justify-between py-1.5 hover:bg-muted rounded-xl px-2 -mx-2 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                  <span className="ticker-mono text-sm font-bold text-foreground">${t.tag}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">{t.posts} posts</span>
                  <span className="text-xs font-bold" style={{ color }}>
                    {t.dir === "bullish" ? "↑" : t.dir === "bearish" ? "↓" : "→"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Kai's Radar */}
      {radarTickers.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-4">
          <h3 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
            <BarChart2 size={14} className="text-[#00AEEF]" /> Kai's Radar
          </h3>
          <div className="space-y-1">
            {radarTickers.slice(0, 5).map((t: any) => {
              const isBull = t.direction?.toLowerCase() === "bullish";
              const isBear = t.direction?.toLowerCase() === "bearish";
              const color = isBull ? "#4DC820" : isBear ? "#E8193C" : "#F79009";
              return (
                <button
                  key={t.symbol}
                  onClick={() => onTickerClick(t.symbol)}
                  className="w-full flex items-center justify-between py-1.5 hover:bg-muted rounded-xl px-2 -mx-2 transition-colors"
                >
                  <span className="ticker-mono text-sm font-bold text-foreground">{t.symbol}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-12 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${t.score}%`, background: color }} />
                    </div>
                    <span className="text-[10px] font-bold" style={{ color }}>{t.score}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <Link href="/intelligence">
            <button className="w-full mt-3 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1">
              View all signals <ChevronRight size={11} />
            </button>
          </Link>
        </div>
      )}

      {/* Who to follow */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <h3 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
          <Users size={14} className="text-[#7B2FBE]" /> Who to Follow
        </h3>
        <div className="space-y-3">
          {[
            { name: "Jordan Davis",  handle: "@jdtrader",    style: "Swing", level: "Expert",  color: "#4DC820" },
            { name: "Alex Kim",      handle: "@alphatrader", style: "Day",   level: "Veteran", color: "#00AEEF" },
            { name: "Sam Rivera",    handle: "@macrotrader", style: "Macro", level: "Elite",   color: "#7B2FBE" },
          ].map(u => (
            <div key={u.handle} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                   style={{ background: u.color }}>
                {u.name.split(" ").map((w: string) => w[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{u.name}</p>
                <p className="text-[10px] text-muted-foreground">{u.style} · {u.level}</p>
              </div>
              <button
                onClick={() => toast.success(`Following ${u.name}!`, { duration: 1500 })}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-[#4DC820] text-[#4DC820] hover:bg-[rgba(77,200,32,0.1)] transition-colors flex-shrink-0"
              >
                Follow
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Community Page ──────────────────────────────────────────────────────

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<FeedTab>("trending");
  const [activeAsset, setActiveAsset] = useState<AssetClass>("all");
  const [activeTicker, setActiveTicker] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>(SEED_POSTS);
  const [radarTickers, setRadarTickers] = useState<any[]>([]);
  const [tickerSearch, setTickerSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchRadar().then(r => {
      const all = [
        ...(r.critical || []),
        ...(r.high_conviction || []),
        ...(r.watch || []),
      ];
      setRadarTickers(all);
    }).catch(() => {});
  }, []);

  const handleTickerClick = (ticker: string) => {
    setActiveTicker(ticker || null);
    setTickerSearch("");
  };

  const handleTickerSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (tickerSearch.trim()) {
      setActiveTicker(tickerSearch.trim().toUpperCase());
      setTickerSearch("");
    }
  };

  const handleReact = (postId: string, emoji: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return {
        ...p,
        reactions: p.reactions.map(r => {
          if (r.emoji !== emoji) return r;
          const wasActive = r.active;
          return { ...r, count: wasActive ? r.count - 1 : r.count + 1, active: !wasActive };
        }),
      };
    }));
  };

  const handlePost = (text: string) => {
    const newPost: Post = {
      id: Date.now().toString(),
      type: "market_take",
      assetClass: activeAsset === "all" ? "stocks" : activeAsset,
      user: { name: "You", handle: "@you", initials: "YO", color: "#4DC820", style: "Trader", level: "Rookie", levelColor: "#667085", xp: 120 },
      timestamp: "Just now",
      text,
      reactions: [
        { emoji: "🔥", label: "Bullish", count: 0 },
        { emoji: "❤️", label: "Like", count: 0 },
      ],
      comments: 0,
      reposts: 0,
    };
    setPosts(prev => [newPost, ...prev]);
  };

  const TABS: { id: FeedTab; label: string; icon: React.ReactNode }[] = [
    { id: "trending",    label: "Trending",    icon: <Flame size={13} /> },
    { id: "following",   label: "Following",   icon: <Users size={13} /> },
    { id: "latest",      label: "Latest",      icon: <Clock size={13} /> },
    { id: "trade_ideas", label: "Trade Ideas", icon: <TrendingUp size={13} /> },
  ];

  const filteredPosts = posts.filter(p => {
    // Ticker filter
    if (activeTicker) {
      const tickerMatch = p.ticker?.toUpperCase() === activeTicker ||
        p.text?.toUpperCase().includes(`$${activeTicker}`) ||
        p.thesis?.toUpperCase().includes(`$${activeTicker}`);
      if (!tickerMatch) return false;
    }
    // Asset class filter
    if (activeAsset !== "all" && p.assetClass && p.assetClass !== activeAsset) return false;
    // Tab filter
    if (activeTab === "trade_ideas") return p.type === "trade_idea";
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.text?.toLowerCase().includes(q) ||
        p.thesis?.toLowerCase().includes(q) ||
        p.ticker?.toLowerCase().includes(q) ||
        p.user.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* ── Sticky header ── */}
      <div className="bg-card border-b border-border sticky top-14 z-30">
        {/* Title row */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-3">
            <h1 className="font-black text-foreground text-lg" style={{ fontFamily: "var(--font-display)" }}>
              Community
            </h1>
            <div className="flex items-center gap-2">
              {/* Ticker search */}
              <form onSubmit={handleTickerSearch} className="relative hidden sm:block">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={tickerSearch}
                  onChange={e => setTickerSearch(e.target.value.toUpperCase())}
                  placeholder="Search ticker… $NVDA"
                  className="pl-8 pr-3 py-2 text-xs bg-muted border border-border rounded-xl focus:outline-none focus:border-[#4DC820] transition-colors w-44 text-foreground placeholder:text-muted-foreground uppercase"
                />
              </form>
              <Link href="/feed">
                <button className="text-xs font-bold px-3 py-2 rounded-xl cc-gradient-bg text-[#101828] hover:opacity-90 transition-opacity flex items-center gap-1.5">
                  <Zap size={11} /> Swipe Feed
                </button>
              </Link>
            </div>
          </div>

          {/* Feed tabs */}
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold transition-all relative"
                style={{
                  color: activeTab === tab.id ? "var(--foreground)" : "var(--muted-foreground)",
                  borderBottom: activeTab === tab.id ? "2px solid #4DC820" : "2px solid transparent",
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Trending ticker pill strip */}
        <TickerPillStrip
          radarTickers={radarTickers}
          onTickerClick={handleTickerClick}
          activeTicker={activeTicker}
        />

        {/* Asset class tabs */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 py-1.5">
            {ASSET_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveAsset(tab.id)}
                className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all"
                style={{
                  background: activeAsset === tab.id ? "rgba(77,200,32,0.12)" : "transparent",
                  color: activeAsset === tab.id ? "#4DC820" : "var(--muted-foreground)",
                  border: activeAsset === tab.id ? "1px solid rgba(77,200,32,0.3)" : "1px solid transparent",
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
          {/* Feed */}
          <div>
            {/* Ticker feed header */}
            <AnimatePresence>
              {activeTicker && (
                <TickerFeedHeader
                  ticker={activeTicker}
                  radarTickers={radarTickers}
                  onClear={() => setActiveTicker(null)}
                />
              )}
            </AnimatePresence>

            <ComposeBox onPost={handlePost} prefillTicker={activeTicker || undefined} />

            <div className="space-y-3">
              <AnimatePresence>
                {filteredPosts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onReact={handleReact}
                    onTickerClick={handleTickerClick}
                  />
                ))}
              </AnimatePresence>
              {filteredPosts.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <MessageCircle size={20} className="text-muted-foreground" />
                  </div>
                  <p className="text-foreground font-bold text-sm mb-1">
                    {activeTicker ? `No posts about $${activeTicker} yet` : "No posts found"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {activeTicker ? `Be the first to share your take on $${activeTicker}` : "Be the first to post!"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="hidden lg:block">
            <TrendingSidebar radarTickers={radarTickers} onTickerClick={handleTickerClick} />
          </div>
        </div>
      </div>

      <KaiChat />
    </div>
  );
}
