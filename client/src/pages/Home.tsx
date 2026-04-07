/**
 * CheatCode OS — Home Page (Social-First Redesign)
 *
 * Vision: Bloomberg Terminal meets Twitter meets Robinhood.
 * Tickers are social objects. Traders are the content creators.
 * The home page surfaces both simultaneously.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────────────┐
 *   │  Trending Tickers Rail (horizontal scroll, social data) │
 *   ├──────────────────────────────┬──────────────────────────┤
 *   │  Community Feed              │  Discovery Sidebar       │
 *   │  - Compose bar               │  - Top Traders to Follow │
 *   │  - Filter tabs               │  - Trending Topics       │
 *   │  - Live posts                │  - Active Rooms          │
 *   │    (with full identity)      │  - Market Pulse          │
 *   └──────────────────────────────┴──────────────────────────┘
 */

import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, MessageCircle, Repeat2,
  Bookmark, Share2, Flame, ChevronRight, ChevronLeft,
  ArrowUpRight, Users, Hash, Zap, Send, Plus,
  BarChart2, Activity, Globe, DollarSign, Bitcoin,
} from "lucide-react";
import { toast } from "sonner";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { TickerLogo } from "@/components/intelligence/TickerLogo";
import { useTheme } from "@/contexts/ThemeContext";
import {
  fetchFeed, fetchRadar, fetchMarketSummary, fetchLeaderboard, fetchQuotes, fetchContentByTicker,
  likePost, repostPost, bookmarkPost, createPost, createComment, fetchComments, normalizeContentCard,
} from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/_core/hooks/useAuth";
import { MiniSparkline } from "@/components/shared/MiniSparkline";
import { useAssetClass } from "@/contexts/AssetClassContext";

// ─── XP Level System (shared) ─────────────────────────────────────────────────
const XP_LEVELS = [
  { level: 1, name: "Rookie",     minXP: 0,     color: "#667085", emoji: "🌱" },
  { level: 2, name: "Apprentice", minXP: 500,   color: "#00AEEF", emoji: "📚" },
  { level: 3, name: "Trader",     minXP: 1500,  color: "#7B2FBE", emoji: "📈" },
  { level: 4, name: "Veteran",    minXP: 4000,  color: "#F79009", emoji: "⚔️" },
  { level: 5, name: "Elite",      minXP: 10000, color: "#E8193C", emoji: "🔥" },
  { level: 6, name: "Legend",     minXP: 25000, color: "#4DC820", emoji: "👑" },
];
function getLevel(xp: number) {
  return XP_LEVELS.slice().reverse().find(l => xp >= l.minXP) || XP_LEVELS[0];
}

// ─── Post Types ───────────────────────────────────────────────────────────────
type PostType = "trade_idea" | "pl_share" | "market_take" | "question";
const POST_TYPE_CONFIG: Record<PostType, { label: string; color: string; bg: string }> = {
  trade_idea:  { label: "Trade Idea",  color: "#00AEEF", bg: "#E6F7FD" },
  pl_share:    { label: "P&L Share",   color: "#4DC820", bg: "#EDFBE6" },
  market_take: { label: "Market Take", color: "#7B2FBE", bg: "#F3E8FF" },
  question:    { label: "Question",    color: "#667085", bg: "#F2F4F7" },
};

// ─── Trending Ticker Card ─────────────────────────────────────────────────────
interface TickerSocialCard {
  symbol: string;
  price: number;
  change_pct: number;
  bullish_pct: number; // % of posts that are bullish
  post_count: number;
  top_traders: { name: string; initials: string; color: string }[];
}

// Static trending tickers with community sentiment (will be enriched by API)
const TRENDING_TICKERS: TickerSocialCard[] = [
  { symbol: "NVDA", price: 875.40, change_pct: 2.34, bullish_pct: 78, post_count: 142, top_traders: [{ name: "Alex Kim", initials: "AK", color: "#00AEEF" }, { name: "Jordan Davis", initials: "JD", color: "#4DC820" }] },
  { symbol: "TSLA", price: 172.80, change_pct: -1.82, bullish_pct: 41, post_count: 98, top_traders: [{ name: "Sam Rivera", initials: "SR", color: "#7B2FBE" }, { name: "Maya Chen", initials: "MC", color: "#F79009" }] },
  { symbol: "SPY",  price: 520.15, change_pct: 0.47, bullish_pct: 62, post_count: 87, top_traders: [{ name: "Derek Walsh", initials: "DW", color: "#E8193C" }, { name: "Taylor Morgan", initials: "TM", color: "#00AEEF" }] },
  { symbol: "AAPL", price: 189.30, change_pct: 0.91, bullish_pct: 71, post_count: 76, top_traders: [{ name: "Jordan Davis", initials: "JD", color: "#4DC820" }, { name: "Alex Kim", initials: "AK", color: "#00AEEF" }] },
  { symbol: "AMD",  price: 158.60, change_pct: 3.12, bullish_pct: 84, post_count: 64, top_traders: [{ name: "Maya Chen", initials: "MC", color: "#F79009" }, { name: "Sam Rivera", initials: "SR", color: "#7B2FBE" }] },
  { symbol: "QQQ",  price: 444.20, change_pct: 0.60, bullish_pct: 67, post_count: 55, top_traders: [{ name: "Derek Walsh", initials: "DW", color: "#E8193C" }] },
  { symbol: "META", price: 512.70, change_pct: 1.45, bullish_pct: 73, post_count: 48, top_traders: [{ name: "Taylor Morgan", initials: "TM", color: "#00AEEF" }, { name: "Jordan Davis", initials: "JD", color: "#4DC820" }] },
  { symbol: "BTC",  price: 68420, change_pct: 2.18, bullish_pct: 81, post_count: 93, top_traders: [{ name: "Maya Chen", initials: "MC", color: "#F79009" }, { name: "Alex Kim", initials: "AK", color: "#00AEEF" }] },
  { symbol: "PLTR", price: 24.50, change_pct: 4.21, bullish_pct: 89, post_count: 41, top_traders: [{ name: "Jordan Davis", initials: "JD", color: "#4DC820" }] },
  { symbol: "MSFT", price: 415.80, change_pct: 0.33, bullish_pct: 69, post_count: 38, top_traders: [{ name: "Sam Rivera", initials: "SR", color: "#7B2FBE" }] },
];

function TickerSocialCardItem({ ticker, onClick }: { ticker: TickerSocialCard; onClick: () => void }) {
  const isUp = ticker.change_pct >= 0;
  const bearish_pct = 100 - ticker.bullish_pct;

  return (
    <motion.button
      whileHover={{ y: -2, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
      onClick={onClick}
      className="flex-shrink-0 w-48 p-3 rounded-xl border border-border bg-card text-left cursor-pointer transition-colors hover:border-border/60"
    >
      {/* Header: logo + symbol + change badge */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <TickerLogo symbol={ticker.symbol} size={18} />
          <span className="font-black text-sm text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
            {ticker.symbol}
          </span>
        </div>
        <span
          className="text-[10px] font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
          style={{
            color: isUp ? "#4DC820" : "#E8193C",
            background: isUp ? "rgba(77,200,32,0.12)" : "rgba(232,25,60,0.12)",
          }}
        >
          {isUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
          {isUp ? "+" : ""}{ticker.change_pct !== 0 ? ticker.change_pct.toFixed(2) : "—"}%
        </span>
      </div>

      {/* Price + Sparkline side by side */}
      <div className="flex items-end justify-between mb-2">
        <p className="text-base font-black text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
          {ticker.price > 0 ? `$${ticker.price.toLocaleString()}` : "—"}
        </p>
        <MiniSparkline symbol={ticker.symbol} width={64} height={28} />
      </div>

      {/* Community sentiment bar */}
      <div className="mb-1.5">
        <div className="flex justify-between text-[9px] font-bold mb-0.5">
          <span style={{ color: "#4DC820" }}>🔥 {ticker.bullish_pct}%</span>
          <span style={{ color: "#E8193C" }}>🐻 {bearish_pct}%</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden bg-muted flex">
          <div className="h-full" style={{ width: `${ticker.bullish_pct}%`, background: "#4DC820" }} />
          <div className="h-full" style={{ width: `${bearish_pct}%`, background: "#E8193C" }} />
        </div>
      </div>

      {/* Post count + top trader avatars */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-medium">
          {ticker.post_count > 0 ? `${ticker.post_count} posts` : ""}
        </span>
        <div className="flex -space-x-1.5">
          {ticker.top_traders.slice(0, 2).map((t, i) => (
            <div
              key={i}
              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold border border-background"
              style={{ background: t.color }}
              title={t.name}
            >
              {t.initials[0]}
            </div>
          ))}
        </div>
      </div>
    </motion.button>
  );
}

// ─── Post Card (Full Identity) ────────────────────────────────────────────────
interface Post {
  id: string;
  type: PostType;
  user: {
    name: string;
    handle: string;
    initials: string;
    color: string;
    avatarUrl?: string;
    style: string;
    level: string;
    levelColor: string;
    xp?: number;
    assetClass?: string;
  };
  timestamp: string;
  sentiment?: "bullish" | "bearish" | "neutral";
  ticker?: string;
  timeframe?: string;
  entry?: string;
  target?: string;
  stop?: string;
  text?: string;
  thesis?: string;
  outcome?: "win" | "loss";
  pnl?: string;
  reactions: { emoji: string; label: string; count: number; active?: boolean }[];
  comments: number;
  reposts: number;
}

const SEED_POSTS: Post[] = [
  {
    id: "1", type: "trade_idea",
    user: { name: "Jordan Davis", handle: "@jdtrader", initials: "JD", color: "#4DC820", style: "Swing Trader", level: "Expert", levelColor: "#F79009", assetClass: "Stocks" },
    timestamp: "2h", sentiment: "bullish", ticker: "PLTR", timeframe: "Swing",
    entry: "$24.50", target: "$32.00", stop: "$21.80",
    thesis: "Breaking out of a 6-week base on heavy volume. Institutional accumulation visible on the daily. Risk/reward is 3:1.",
    reactions: [{ emoji: "🔥", label: "Bullish", count: 47 }, { emoji: "🐻", label: "Bearish", count: 8 }, { emoji: "👀", label: "Watching", count: 23 }],
    comments: 14, reposts: 6,
  },
  {
    id: "2", type: "pl_share",
    user: { name: "Alex Kim", handle: "@alphatrader", initials: "AK", color: "#00AEEF", style: "Day Trader", level: "Veteran", levelColor: "#F04438", assetClass: "Stocks" },
    timestamp: "4h", outcome: "win", ticker: "NVDA", pnl: "+$2,840",
    text: "Caught the morning breakout on NVDA. Entered at $118.20 off the 9 EMA, took half off at $121 and let the rest run to $124.50.",
    reactions: [{ emoji: "🔥", label: "Bullish", count: 89 }, { emoji: "❤️", label: "Like", count: 134 }],
    comments: 28, reposts: 19,
  },
  {
    id: "3", type: "market_take",
    user: { name: "Sam Rivera", handle: "@macrotrader", initials: "SR", color: "#7B2FBE", style: "Macro", level: "Elite", levelColor: "#E8193C", assetClass: "Stocks" },
    timestamp: "6h", sentiment: "bearish",
    text: "The market is pricing in 3 rate cuts this year but the data doesn't support it. CPI is still sticky. I think we see a repricing in Q2 that catches a lot of people off guard.",
    reactions: [{ emoji: "🐻", label: "Bearish", count: 62 }, { emoji: "🔥", label: "Bullish", count: 31 }, { emoji: "👀", label: "Watching", count: 44 }],
    comments: 41, reposts: 27,
  },
  {
    id: "4", type: "trade_idea",
    user: { name: "Maya Chen", handle: "@cryptomaya", initials: "MC", color: "#F79009", style: "Crypto Trader", level: "Expert", levelColor: "#4DC820", assetClass: "Crypto" },
    timestamp: "9h", sentiment: "bullish", ticker: "BTC", timeframe: "Swing",
    entry: "$62,000", target: "$72,000", stop: "$58,500",
    thesis: "BTC reclaimed the 200-day MA and is holding above it. On-chain data shows accumulation by long-term holders. High-conviction swing setup.",
    reactions: [{ emoji: "🔥", label: "Bullish", count: 112 }, { emoji: "🐻", label: "Bearish", count: 24 }, { emoji: "👀", label: "Watching", count: 87 }],
    comments: 56, reposts: 34,
  },
];

function SocialPostCard({
  post,
  onTickerClick,
}: {
  post: Post;
  onTickerClick: (ticker: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [localReposts, setLocalReposts] = useState(post.reposts);
  const [localComments, setLocalComments] = useState(post.comments);
  const [showLevels, setShowLevels] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const typeConfig = POST_TYPE_CONFIG[post.type];
  const sentColor = post.sentiment === "bullish" ? "#4DC820" : post.sentiment === "bearish" ? "#E8193C" : "#F79009";
  const displayText = post.text || post.thesis || "";
  const isLong = displayText.length > 200;

  const handleToggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next && !commentsLoaded) {
      setCommentsLoaded(true);
      fetchComments(post.id).then(data => {
        setComments(Array.isArray(data) ? data : []);
      }).catch(() => {});
    }
  };

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    const body = commentText.trim();
    setCommentText("");
    setLocalComments(c => c + 1);
    setComments(prev => [{ id: Date.now().toString(), body, user: { name: "You" }, created_at: new Date().toISOString() }, ...prev]);
    createComment(post.id, body).catch(() => {});
    toast.success("Comment posted! +5 XP");
  };

  const handleReshare = () => {
    if (reposted) return;
    setReposted(true);
    setLocalReposts(r => r + 1);
    repostPost(post.id).catch(() => { setReposted(false); setLocalReposts(r => r - 1); });
    toast.success("Reshared! +10 XP");
  };

  const handleBookmark = () => {
    const next = !bookmarked;
    setBookmarked(next);
    bookmarkPost(post.id).catch(() => setBookmarked(!next));
    toast.success(next ? "Saved to bookmarks" : "Removed from bookmarks");
  };

  const handleShare = () => {
    const url = `${window.location.origin}/community?post=${post.id}`;
    navigator.clipboard?.writeText(url).then(() => toast.success("Link copied!")).catch(() => toast.success("Link: " + url));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border p-4 hover:shadow-sm transition-all"
    >
      {/* Header: Avatar + Full Trader Identity */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ background: post.user.color }}
        >
          {post.user.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <Link href={`/traders/${post.user.handle.replace("@", "")}`}>
              <span className="font-bold text-foreground text-sm hover:underline cursor-pointer">
                {post.user.name}
              </span>
            </Link>
            <span className="text-[10px] text-muted-foreground">{post.user.handle}</span>
            {/* Level badge — colored pill per vision doc */}
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
              style={{ background: post.user.levelColor }}
            >
              {post.user.level}
            </span>
            {/* Style badge */}
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground hidden sm:inline">
              {post.user.style}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Post type badge */}
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: typeConfig.bg, color: typeConfig.color }}
            >
              {typeConfig.label}
            </span>
            {/* Ticker pill */}
            {post.ticker && (
              <button
                onClick={() => onTickerClick(post.ticker!)}
                className="flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded-lg hover:bg-muted transition-colors"
                style={{ color: sentColor, fontFamily: "var(--font-mono)" }}
              >
                <TickerLogo symbol={post.ticker} size={12} />
                ${post.ticker}
              </button>
            )}
            {/* Sentiment */}
            {post.sentiment && (
              <span className="text-[9px] font-bold" style={{ color: sentColor }}>
                {post.sentiment === "bullish" ? "🔥 Bullish" : post.sentiment === "bearish" ? "🐻 Bearish" : "👀 Neutral"}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto">{post.timestamp}</span>
          </div>
        </div>
      </div>

      {/* P&L badge for pl_share */}
      {post.type === "pl_share" && post.pnl && (
        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-lg bg-muted">
          <span className="text-lg font-black" style={{ color: post.outcome === "win" ? "#4DC820" : "#E8193C" }}>
            {post.pnl}
          </span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
            style={{ background: post.outcome === "win" ? "#4DC820" : "#E8193C" }}
          >
            {post.outcome === "win" ? "Win" : "Loss"}
          </span>
        </div>
      )}

      {/* Body text */}
      {displayText && (
        <p className="text-sm text-foreground leading-relaxed mb-3">
          {isLong && !expanded ? displayText.slice(0, 200) + "…" : displayText}
          {isLong && (
            <button onClick={() => setExpanded(!expanded)} className="text-[#4DC820] font-bold ml-1 hover:underline text-xs">
              {expanded ? "less" : "more"}
            </button>
          )}
        </p>
      )}

      {/* Trade levels for trade_idea */}
      {post.type === "trade_idea" && (post.entry || post.target || post.stop) && (
        <div className="mb-3">
          <button
            onClick={() => setShowLevels(!showLevels)}
            className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            {showLevels ? "▲ Hide levels" : "▼ Show levels"}
          </button>
          <AnimatePresence>
            {showLevels && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-3 gap-2">
                  {post.entry && (
                    <div className="text-center p-2 rounded-lg bg-muted">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">Entry</p>
                      <p className="text-xs font-black text-foreground" style={{ fontFamily: "var(--font-mono)" }}>{post.entry}</p>
                    </div>
                  )}
                  {post.target && (
                    <div className="text-center p-2 rounded-lg" style={{ background: "#EDFBE6" }}>
                      <p className="text-[9px] font-bold uppercase tracking-wide mb-0.5" style={{ color: "#4DC820" }}>Target</p>
                      <p className="text-xs font-black" style={{ color: "#4DC820", fontFamily: "var(--font-mono)" }}>{post.target}</p>
                    </div>
                  )}
                  {post.stop && (
                    <div className="text-center p-2 rounded-lg" style={{ background: "#FEE8EC" }}>
                      <p className="text-[9px] font-bold uppercase tracking-wide mb-0.5" style={{ color: "#E8193C" }}>Stop</p>
                      <p className="text-xs font-black" style={{ color: "#E8193C", fontFamily: "var(--font-mono)" }}>{post.stop}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Reactions row */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {post.reactions.map(r => (
          <button
            key={r.emoji}
            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
            style={{ color: "var(--muted-foreground)" }}
          >
            {r.emoji} {r.count}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={handleToggleComments} className="flex items-center gap-1 text-[11px] transition-colors" style={{ color: showComments ? "#4DC820" : "var(--muted-foreground)" }}>
            <MessageCircle size={12} /> {localComments}
          </button>
          <button onClick={handleReshare} className="flex items-center gap-1 text-[11px] transition-colors" style={{ color: reposted ? "#4DC820" : "var(--muted-foreground)" }}>
            <Repeat2 size={12} /> {localReposts}
          </button>
          <button onClick={handleBookmark} className="transition-colors" style={{ color: bookmarked ? "#4DC820" : "var(--muted-foreground)" }}>
            <Bookmark size={12} fill={bookmarked ? "#4DC820" : "none"} />
          </button>
          <button onClick={handleShare} className="text-muted-foreground hover:text-foreground transition-colors">
            <Share2 size={12} />
          </button>
        </div>
      </div>

      {/* Inline comment thread */}
      <AnimatePresence>
        {showComments && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-2 border-t border-border space-y-2">
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground flex-shrink-0 mt-0.5">Y</div>
                <div className="flex-1 flex gap-1.5">
                  <input
                    type="text"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); } }}
                    placeholder="Add a comment…"
                    className="flex-1 text-xs bg-muted rounded-lg px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground outline-none border border-transparent focus:border-border transition-colors"
                  />
                  {commentText.trim() && (
                    <button onClick={handleSubmitComment} className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg cc-gradient-bg text-[#101828] flex-shrink-0">
                      Post
                    </button>
                  )}
                </div>
              </div>
              {comments.map((c: any) => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mt-0.5" style={{ background: "#4DC820" }}>
                    {(c.user?.name || "T")[0]}
                  </div>
                  <div className="flex-1">
                    <span className="text-[11px] font-bold text-foreground">{c.user?.name || "Trader"} </span>
                    <span className="text-[11px] text-muted-foreground">{c.body}</span>
                  </div>
                </div>
              ))}
              {commentsLoaded && comments.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-1">No comments yet. Be first!</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Compose Bar ──────────────────────────────────────────────────────────────
function ComposeBar({ onPost }: { onPost: (text: string, type: PostType) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [type, setType] = useState<PostType>("market_take");
  const { isAuthenticated } = useAuth();

  const handlePost = () => {
    if (!text.trim()) return;
    onPost(text.trim(), type);
    setText("");
    setOpen(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <p className="text-sm text-muted-foreground text-center">
          <Link href="/sign-in"><span className="text-[#4DC820] font-bold hover:underline cursor-pointer">Sign in</span></Link> to post trade ideas, share P&L, and join the community.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-3 mb-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full text-left text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2.5 hover:bg-muted/80 transition-colors"
        >
          What's your market take today?
        </button>
      ) : (
        <div className="space-y-2">
          {/* Post type selector */}
          <div className="flex gap-1.5 flex-wrap">
            {(Object.entries(POST_TYPE_CONFIG) as [PostType, { label: string; color: string; bg: string }][]).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setType(key)}
                className="text-[10px] font-bold px-2 py-1 rounded-full transition-all"
                style={{
                  background: type === key ? cfg.bg : "var(--muted)",
                  color: type === key ? cfg.color : "var(--muted-foreground)",
                  border: type === key ? `1px solid ${cfg.color}44` : "1px solid transparent",
                }}
              >
                {cfg.label}
              </button>
            ))}
          </div>
          <textarea
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={
              type === "trade_idea" ? "Describe your setup — ticker, entry, target, stop, thesis…" :
              type === "pl_share" ? "Share your P&L — what did you trade and how did it go?" :
              type === "market_take" ? "What's your read on the market right now?" :
              "Ask the community a question…"
            }
            rows={3}
            className="w-full text-sm bg-muted rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none border border-transparent focus:border-border transition-colors resize-none"
          />
          <div className="flex justify-between items-center">
            <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button
              onClick={handlePost}
              disabled={!text.trim()}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg cc-gradient-bg text-[#101828] disabled:opacity-40 transition-opacity"
            >
              <Send size={11} /> Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Discovery Sidebar ────────────────────────────────────────────────────────
// ─── VideoShelfRow ─────────────────────────────────────────────────────────────
// A horizontal scroll row of video cards for a given ticker, shown between ticker sections
function VideoShelfRow({ ticker }: { ticker: string }) {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchContentByTicker(ticker)
      .then(data => { if (!cancelled) { setVideos(data.slice(0, 5)); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ticker]);

  if (!loading && videos.length === 0) return null;

  return (
    <div className="mt-3 mb-1">
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[9px] font-bold text-muted-foreground tracking-widest px-2 flex items-center gap-1">
          <span style={{ color: "#4DC820" }}>▶</span> WATCH: ${ticker}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div
        ref={scrollRef}
        className="flex gap-2.5 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[180px] h-[110px] rounded-lg bg-muted animate-pulse" />
            ))
          : videos.map(v => {
              const n = normalizeContentCard(v);
              return (
                <Link key={n.id} href={`/video/${n.id}`}>
                  <div className="flex-shrink-0 w-[180px] cursor-pointer group/vc">
                    <div className="relative rounded-lg overflow-hidden mb-1.5" style={{ aspectRatio: "16/9" }}>
                      <img
                        src={n.thumbnailUrl || ""}
                        alt={n.title}
                        className="w-full h-full object-cover group-hover/vc:scale-105 transition-transform duration-300"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=60"; }}
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover/vc:bg-black/10 transition-colors" />
                      {n.durationLabel && (
                        <span className="absolute bottom-1 right-1 text-[9px] font-bold text-white bg-black/70 px-1 py-0.5 rounded">
                          {n.durationLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-semibold text-foreground leading-snug line-clamp-2 px-0.5">
                      {n.title}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-0.5 px-0.5">{n.creator_name}</p>
                  </div>
                </Link>
              );
            })}
      </div>
    </div>
  );
}

function DiscoverySidebar({
  topTraders,
  radarTickers,
}: {
  topTraders: any[];
  radarTickers: any[];
}) {
  const TRENDING_TOPICS = [
    { tag: "NVDA Earnings", count: 284, hot: true },
    { tag: "Fed Rate Decision", count: 197, hot: true },
    { tag: "VCP Breakout", count: 143 },
    { tag: "Options Flow", count: 128 },
    { tag: "BTC Halving", count: 112 },
    { tag: "Swing Setups", count: 98 },
  ];

  const ACTIVE_ROOMS = [
    { name: "Day Traders Lounge", members: 142, live: true, color: "#E8193C" },
    { name: "Swing Trading Hub", members: 89, live: true, color: "#00AEEF" },
    { name: "Options Flow Room", members: 67, live: false, color: "#7B2FBE" },
    { name: "Crypto Corner", members: 54, live: true, color: "#F79009" },
  ];

  return (
    <div className="space-y-4">
      {/* Top Traders to Follow */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Users size={14} className="text-[#4DC820]" /> Who to Follow
          </h3>
          <Link href="/discover">
            <span className="text-[10px] font-bold text-[#4DC820] hover:underline cursor-pointer">See all</span>
          </Link>
        </div>
        <div className="space-y-3">
          {topTraders.slice(0, 4).map((trader: any, i: number) => {
            const COLORS = ["#4DC820", "#00AEEF", "#7B2FBE", "#F79009", "#E8193C"];
            const color = COLORS[i % COLORS.length];
            const level = getLevel(trader.xp || 0);
            return (
              <div key={trader.handle || i} className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: color }}>
                  {(trader.display_name || trader.name || "T").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-foreground truncate">{trader.display_name || trader.name || "Trader"}</p>
                    <span className="text-[8px] font-bold px-1 py-0.5 rounded-full text-white flex-shrink-0" style={{ background: level.color }}>
                      {level.name}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{trader.trading_style || "Trader"}</p>
                </div>
                <button className="text-[10px] font-bold px-2 py-1 rounded-full border border-[#4DC820] text-[#4DC820] hover:bg-[#4DC820] hover:text-white transition-colors flex-shrink-0">
                  Follow
                </button>
              </div>
            );
          })}
          {topTraders.length === 0 && (
            <>
              {[
                { name: "Jordan Davis", style: "Swing Trader", xp: 4200 },
                { name: "Alex Kim", style: "Day Trader", xp: 8900 },
                { name: "Sam Rivera", style: "Macro", xp: 12400 },
                { name: "Maya Chen", style: "Crypto", xp: 3100 },
              ].map((t, i) => {
                const COLORS = ["#4DC820", "#00AEEF", "#7B2FBE", "#F79009"];
                const level = getLevel(t.xp);
                return (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: COLORS[i] }}>
                      {t.name.split(" ").map(w => w[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-foreground">{t.name}</p>
                        <span className="text-[8px] font-bold px-1 py-0.5 rounded-full text-white" style={{ background: level.color }}>{level.name}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{t.style}</p>
                    </div>
                    <button className="text-[10px] font-bold px-2 py-1 rounded-full border border-[#4DC820] text-[#4DC820] hover:bg-[#4DC820] hover:text-white transition-colors">Follow</button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Trending Topics */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-3">
          <Hash size={14} className="text-[#7B2FBE]" /> Trending Topics
        </h3>
        <div className="space-y-2">
          {TRENDING_TOPICS.map((topic, i) => (
            <div key={i} className="flex items-center justify-between cursor-pointer hover:bg-muted rounded-lg px-1.5 py-1 -mx-1.5 transition-colors">
              <div className="flex items-center gap-1.5">
                {topic.hot && <Flame size={10} className="text-[#E8193C]" />}
                <span className="text-xs font-semibold text-foreground">#{topic.tag}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{topic.count} posts</span>
            </div>
          ))}
        </div>
      </div>

      {/* Active Rooms */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Activity size={14} className="text-[#E8193C]" /> Active Rooms
          </h3>
          <Link href="/community">
            <span className="text-[10px] font-bold text-[#4DC820] hover:underline cursor-pointer">Browse</span>
          </Link>
        </div>
        <div className="space-y-2">
          {ACTIVE_ROOMS.map((room, i) => (
            <div key={i} className="flex items-center justify-between cursor-pointer hover:bg-muted rounded-lg px-1.5 py-1.5 -mx-1.5 transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: room.live ? "#4DC820" : "#667085" }} />
                <span className="text-xs font-semibold text-foreground">{room.name}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{room.members} online</span>
            </div>
          ))}
        </div>
      </div>

      {/* Kai's Radar (compact) */}
      {radarTickers.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Zap size={14} className="text-[#C8D400]" /> Kai's Radar
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(77,200,32,0.15)", color: "#4DC820" }}>LIVE</span>
            </h3>
            <Link href="/intelligence">
              <span className="text-[10px] font-bold text-[#4DC820] hover:underline cursor-pointer">Full →</span>
            </Link>
          </div>
          <div className="space-y-1.5">
            {radarTickers.slice(0, 5).map((t: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <TickerLogo symbol={t.symbol || t.ticker} size={16} />
                  <span className="text-xs font-black text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                    {t.symbol || t.ticker}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-muted-foreground">{t.timeframe || "swing"}</span>
                  <span className="text-[10px] font-bold" style={{ color: t.direction === "up" ? "#4DC820" : "#E8193C" }}>
                    {t.direction === "up" ? "↑" : "↓"} {t.score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Home Page ───────────────────────────────────────────────────────────
export default function Home() {
  const { theme } = useTheme();
  const [, navigate] = useLocation();
  const tickerRailRef = useRef<HTMLDivElement>(null);

  // Asset class filter
  const { matchesTicker, isAll } = useAssetClass();

  // Feed state
  const [feedTab, setFeedTab] = useState<"for_you" | "trending" | "trade_ideas" | "pl_shares">("for_you");
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  // Live quotes for ticker rail
  const [quotes, setQuotes] = useState<Record<string, { price: number; change_pct: number }>>({});

  // API data
  const { data: radarData } = useApi(fetchRadar, null);
  const { data: leaderboardData } = useApi(fetchLeaderboard, []);

  const allRadarTickers = radarData
    ? [
        ...(radarData.critical || []),
        ...(radarData.high_conviction || []),
        ...(radarData.watch || []),
      ]
    : [];

  // Filter radar tickers by asset class
  const radarTickers = isAll
    ? allRadarTickers
    : allRadarTickers.filter(rt => matchesTicker(rt.symbol || ""));

  const topTraders = Array.isArray(leaderboardData) ? leaderboardData.slice(0, 4) : [];

  // Fetch live quotes when radar tickers load
  useEffect(() => {
    if (allRadarTickers.length === 0) return;
    const symbols = allRadarTickers.slice(0, 15).map((rt: any) => rt.symbol || rt.ticker).filter(Boolean).join(",");
    if (!symbols) return;
    fetchQuotes(symbols).then((data: any[]) => {
      if (Array.isArray(data)) {
        const map: Record<string, { price: number; change_pct: number }> = {};
        data.forEach((q: any) => {
          if (q.symbol) map[q.symbol] = { price: q.price || q.close || 0, change_pct: q.change_pct || 0 };
        });
        setQuotes(map);
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRadarTickers.length]);

  // Load live feed
  useEffect(() => {
    setFeedLoading(true);
    const tabMap: Record<string, string> = {
      for_you: "discover",
      trending: "trending",
      trade_ideas: "trade_ideas",
      pl_shares: "pl_shares",
    };
    fetchFeed(tabMap[feedTab] || "discover").then((data: any[]) => {
      if (Array.isArray(data) && data.length > 0) {
        const mapped: Post[] = data.map((p: any) => ({
          id: p.id || String(Math.random()),
          type: (p.post_type || p.type || "market_take") as PostType,
          user: {
            name: p.user?.display_name || p.user?.name || "Trader",
            handle: `@${p.user?.handle || "trader"}`,
            initials: (p.user?.display_name || p.user?.name || "T").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
            color: "#4DC820",
            style: p.user?.trading_style || "Trader",
            level: getLevel(p.user?.xp || 0).name,
            levelColor: getLevel(p.user?.xp || 0).color,
            xp: p.user?.xp || 0,
            assetClass: p.user?.asset_class || "Stocks",
          },
          timestamp: p.created_at ? new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "now",
          sentiment: p.sentiment,
          ticker: p.ticker,
          timeframe: p.timeframe,
          entry: p.entry_price ? `$${p.entry_price}` : undefined,
          target: p.target_price ? `$${p.target_price}` : undefined,
          stop: p.stop_price ? `$${p.stop_price}` : undefined,
          text: p.body || p.text,
          thesis: p.thesis,
          outcome: p.outcome,
          pnl: p.pnl,
          reactions: p.reactions || [{ emoji: "🔥", label: "Bullish", count: p.likes || 0 }],
          comments: p.comment_count || p.comments || 0,
          reposts: p.repost_count || p.reposts || 0,
        }));
        setPosts(mapped);
      }
    }).catch(() => {}).finally(() => setFeedLoading(false));
  }, [feedTab]);

  const handleNewPost = (text: string, type: PostType) => {
    const newPost: Post = {
      id: Date.now().toString(),
      type,
      user: { name: "You", handle: "@you", initials: "Y", color: "#4DC820", style: "Trader", level: "Rookie", levelColor: "#667085" },
      timestamp: "now",
      text,
      reactions: [{ emoji: "🔥", label: "Bullish", count: 0 }],
      comments: 0,
      reposts: 0,
    };
    setPosts(prev => [newPost, ...prev]);
    createPost({ body: text, post_type: type }).catch(() => {});
    toast.success(`Posted! +${type === "trade_idea" ? "25" : type === "pl_share" ? "20" : "10"} XP`);
  };

  const handleTickerClick = (ticker: string) => {
    navigate(`/tickers/${ticker}`);
  };

  const scrollTickers = (dir: "left" | "right") => {
    if (tickerRailRef.current) {
      tickerRailRef.current.scrollBy({ left: dir === "right" ? 300 : -300, behavior: "smooth" });
    }
  };

  const FEED_TABS = [
    { id: "for_you" as const, label: "For You" },
    { id: "trending" as const, label: "Trending" },
    { id: "trade_ideas" as const, label: "Trade Ideas" },
    { id: "pl_shares" as const, label: "P&L" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Nav />

      <div className="max-w-7xl mx-auto px-4 py-4">

        {/* ── Trending Tickers Rail ─────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Flame size={14} className="text-[#E8193C]" />
              Trending Tickers
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(77,200,32,0.15)", color: "#4DC820" }}>
                COMMUNITY SENTIMENT
              </span>
            </h2>
            <div className="flex items-center gap-1.5">
              <button onClick={() => scrollTickers("left")} className="w-6 h-6 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                <ChevronLeft size={12} className="text-muted-foreground" />
              </button>
              <button onClick={() => scrollTickers("right")} className="w-6 h-6 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                <ChevronRight size={12} className="text-muted-foreground" />
              </button>
            </div>
          </div>
          <div
            ref={tickerRailRef}
            className="flex gap-3 overflow-x-auto pb-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {radarTickers.length === 0 && !radarData && (
              Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-48 h-[140px] rounded-xl bg-muted animate-pulse" />
              ))
            )}
            {(radarTickers.length > 0
              ? radarTickers.map(rt => {
                  const q = quotes[rt.symbol];
                  return {
                    symbol: rt.symbol,
                    price: q?.price ?? 0,
                    change_pct: q?.change_pct ?? 0,
                    bullish_pct: rt.direction === "bullish" ? Math.round(60 + Math.random() * 25) : rt.direction === "bearish" ? Math.round(15 + Math.random() * 30) : 50,
                    post_count: Math.round(rt.score * 1.5),
                    top_traders: [],
                  } as TickerSocialCard;
                })
              : TRENDING_TICKERS
            ).map(ticker => (
              <TickerSocialCardItem
                key={ticker.symbol}
                ticker={ticker}
                onClick={() => handleTickerClick(ticker.symbol)}
              />
            ))}
          </div>
        </div>

        {/* ── Main 2-col Layout ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

          {/* Left: Community Feed */}
          <div>
            {/* Compose bar */}
            <ComposeBar onPost={handleNewPost} />

            {/* Feed filter tabs */}
            <div className="flex items-center gap-1 mb-4 border-b border-border">
              {FEED_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFeedTab(tab.id)}
                  className="px-3 py-2 text-xs font-bold transition-colors relative"
                  style={{ color: feedTab === tab.id ? "#4DC820" : "var(--muted-foreground)" }}
                >
                  {tab.label}
                  {feedTab === tab.id && (
                    <motion.div
                      layoutId="feedTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                      style={{ background: "#4DC820" }}
                    />
                  )}
                </button>
              ))}
              <Link href="/community" className="ml-auto">
                <span className="text-[10px] font-bold text-[#4DC820] hover:underline cursor-pointer flex items-center gap-0.5 pb-2">
                  Full Feed <ArrowUpRight size={10} />
                </span>
              </Link>
            </div>

            {/* Ticker-Discovery Feed */}
            {feedLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
                    <div className="flex gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-muted" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-muted rounded w-1/3" />
                        <div className="h-2.5 bg-muted rounded w-1/4" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-4/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-0">
                {/* Ticker focus sections — each trending ticker gets a block */}
                {radarTickers.slice(0, 4).map((rt, idx) => {
                  const tickerPosts = posts.filter(p => p.ticker === rt.symbol).slice(0, 2);
                  const generalPosts = posts.filter(p => !p.ticker);
                  const displayPosts = tickerPosts.length > 0 ? tickerPosts : generalPosts.slice(idx * 2, idx * 2 + 2);
                  const q = quotes[rt.symbol];
                  const isUp = (q?.change_pct ?? 0) >= 0;
                  return (
                    <div key={rt.symbol} className="mb-5">
                      {/* Ticker focus header */}
                      <button
                        onClick={() => handleTickerClick(rt.symbol)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-border bg-card/60 hover:bg-card transition-colors mb-2 group"
                      >
                        <div className="flex items-center gap-2.5">
                          <TickerLogo symbol={rt.symbol} size={22} />
                          <div className="text-left">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-black text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                                {rt.symbol}
                              </span>
                              {q && (
                                <span
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                  style={{
                                    color: isUp ? "#4DC820" : "#E8193C",
                                    background: isUp ? "rgba(77,200,32,0.12)" : "rgba(232,25,60,0.12)",
                                  }}
                                >
                                  {isUp ? "+" : ""}{q.change_pct.toFixed(2)}%
                                </span>
                              )}
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{
                                  background: rt.direction === "bullish" ? "rgba(77,200,32,0.15)" : rt.direction === "bearish" ? "rgba(232,25,60,0.15)" : "rgba(247,144,9,0.15)",
                                  color: rt.direction === "bullish" ? "#4DC820" : rt.direction === "bearish" ? "#E8193C" : "#F79009",
                                }}
                              >
                                KAI: {(rt.direction ?? "NEUTRAL").toUpperCase()}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">{rt.timeframe} · {Math.round(rt.score * 1.5)} community posts</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <MiniSparkline symbol={rt.symbol} width={72} height={32} />
                          <span className="text-[10px] font-bold text-[#4DC820] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                            View <ArrowUpRight size={10} />
                          </span>
                        </div>
                      </button>
                      {/* Posts for this ticker */}
                      <div className="space-y-2 pl-1">
                        {displayPosts.length > 0 ? (
                          displayPosts.map(post => (
                            <SocialPostCard
                              key={post.id}
                              post={post}
                              onTickerClick={handleTickerClick}
                            />
                          ))
                        ) : (
                          <div className="text-center py-3 text-xs text-muted-foreground">
                            No posts yet for ${rt.symbol} —{" "}
                            <button
                              onClick={() => handleTickerClick(rt.symbol)}
                              className="text-[#4DC820] hover:underline"
                            >
                              be the first
                            </button>
                          </div>
                        )}
                      </div>
                      {/* Video shelf every 2 tickers */}
                      {idx % 2 === 1 && (
                        <VideoShelfRow ticker={rt.symbol} />
                      )}
                    </div>
                  );
                })}
                {/* Remaining general posts */}
                {posts.slice(8).length > 0 && (
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[10px] font-bold text-muted-foreground px-2">MORE FROM THE COMMUNITY</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    {posts.slice(8).map(post => (
                      <SocialPostCard
                        key={post.id}
                        post={post}
                        onTickerClick={handleTickerClick}
                      />
                    ))}
                  </div>
                )}
                <div className="text-center pt-4">
                  <Link href="/community">
                    <button className="text-xs font-bold text-[#4DC820] hover:underline flex items-center gap-1 mx-auto">
                      See full community feed <ArrowUpRight size={11} />
                    </button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Right: Discovery Sidebar */}
          <div className="hidden lg:block">
            <DiscoverySidebar topTraders={topTraders} radarTickers={radarTickers} />
          </div>
        </div>
      </div>

      <KaiChat />
    </div>
  );
}
