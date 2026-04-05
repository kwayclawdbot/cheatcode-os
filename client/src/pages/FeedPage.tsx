/**
 * CheatCode OS — Social Feed Page
 * Design: Clean white/dark card feed, left-border accent per sentiment,
 * 4 post types: Trade Idea, P&L Share, Market Take, Chart Post.
 * Composer modal, feed tabs, XP toast on post.
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Minus, Heart, MessageCircle, Repeat2,
  Bookmark, Share2, Plus, X, ChevronDown, Image, BarChart2,
  Upload, Flame, Radio, Clock, Search, Filter
} from "lucide-react";
import { toast } from "sonner";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";

// ─── Types ────────────────────────────────────────────────────────────────────

type PostType = "trade_idea" | "pl_share" | "market_take" | "chart_post";
type Sentiment = "bullish" | "bearish" | "neutral";
type FeedTab = "following" | "discover" | "trending" | "live";

interface Post {
  id: string;
  type: PostType;
  user: {
    name: string;
    handle: string;
    avatar: string;
    style: string;
    level: string;
    levelColor: string;
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
  image?: string;
  text?: string;
  outcome?: "win" | "loss" | "open";
  winRate?: number;
  likes: number;
  comments: number;
  reposts: number;
  liked?: boolean;
  bookmarked?: boolean;
}

// ─── Mock Feed Data ───────────────────────────────────────────────────────────

const MOCK_POSTS: Post[] = [
  {
    id: "1",
    type: "trade_idea",
    user: {
      name: "Mark Minervini",
      handle: "@minervini",
      avatar: "https://cdn.manus.im/webdev/cheatcode-os/creators/minervini.jpg",
      style: "Swing Trader",
      level: "Legend",
      levelColor: "#4DC820",
      verified: true,
    },
    timestamp: "2h ago",
    sentiment: "bullish",
    ticker: "NVDA",
    timeframe: "Swing",
    entry: "$875–$890",
    target: "$960",
    stop: "$845",
    thesis: "NVDA forming a textbook VCP on the weekly. Volume contraction is tight. Watching for a high-tight flag breakout above $890 on volume 2x average. AI infrastructure cycle still intact.",
    outcome: "open",
    likes: 284,
    comments: 47,
    reposts: 63,
    liked: false,
    bookmarked: false,
  },
  {
    id: "2",
    type: "pl_share",
    user: {
      name: "Humbled Trader",
      handle: "@humbledtrader",
      avatar: "https://cdn.manus.im/webdev/cheatcode-os/creators/humbled_trader.jpg",
      style: "Day Trader",
      level: "Elite",
      levelColor: "#F79009",
      verified: true,
    },
    timestamp: "4h ago",
    sentiment: "bullish",
    ticker: "TSLA",
    text: "Finally got the TSLA morning breakout I've been waiting for. Clean entry on the 5-min ORB, held through the first pullback. +$2,847 on the day. Patience pays.",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80",
    outcome: "win",
    likes: 512,
    comments: 89,
    reposts: 124,
    liked: true,
    bookmarked: false,
  },
  {
    id: "3",
    type: "market_take",
    user: {
      name: "SMB Capital",
      handle: "@smbcapital",
      avatar: "https://cdn.manus.im/webdev/cheatcode-os/creators/smb_capital.jpg",
      style: "Day Trader",
      level: "Elite",
      levelColor: "#F79009",
    },
    timestamp: "5h ago",
    sentiment: "bearish",
    ticker: "SPY",
    text: "Tariff headlines are back. Market structure is broken on the daily. Until we reclaim 520 on SPY with conviction, I'm playing defense. Cash is a position. Don't be a hero.",
    likes: 341,
    comments: 72,
    reposts: 98,
    liked: false,
    bookmarked: true,
  },
  {
    id: "4",
    type: "trade_idea",
    user: {
      name: "tastytrade",
      handle: "@tastytrade",
      avatar: "https://cdn.manus.im/webdev/cheatcode-os/creators/tastytrade.jpg",
      style: "Income Trader",
      level: "Legend",
      levelColor: "#4DC820",
      verified: true,
    },
    timestamp: "6h ago",
    sentiment: "neutral",
    ticker: "AAPL",
    timeframe: "Income",
    entry: "Sell $175 Put / Buy $170 Put",
    target: "Full premium ($1.85 credit)",
    stop: "2x credit received",
    thesis: "AAPL IV rank at 42 — elevated enough to sell premium. Defined risk put spread below key support. Theta decay plays in our favor into earnings. Probability of profit: 72%.",
    outcome: "open",
    likes: 198,
    comments: 34,
    reposts: 51,
    liked: false,
    bookmarked: false,
  },
  {
    id: "5",
    type: "chart_post",
    user: {
      name: "Real Vision",
      handle: "@realvision",
      avatar: "https://cdn.manus.im/webdev/cheatcode-os/creators/real_vision.jpg",
      style: "Investor",
      level: "Elite",
      levelColor: "#F79009",
    },
    timestamp: "8h ago",
    sentiment: "bearish",
    ticker: "DXY",
    text: "Dollar index breaking down from a 6-month distribution top. If DXY loses 102, expect a significant rotation into commodities, EM equities, and gold. This is the macro setup of 2026.",
    image: "https://images.unsplash.com/photo-1642790551116-18e150f248e3?w=600&q=80",
    likes: 427,
    comments: 93,
    reposts: 187,
    liked: false,
    bookmarked: false,
  },
  {
    id: "6",
    type: "market_take",
    user: {
      name: "Macro Voices",
      handle: "@macrovoices",
      avatar: "https://cdn.manus.im/webdev/cheatcode-os/creators/macro_voices.jpg",
      style: "Investor",
      level: "Veteran",
      levelColor: "#7B2FBE",
    },
    timestamp: "10h ago",
    sentiment: "bullish",
    ticker: "GLD",
    text: "Gold is the only asset that has worked this year. Central banks are buying at record pace. The debasement trade is not over. $3,000 was a floor, not a ceiling.",
    likes: 263,
    comments: 58,
    reposts: 112,
    liked: false,
    bookmarked: false,
  },
];

// ─── Sentiment Config ─────────────────────────────────────────────────────────

const SENTIMENT_CONFIG = {
  bullish: { color: "#4DC820", bg: "#EDFBE6", label: "Bullish", icon: TrendingUp, border: "#4DC820" },
  bearish: { color: "#E8193C", bg: "#FEE8EC", label: "Bearish", icon: TrendingDown, border: "#E8193C" },
  neutral: { color: "#F79009", bg: "#FEF3E2", label: "Neutral", icon: Minus, border: "#F79009" },
};

const POST_TYPE_CONFIG = {
  trade_idea: { label: "Trade Idea", color: "#00AEEF", bg: "#E6F7FD" },
  pl_share: { label: "P&L Share", color: "#4DC820", bg: "#EDFBE6" },
  market_take: { label: "Market Take", color: "#7B2FBE", bg: "#F3E8FF" },
  chart_post: { label: "Chart Post", color: "#F79009", bg: "#FEF3E2" },
};

const OUTCOME_CONFIG = {
  win: { label: "✅ Win", color: "#4DC820", bg: "#EDFBE6" },
  loss: { label: "❌ Loss", color: "#E8193C", bg: "#FEE8EC" },
  open: { label: "⏳ Open", color: "#F79009", bg: "#FEF3E2" },
};

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post, onLike, onBookmark }: {
  post: Post;
  onLike: (id: string) => void;
  onBookmark: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sentiment = post.sentiment ? SENTIMENT_CONFIG[post.sentiment] : null;
  const typeConfig = POST_TYPE_CONFIG[post.type];
  const SentimentIcon = sentiment?.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border overflow-hidden"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        borderLeft: sentiment ? `3px solid ${sentiment.border}` : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <Link href={`/creators/${post.user.handle.replace("@", "")}`}>
          <img
            src={post.user.avatar}
            alt={post.user.name}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-[#4DC820] ring-offset-1"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/creators/${post.user.handle.replace("@", "")}`}>
              <span className="font-bold text-sm cursor-pointer hover:underline" style={{ color: "var(--foreground)" }}>
                {post.user.name}
              </span>
            </Link>
            {post.user.verified && <span className="text-[#00AEEF] text-xs">✓</span>}
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: post.user.levelColor, color: "#fff" }}
            >
              {post.user.level}
            </span>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
            >
              {post.user.style}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{post.user.handle}</span>
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>· {post.timestamp}</span>
          </div>
        </div>
        {/* Post type pill */}
        <span
          className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: typeConfig.bg, color: typeConfig.color }}
        >
          {typeConfig.label}
        </span>
      </div>

      {/* Trade Idea body */}
      {post.type === "trade_idea" && (
        <div className="px-4 pb-3">
          {/* Ticker + sentiment header */}
          <div className="flex items-center gap-2 mb-3">
            <span className="font-black text-xl" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--foreground)" }}>
              {post.ticker}
            </span>
            {sentiment && SentimentIcon && (
              <span
                className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: sentiment.bg, color: sentiment.color }}
              >
                <SentimentIcon size={12} /> {sentiment.label}
              </span>
            )}
            {post.timeframe && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
                {post.timeframe}
              </span>
            )}
            {post.outcome && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full ml-auto"
                style={{ background: OUTCOME_CONFIG[post.outcome].bg, color: OUTCOME_CONFIG[post.outcome].color }}
              >
                {OUTCOME_CONFIG[post.outcome].label}
              </span>
            )}
          </div>

          {/* Trade levels */}
          {(post.entry || post.target || post.stop) && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {post.entry && (
                <div className="p-2 rounded-xl text-center" style={{ background: "var(--muted)" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>Entry</p>
                  <p className="text-xs font-bold mt-0.5" style={{ color: "var(--foreground)" }}>{post.entry}</p>
                </div>
              )}
              {post.target && (
                <div className="p-2 rounded-xl text-center" style={{ background: "#EDFBE6" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#2D8A14" }}>Target</p>
                  <p className="text-xs font-bold mt-0.5" style={{ color: "#1A5C0A" }}>{post.target}</p>
                </div>
              )}
              {post.stop && (
                <div className="p-2 rounded-xl text-center" style={{ background: "#FEE8EC" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#C01028" }}>Stop</p>
                  <p className="text-xs font-bold mt-0.5" style={{ color: "#9B0C1E" }}>{post.stop}</p>
                </div>
              )}
            </div>
          )}

          {/* Thesis */}
          {post.thesis && (
            <div>
              <p
                className="text-sm leading-relaxed"
                style={{
                  color: "var(--foreground)",
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: expanded ? undefined : 3,
                  WebkitBoxOrient: "vertical",
                } as React.CSSProperties}
              >
                {post.thesis}
              </p>
              {post.thesis.length > 120 && (
                <button
                  onClick={() => setExpanded(e => !e)}
                  className="text-xs font-semibold mt-1 flex items-center gap-1"
                  style={{ color: "#00AEEF" }}
                >
                  {expanded ? "Show less" : "Read more"} <ChevronDown size={12} style={{ transform: expanded ? "rotate(180deg)" : undefined }} />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* P&L Share / Chart Post body */}
      {(post.type === "pl_share" || post.type === "chart_post") && (
        <div className="px-4 pb-3">
          {post.ticker && (
            <div className="flex items-center gap-2 mb-2">
              <span className="font-black text-lg" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--foreground)" }}>
                {post.ticker}
              </span>
              {sentiment && SentimentIcon && (
                <span
                  className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: sentiment.bg, color: sentiment.color }}
                >
                  <SentimentIcon size={11} /> {sentiment.label}
                </span>
              )}
              {post.outcome && (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full ml-auto"
                  style={{ background: OUTCOME_CONFIG[post.outcome].bg, color: OUTCOME_CONFIG[post.outcome].color }}
                >
                  {OUTCOME_CONFIG[post.outcome].label}
                </span>
              )}
            </div>
          )}
          {post.text && (
            <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--foreground)" }}>{post.text}</p>
          )}
          {post.image && (
            <img
              src={post.image}
              alt="Trade screenshot"
              className="w-full rounded-xl object-cover"
              style={{ maxHeight: 280 }}
            />
          )}
        </div>
      )}

      {/* Market Take body */}
      {post.type === "market_take" && (
        <div className="px-4 pb-3">
          {post.ticker && (
            <div className="flex items-center gap-2 mb-2">
              <span className="font-black text-lg" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--foreground)" }}>
                ${post.ticker}
              </span>
              {sentiment && SentimentIcon && (
                <span
                  className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: sentiment.bg, color: sentiment.color }}
                >
                  <SentimentIcon size={11} /> {sentiment.label}
                </span>
              )}
            </div>
          )}
          <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>{post.text}</p>
        </div>
      )}

      {/* Engagement bar */}
      <div
        className="flex items-center gap-1 px-4 py-3 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <button
          onClick={() => onLike(post.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-red-50"
          style={{ color: post.liked ? "#E8193C" : "var(--muted-foreground)" }}
        >
          <Heart size={14} fill={post.liked ? "#E8193C" : "none"} />
          {post.likes + (post.liked ? 1 : 0)}
        </button>
        <button
          onClick={() => toast.info("Comments coming soon")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-blue-50"
          style={{ color: "var(--muted-foreground)" }}
        >
          <MessageCircle size={14} />
          {post.comments}
        </button>
        <button
          onClick={() => toast.success("+10 XP — Reposted!")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-green-50"
          style={{ color: "var(--muted-foreground)" }}
        >
          <Repeat2 size={14} />
          {post.reposts}
        </button>
        <div className="flex-1" />
        <button
          onClick={() => onBookmark(post.id)}
          className="p-1.5 rounded-lg transition-all"
          style={{ color: post.bookmarked ? "#00AEEF" : "var(--muted-foreground)" }}
        >
          <Bookmark size={14} fill={post.bookmarked ? "#00AEEF" : "none"} />
        </button>
        <button
          onClick={() => toast.success("Link copied!")}
          className="p-1.5 rounded-lg transition-all"
          style={{ color: "var(--muted-foreground)" }}
        >
          <Share2 size={14} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Composer Modal ───────────────────────────────────────────────────────────

function ComposerModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<PostType | null>(null);
  const [sentiment, setSentiment] = useState<Sentiment>("bullish");
  const [ticker, setTicker] = useState("");
  const [text, setText] = useState("");
  const [entry, setEntry] = useState("");
  const [target, setTarget] = useState("");
  const [stop, setStop] = useState("");
  const [timeframe, setTimeframe] = useState("Swing");

  const handlePost = () => {
    if (!type) return;
    toast.success(`+${type === "trade_idea" ? 25 : type === "pl_share" ? 20 : 10} XP — Post published! 🎉`);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="w-full max-w-lg rounded-3xl overflow-hidden"
        style={{ background: "var(--card)", maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 className="font-bold text-base" style={{ fontFamily: "Sora, sans-serif", color: "var(--foreground)" }}>
            New Post
          </h3>
          <button onClick={onClose} style={{ color: "var(--muted-foreground)" }}>
            <X size={20} />
          </button>
        </div>

        {/* Type selector */}
        {!type ? (
          <div className="p-5">
            <p className="text-sm font-semibold mb-4" style={{ color: "var(--muted-foreground)" }}>What are you sharing?</p>
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(POST_TYPE_CONFIG) as [PostType, typeof POST_TYPE_CONFIG[PostType]][]).map(([id, config]) => (
                <button
                  key={id}
                  onClick={() => setType(id)}
                  className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 gap-2 transition-all hover:border-current"
                  style={{ borderColor: "var(--border)", background: "var(--muted)" }}
                >
                  <span className="text-2xl">
                    {id === "trade_idea" ? "📈" : id === "pl_share" ? "💰" : id === "market_take" ? "💬" : "📊"}
                  </span>
                  <span className="text-sm font-bold" style={{ color: config.color }}>{config.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-5 flex flex-col gap-4">
            {/* Back to type */}
            <button
              onClick={() => setType(null)}
              className="text-xs font-semibold flex items-center gap-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              ← Change type
            </button>

            {/* Ticker input */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                Ticker
              </label>
              <input
                type="text"
                placeholder="e.g. NVDA"
                value={ticker}
                onChange={e => setTicker(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none"
                style={{
                  background: "var(--background)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              />
            </div>

            {/* Sentiment */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                Sentiment
              </label>
              <div className="flex gap-2">
                {(["bullish", "bearish", "neutral"] as Sentiment[]).map(s => {
                  const cfg = SENTIMENT_CONFIG[s];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={s}
                      onClick={() => setSentiment(s)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border-2 transition-all"
                      style={{
                        borderColor: sentiment === s ? cfg.color : "var(--border)",
                        background: sentiment === s ? cfg.bg : "var(--muted)",
                        color: sentiment === s ? cfg.color : "var(--muted-foreground)",
                      }}
                    >
                      <Icon size={13} /> {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trade Idea specific fields */}
            {type === "trade_idea" && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Entry", value: entry, set: setEntry, placeholder: "$875" },
                    { label: "Target", value: target, set: setTarget, placeholder: "$960" },
                    { label: "Stop", value: stop, set: setStop, placeholder: "$845" },
                  ].map(field => (
                    <div key={field.label}>
                      <label className="text-xs font-semibold uppercase tracking-wide block mb-1" style={{ color: "var(--muted-foreground)" }}>
                        {field.label}
                      </label>
                      <input
                        type="text"
                        placeholder={field.placeholder}
                        value={field.value}
                        onChange={e => field.set(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border text-xs outline-none"
                        style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                    Timeframe
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {["Day", "Swing", "Position", "Income", "Long-term"].map(tf => (
                      <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                        style={{
                          borderColor: timeframe === tf ? "#00AEEF" : "var(--border)",
                          background: timeframe === tf ? "#E6F7FD" : "var(--muted)",
                          color: timeframe === tf ? "#00AEEF" : "var(--muted-foreground)",
                        }}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Text area */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                {type === "trade_idea" ? "Your Thesis" : type === "market_take" ? "Your Take" : "Caption"}
              </label>
              <textarea
                placeholder={
                  type === "trade_idea"
                    ? "Why are you taking this trade? What's your setup?"
                    : type === "market_take"
                    ? "What's your read on the market right now?"
                    : "Add a caption..."
                }
                value={text}
                onChange={e => setText(e.target.value)}
                maxLength={500}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none"
                style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
              />
              <p className="text-xs text-right mt-1" style={{ color: "var(--muted-foreground)" }}>{text.length}/500</p>
            </div>

            {/* Image upload (P&L and Chart types) */}
            {(type === "pl_share" || type === "chart_post") && (
              <button
                onClick={() => toast.info("Image upload coming soon")}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl border-2 border-dashed text-sm font-semibold transition-all"
                style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
              >
                <Upload size={16} /> Upload Screenshot
              </button>
            )}

            {/* Post CTA */}
            <button
              onClick={handlePost}
              disabled={!ticker && !text}
              className="w-full py-4 rounded-xl font-bold text-sm transition-all"
              style={{
                background: !ticker && !text ? "var(--muted)" : "linear-gradient(135deg, #4DC820, #C8D400)",
                color: !ticker && !text ? "var(--muted-foreground)" : "#101828",
              }}
            >
              Post · Earn +{type === "trade_idea" ? 25 : type === "pl_share" ? 20 : 10} XP
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Feed Tabs ────────────────────────────────────────────────────────────────

const FEED_TABS: { id: FeedTab; label: string; icon: React.ElementType }[] = [
  { id: "following", label: "Following", icon: TrendingUp },
  { id: "discover", label: "Discover", icon: Search },
  { id: "trending", label: "Trending", icon: Flame },
  { id: "live", label: "Live Now", icon: Radio },
];

// ─── Main Feed Page ───────────────────────────────────────────────────────────

export default function FeedPage() {
  const [activeTab, setActiveTab] = useState<FeedTab>("discover");
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);
  const [composerOpen, setComposerOpen] = useState(false);

  // Fetch live feed, fallback to mock
  useEffect(() => {
    import("@/lib/api").then(({ fetchFeed }) => {
      fetchFeed(activeTab).then((data: any[]) => {
        if (data?.length) {
          setPosts(data.map((p: any) => ({
            id: p.id,
            type: p.post_type || "market_take",
            user: p.user || { name: "Trader", handle: "", avatar: "", style: "", level: "Rookie", levelColor: "#667085" },
            timestamp: p.created_at ? new Date(p.created_at).toLocaleDateString() : "Just now",
            sentiment: p.sentiment,
            ticker: p.ticker,
            timeframe: p.timeframe,
            entry: p.entry_price,
            target: p.target_price,
            stop: p.stop_price,
            thesis: p.thesis,
            text: p.body,
            image: p.image_url,
            likes: p.likes_count || 0,
            comments: p.comments_count || 0,
            reposts: p.reposts_count || 0,
            liked: p.user_liked || false,
            bookmarked: p.user_bookmarked || false,
          })));
        }
      }).catch(() => {});
    });
  }, [activeTab]);

  const handleLike = (id: string) => {
    setPosts(ps => ps.map(p => p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p));
    import("@/lib/api").then(({ likePost, unlikePost }) => {
      const post = posts.find(p => p.id === id);
      if (post?.liked) unlikePost(id).catch(() => {});
      else likePost(id).catch(() => {});
    });
  };

  const handleBookmark = (id: string) => {
    setPosts(ps => ps.map(p => p.id === id ? { ...p, bookmarked: !p.bookmarked } : p));
    import("@/lib/api").then(({ bookmarkPost }) => bookmarkPost(id).catch(() => {}));
    toast.success("Saved to bookmarks");
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Nav />

      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        {/* Page header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-black" style={{ fontFamily: "Sora, sans-serif", color: "var(--foreground)" }}>
            Feed
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toast.info("Filter coming soon")}
              className="p-2 rounded-xl border"
              style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
            >
              <Filter size={16} />
            </button>
            <button
              onClick={() => setComposerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #4DC820, #C8D400)", color: "#101828" }}
            >
              <Plus size={16} /> Post
            </button>
          </div>
        </div>

        {/* Feed tabs */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: "var(--muted)" }}>
          {FEED_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: isActive ? "var(--card)" : "transparent",
                  color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
                  boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.1)" : undefined,
                }}
              >
                {tab.id === "live" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                )}
                <Icon size={13} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Feed content */}
        {activeTab === "live" ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🔴</div>
            <p className="font-bold text-lg mb-1" style={{ color: "var(--foreground)" }}>No one is live right now</p>
            <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>
              Live streaming is coming soon for Pro & Elite members.
            </p>
            <button
              onClick={() => toast.info("Live streaming via 100ms — coming in Phase 2")}
              className="px-6 py-3 rounded-xl font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #4DC820, #C8D400)", color: "#101828" }}
            >
              Get notified when it launches
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {posts.map(post => (
              <PostCard key={post.id} post={post} onLike={handleLike} onBookmark={handleBookmark} />
            ))}

            {/* Load more */}
            <button
              onClick={() => toast.info("Fetching more posts...")}
              className="w-full py-3 rounded-xl text-sm font-semibold border"
              style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
            >
              Load more posts
            </button>
          </div>
        )}
      </div>

      {/* Floating compose button (mobile) */}
      <button
        onClick={() => setComposerOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-xl sm:hidden z-40"
        style={{ background: "linear-gradient(135deg, #4DC820, #C8D400)" }}
      >
        <Plus size={24} color="#101828" />
      </button>

      {/* Composer modal */}
      <AnimatePresence>
        {composerOpen && <ComposerModal onClose={() => setComposerOpen(false)} />}
      </AnimatePresence>

      <KaiChat />
    </div>
  );
}
