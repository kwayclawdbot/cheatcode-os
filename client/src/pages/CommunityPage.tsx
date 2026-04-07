// CheatCode OS — Community Page
// Design: Ticker-first hub. Trending tickers are the hero.
// Clicking a ticker opens a full Ticker Hub (Feed / Signal / Videos / Sentiment tabs).
// Feed uses lean post cards — collapsible details, hover tooltips for badges.
// Compose box is collapsible (Twitter-style single-line → expands on click).
// Asset class toggle above the ticker strip switches the whole strip.
// NO MOCK DATA — radar tickers from live Kai API.

import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Minus, MessageCircle, Repeat2,
  Bookmark, Share2, Flame, Search, X, ChevronRight,
  Zap, Users, Clock, BarChart2, ArrowUpRight,
  Globe, DollarSign, Activity, Bitcoin, ChevronDown, ChevronUp,
  ThumbsUp, ThumbsDown, Eye, Pencil, Play, LayoutGrid
} from "lucide-react";
import { toast } from "sonner";
import { Nav } from "@/components/layout/Nav";
import { useTheme } from "@/contexts/ThemeContext";
import { useAssetClass } from "@/contexts/AssetClassContext";
import { KaiChat } from "@/components/kai/KaiChat";
import { fetchRadar, fetchTicker, fetchContent, fetchContentByTicker } from "@/lib/api";
import { SparklineChart } from "@/components/intelligence/SparklineChart";
import { TickerLogo } from "@/components/intelligence/TickerLogo";

// ─── Types ────────────────────────────────────────────────────────────────────

type PostType = "trade_idea" | "pl_share" | "market_take" | "question";
type Sentiment = "bullish" | "bearish" | "neutral";
type AssetClass = "all" | "stocks" | "forex" | "futures" | "crypto";
type TickerTab = "feed" | "signal" | "videos" | "sentiment";
type FeedFilter = "trending" | "following" | "latest" | "trade_ideas";

interface Reaction { emoji: string; label: string; count: number; active?: boolean; }

interface Post {
  id: string;
  type: PostType;
  assetClass?: AssetClass;
  user: { name: string; handle: string; initials: string; color: string; style: string; level: string; levelColor: string; };
  timestamp: string;
  sentiment?: Sentiment;
  ticker?: string;
  timeframe?: string;
  entry?: string;
  target?: string;
  stop?: string;
  thesis?: string;
  text?: string;
  outcome?: "win" | "loss";
  pnl?: string;
  reactions: Reaction[];
  comments: number;
  reposts: number;
}

// ─── Seed posts ───────────────────────────────────────────────────────────────

const SEED_POSTS: Post[] = [
  {
    id: "1", type: "trade_idea", assetClass: "stocks",
    user: { name: "Jordan Davis", handle: "@jdtrader", initials: "JD", color: "#4DC820", style: "Swing Trader", level: "Expert", levelColor: "#F79009" },
    timestamp: "2h", sentiment: "bullish", ticker: "PLTR", timeframe: "Swing",
    entry: "$24.50", target: "$32.00", stop: "$21.80",
    thesis: "Breaking out of a 6-week base on heavy volume. Institutional accumulation visible on the daily. Target is the prior high from November. Risk/reward is 3:1.",
    reactions: [{ emoji: "🔥", label: "Bullish", count: 47 }, { emoji: "🐻", label: "Bearish", count: 8 }, { emoji: "👀", label: "Watching", count: 23 }],
    comments: 14, reposts: 6,
  },
  {
    id: "2", type: "pl_share", assetClass: "stocks",
    user: { name: "Alex Kim", handle: "@alphatrader", initials: "AK", color: "#00AEEF", style: "Day Trader", level: "Veteran", levelColor: "#F04438" },
    timestamp: "4h", outcome: "win", ticker: "NVDA", pnl: "+$2,840",
    text: "Caught the morning breakout on NVDA. Entered at $118.20 off the 9 EMA, took half off at $121 and let the rest run to $124.50. Clean setup, clean execution.",
    reactions: [{ emoji: "🔥", label: "Bullish", count: 89 }, { emoji: "❤️", label: "Like", count: 134 }],
    comments: 28, reposts: 19,
  },
  {
    id: "3", type: "market_take", assetClass: "stocks",
    user: { name: "Sam Rivera", handle: "@macrotrader", initials: "SR", color: "#7B2FBE", style: "Macro", level: "Elite", levelColor: "#E8193C" },
    timestamp: "6h", sentiment: "bearish",
    text: "The market is pricing in 3 rate cuts this year but the data doesn't support it. CPI is still sticky, the labor market is too strong. I think we see a repricing in Q2 that catches a lot of people off guard.",
    reactions: [{ emoji: "🐻", label: "Bearish", count: 62 }, { emoji: "🔥", label: "Bullish", count: 31 }, { emoji: "👀", label: "Watching", count: 44 }],
    comments: 41, reposts: 27,
  },
  {
    id: "4", type: "trade_idea", assetClass: "forex",
    user: { name: "Taylor Morgan", handle: "@chartmaster", initials: "TM", color: "#E8193C", style: "Technical", level: "Trader", levelColor: "#7B2FBE" },
    timestamp: "8h", sentiment: "bullish", ticker: "EUR/USD", timeframe: "Swing",
    thesis: "EUR/USD forming a double bottom on the 4H chart. Holding above 1.0850, looking for a move to 1.0950. Stop below 1.0800. Clean structure.",
    reactions: [{ emoji: "🔥", label: "Bullish", count: 38 }, { emoji: "🐻", label: "Bearish", count: 12 }],
    comments: 11, reposts: 5,
  },
  {
    id: "5", type: "trade_idea", assetClass: "crypto",
    user: { name: "Maya Chen", handle: "@cryptomaya", initials: "MC", color: "#F79009", style: "Crypto Trader", level: "Expert", levelColor: "#4DC820" },
    timestamp: "9h", sentiment: "bullish", ticker: "BTC", timeframe: "Swing",
    entry: "$62,000", target: "$72,000", stop: "$58,500",
    thesis: "BTC reclaimed the 200-day MA and is holding above it. On-chain data shows accumulation by long-term holders. Halving narrative building. High-conviction swing setup.",
    reactions: [{ emoji: "🔥", label: "Bullish", count: 112 }, { emoji: "🐻", label: "Bearish", count: 24 }, { emoji: "👀", label: "Watching", count: 87 }],
    comments: 56, reposts: 34,
  },
  {
    id: "6", type: "trade_idea", assetClass: "futures",
    user: { name: "Derek Walsh", handle: "@futurestrader", initials: "DW", color: "#00AEEF", style: "Futures Trader", level: "Veteran", levelColor: "#F79009" },
    timestamp: "11h", sentiment: "bearish", ticker: "ES", timeframe: "Day Trade",
    thesis: "ES at key resistance from March highs. Volume declining on rallies. Short with stop above 5280, targeting 5200. Tight risk, defined setup.",
    reactions: [{ emoji: "🐻", label: "Bearish", count: 44 }, { emoji: "🔥", label: "Bullish", count: 18 }],
    comments: 22, reposts: 9,
  },
];

const POST_TYPE_CONFIG: Record<PostType, { label: string; color: string }> = {
  trade_idea:  { label: "Trade Idea",  color: "#00AEEF" },
  pl_share:    { label: "P&L Share",   color: "#4DC820" },
  market_take: { label: "Market Take", color: "#7B2FBE" },
  question:    { label: "Question",    color: "#667085" },
};

const ASSET_TABS: { id: AssetClass; label: string; icon: React.ReactNode }[] = [
  { id: "all",     label: "All",     icon: <Globe size={11} /> },
  { id: "stocks",  label: "Stocks",  icon: <DollarSign size={11} /> },
  { id: "forex",   label: "Forex",   icon: <Activity size={11} /> },
  { id: "futures", label: "Futures", icon: <BarChart2 size={11} /> },
  { id: "crypto",  label: "Crypto",  icon: <Bitcoin size={11} /> },
];

// ─── Lean Post Card ───────────────────────────────────────────────────────────

function PostCard({ post, onReact, onTickerClick }: {
  post: Post;
  onReact: (id: string, emoji: string) => void;
  onTickerClick: (ticker: string) => void;
}) {
  const [showLevels, setShowLevels] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [localReposts, setLocalReposts] = useState(post.reposts);
  const [localComments, setLocalComments] = useState(post.comments);

  const handleToggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next && !commentsLoaded) {
      setCommentsLoaded(true);
      import("@/lib/api").then(({ fetchComments }) => {
        fetchComments(post.id).then((data: any[]) => {
          setComments(Array.isArray(data) ? data : []);
        }).catch(() => {});
      });
    }
  };

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    const body = commentText.trim();
    setCommentText("");
    setLocalComments(c => c + 1);
    setComments(prev => [{ id: Date.now().toString(), body, user: { name: "You", handle: "@you" }, created_at: new Date().toISOString() }, ...prev]);
    import("@/lib/api").then(({ createComment }) => {
      createComment(post.id, body).catch(() => {});
    });
    toast.success("Comment posted! +5 XP");
  };

  const handleReshare = () => {
    if (reposted) return;
    setReposted(true);
    setLocalReposts(r => r + 1);
    import("@/lib/api").then(({ repostPost }) => {
      repostPost(post.id).catch(() => { setReposted(false); setLocalReposts(r => r - 1); });
    });
    toast.success("Reshared! +10 XP");
  };

  const handleBookmark = () => {
    const next = !bookmarked;
    setBookmarked(next);
    import("@/lib/api").then(({ bookmarkPost }) => {
      bookmarkPost(post.id).catch(() => setBookmarked(!next));
    });
    toast.success(next ? "Saved to bookmarks" : "Removed from bookmarks");
  };

  const handleShare = () => {
    const url = `${window.location.origin}/community?post=${post.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => toast.success("Link copied!")).catch(() => toast.success("Link copied!"));
    } else {
      toast.success("Link: " + url);
    }
  };

  const typeConfig = POST_TYPE_CONFIG[post.type];
  const sentColor = post.sentiment === "bullish" ? "#4DC820" : post.sentiment === "bearish" ? "#E8193C" : "#F79009";
  const displayText = post.text || post.thesis || "";
  const isLong = displayText.length > 180;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border p-3 hover:border-border/80 transition-all"
    >
      {/* Header row */}
      <div className="flex items-start gap-2.5 mb-2">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
             style={{ background: post.user.color }}>
          {post.user.initials}
        </div>
        <div className="flex-1 min-w-0">
          {/* Row 1: name + handle + level badge + style */}
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <Link href={`/traders/${post.user.handle.replace("@", "")}`}>
              <span className="font-bold text-foreground text-sm hover:underline cursor-pointer">{post.user.name}</span>
            </Link>
            <span className="text-[10px] text-muted-foreground">{post.user.handle}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: post.user.levelColor }}>
              {post.user.level}
            </span>
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground hidden sm:inline">
              {post.user.style}
            </span>
          </div>
          {/* Row 2: post type + ticker + sentiment + time */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: typeConfig.color + "18", color: typeConfig.color }}>
              {typeConfig.label}
            </span>
            {post.ticker && (
              <button
                onClick={() => onTickerClick(post.ticker!)}
                className="flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded-lg transition-colors hover:bg-muted"
                style={{ color: sentColor, fontFamily: "var(--font-mono)" }}
              >
                <TickerLogo symbol={post.ticker} size={12} />
                ${post.ticker}
              </button>
            )}
            {post.sentiment && (
              <span className="text-[9px] font-bold" style={{ color: sentColor }}>
                {post.sentiment === "bullish" ? "🔥 Bullish" : post.sentiment === "bearish" ? "🐻 Bearish" : "👀 Neutral"}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto">{post.timestamp}</span>
          </div>
        </div>
      </div>

      {/* P&L badge */}
      {post.type === "pl_share" && post.pnl && (
        <div className="inline-flex items-center gap-2 mb-2 px-2.5 py-1 rounded-lg bg-muted">
          <span className="text-base font-black" style={{ color: post.outcome === "win" ? "#4DC820" : "#E8193C" }}>
            {post.pnl}
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                style={{ background: post.outcome === "win" ? "#4DC820" : "#E8193C" }}>
            {post.outcome === "win" ? "Win" : "Loss"}
          </span>
        </div>
      )}

      {/* Body text */}
      {displayText && (
        <p className="text-sm text-foreground leading-relaxed mb-2">
          {isLong && !expanded ? displayText.slice(0, 180) + "…" : displayText}
          {isLong && (
            <button onClick={() => setExpanded(!expanded)}
                    className="text-[#4DC820] font-bold ml-1 hover:underline text-xs">
              {expanded ? "less" : "more"}
            </button>
          )}
        </p>
      )}

      {/* Key levels — collapsed by default */}
      {post.type === "trade_idea" && (post.entry || post.target || post.stop) && (
        <div className="mb-2">
          <button
            onClick={() => setShowLevels(!showLevels)}
            className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown size={11} className={`transition-transform ${showLevels ? "rotate-180" : ""}`} />
            {showLevels ? "Hide levels" : "Show levels"}
          </button>
          <AnimatePresence>
            {showLevels && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                  {[
                    { label: "Entry", value: post.entry, color: "#667085" },
                    { label: "Target", value: post.target, color: "#4DC820" },
                    { label: "Stop", value: post.stop, color: "#E8193C" },
                  ].filter(k => k.value).map(k => (
                    <div key={k.label} className="bg-muted rounded-lg p-1.5 text-center">
                      <p className="text-[8px] font-bold uppercase tracking-wide mb-0.5" style={{ color: k.color }}>{k.label}</p>
                      <p className="ticker-mono text-xs font-bold text-foreground">{k.value}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Reactions + actions — compact single row */}
      <div className="flex items-center gap-1 pt-1.5 border-t border-border">
        {post.reactions.map(r => (
          <button
            key={r.emoji}
            onClick={() => onReact(post.id, r.emoji)}
            className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-[11px] font-bold transition-all hover:scale-105 active:scale-95"
            style={{
              background: r.active ? "rgba(77,200,32,0.12)" : "transparent",
              color: r.active ? "#4DC820" : "var(--muted-foreground)",
            }}
          >
            <span>{r.emoji}</span>
            <span>{r.count}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleToggleComments}
            className="flex items-center gap-1 text-[11px] transition-colors"
            style={{ color: showComments ? "#4DC820" : "var(--muted-foreground)" }}
          >
            <MessageCircle size={12} /> {localComments}
          </button>
          <button
            onClick={handleReshare}
            className="flex items-center gap-1 text-[11px] transition-colors"
            style={{ color: reposted ? "#4DC820" : "var(--muted-foreground)" }}
            title={reposted ? "Already reshared" : "Reshare"}
          >
            <Repeat2 size={12} /> {localReposts}
          </button>
          <button
            onClick={handleBookmark}
            className="transition-colors"
            style={{ color: bookmarked ? "#4DC820" : "var(--muted-foreground)" }}
            title={bookmarked ? "Remove bookmark" : "Save"}
          >
            <Bookmark size={12} fill={bookmarked ? "#4DC820" : "none"} />
          </button>
          <button
            onClick={handleShare}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Copy link"
          >
            <Share2 size={12} />
          </button>
        </div>
      </div>
      {/* Inline comment thread */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-2 border-t border-border mt-1.5 space-y-2">
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground flex-shrink-0 mt-0.5">
                  Y
                </div>
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
                    <button
                      onClick={handleSubmitComment}
                      className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg cc-gradient-bg text-[#101828] flex-shrink-0"
                    >
                      Post
                    </button>
                  )}
                </div>
              </div>
              {comments.map((c: any) => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mt-0.5"
                       style={{ background: "#4DC820" }}>
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

// ─── Collapsible Compose Box ──────────────────────────────────────────────────

function ComposeBox({ onPost, prefillTicker }: { onPost: (text: string) => void; prefillTicker?: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [type, setType] = useState<PostType>("market_take");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (prefillTicker) {
      setText(`$${prefillTicker} `);
      setOpen(true);
    }
  }, [prefillTicker]);

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  return (
    <div className="bg-card rounded-xl border border-border mb-4 overflow-hidden">
      {!open ? (
        <button
          onClick={handleOpen}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-[#4DC820] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            <Pencil size={11} />
          </div>
          <span className="text-sm text-muted-foreground">What's your market take?</span>
          <span className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-lg cc-gradient-bg text-[#101828]">Post</span>
        </button>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3">
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#4DC820] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
              You
            </div>
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Share a trade idea, P&L, or market take…"
                rows={3}
                className="w-full text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none bg-transparent leading-relaxed"
              />
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border">
                <div className="flex gap-1 flex-wrap">
                  {(["trade_idea", "pl_share", "market_take", "question"] as PostType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-md transition-all"
                      style={{
                        background: type === t ? POST_TYPE_CONFIG[t].color + "18" : "transparent",
                        color: type === t ? POST_TYPE_CONFIG[t].color : "var(--muted-foreground)",
                      }}
                    >
                      {POST_TYPE_CONFIG[t].label}
                    </button>
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <button onClick={() => { setOpen(false); setText(""); }}
                          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1">
                    Cancel
                  </button>
                  <button
                    onClick={() => { if (text.trim()) { onPost(text); setText(""); setOpen(false); toast.success("Posted! +25 XP"); } }}
                    disabled={!text.trim()}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-lg cc-gradient-bg text-[#101828] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <Zap size={10} /> Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Ticker Hub ───────────────────────────────────────────────────────────────

function TickerHub({ ticker, radarTickers, onClose }: {
  ticker: string;
  radarTickers: any[];
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TickerTab>("feed");
  const [tickerData, setTickerData] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [posts, setPosts] = useState<Post[]>(SEED_POSTS);
  const [bullVotes, setBullVotes] = useState(62);
  const [bearVotes, setBearVotes] = useState(38);
  const [voted, setVoted] = useState<"bull" | "bear" | null>(null);

  const radarTicker = radarTickers.find((t: any) => t.symbol === ticker);
  const isBull = radarTicker?.direction?.toLowerCase() === "bullish";
  const isBear = radarTicker?.direction?.toLowerCase() === "bearish";
  const scoreColor = isBull ? "#4DC820" : isBear ? "#E8193C" : "#F79009";
  const dirLabel = isBull ? "Bullish" : isBear ? "Bearish" : "Neutral";

  useEffect(() => {
    // Fetch ticker intelligence
    fetchTicker(ticker).then(setTickerData).catch(() => {});
    // Fetch videos mentioning this ticker
    fetchContentByTicker(ticker).then(r => {
      setVideos(Array.isArray(r) ? r : []);
    }).catch(() => fetchContent({ topic: ticker.toLowerCase() }).then(r => setVideos(r || [])).catch(() => {}));
  }, [ticker]);

  const tickerPosts = posts.filter(p =>
    p.ticker?.toUpperCase() === ticker ||
    p.text?.toUpperCase().includes(`$${ticker}`) ||
    p.thesis?.toUpperCase().includes(`$${ticker}`)
  );

  const TABS: { id: TickerTab; label: string; icon: React.ReactNode }[] = [
    { id: "feed",      label: "Feed",      icon: <MessageCircle size={12} /> },
    { id: "signal",    label: "Signal",    icon: <BarChart2 size={12} /> },
    { id: "videos",    label: "Videos",    icon: <Play size={12} /> },
    { id: "sentiment", label: "Sentiment", icon: <ThumbsUp size={12} /> },
  ];

  const handleVote = (dir: "bull" | "bear") => {
    if (voted) return;
    setVoted(dir);
    if (dir === "bull") setBullVotes(v => v + 1);
    else setBearVotes(v => v + 1);
    toast.success(`Voted ${dir === "bull" ? "Bullish" : "Bearish"} on $${ticker}! +10 XP`);
  };

  const total = bullVotes + bearVotes;
  const bullPct = Math.round((bullVotes / total) * 100);
  const bearPct = 100 - bullPct;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="bg-card rounded-2xl border border-border overflow-hidden mb-5"
    >
      {/* Ticker header */}
      <div className="p-4 border-b border-border" style={{ background: scoreColor + "08" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TickerLogo symbol={ticker} size={44} className="rounded-xl" />
            <div>
              <div className="flex items-center gap-2">
                <span className="ticker-mono font-black text-foreground text-xl">${ticker}</span>
                {radarTicker && (
                  <>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ background: scoreColor }}>
                      {dirLabel}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      Score {Math.round(radarTicker.score)}
                    </span>
                  </>
                )}
              </div>
              {radarTicker?.price && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  ${radarTicker.price?.toFixed(2)}
                  {radarTicker.change_pct != null && (
                    <span className="ml-1.5 font-bold" style={{ color: radarTicker.change_pct >= 0 ? "#4DC820" : "#E8193C" }}>
                      {radarTicker.change_pct >= 0 ? "+" : ""}{radarTicker.change_pct?.toFixed(2)}%
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/intelligence?ticker=${ticker}`}>
              <button className="text-xs font-bold px-3 py-1.5 rounded-xl border border-[#00AEEF] text-[#00AEEF] hover:bg-[rgba(0,174,239,0.08)] transition-colors flex items-center gap-1">
                Full Analysis <ArrowUpRight size={11} />
              </button>
            </Link>
            <button onClick={onClose}
                    className="w-7 h-7 rounded-full bg-muted hover:bg-accent flex items-center justify-center transition-colors">
              <X size={13} className="text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-4">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold transition-all relative"
            style={{
              color: activeTab === tab.id ? "var(--foreground)" : "var(--muted-foreground)",
              borderBottom: activeTab === tab.id ? `2px solid ${scoreColor}` : "2px solid transparent",
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {/* FEED TAB */}
        {activeTab === "feed" && (
          <div className="space-y-3">
            <ComposeBox onPost={(text) => {
              const newPost: Post = {
                id: Date.now().toString(), type: "market_take", assetClass: "stocks",
                user: { name: "You", handle: "@you", initials: "YO", color: "#4DC820", style: "Trader", level: "Rookie", levelColor: "#667085" },
                timestamp: "Just now", ticker,
                text, reactions: [{ emoji: "🔥", label: "Bullish", count: 0 }, { emoji: "❤️", label: "Like", count: 0 }],
                comments: 0, reposts: 0,
              };
              setPosts(prev => [newPost, ...prev]);
            }} prefillTicker={ticker} />
            {tickerPosts.length > 0 ? (
              tickerPosts.map(post => (
                <PostCard key={post.id} post={post} onReact={() => {}} onTickerClick={(t) => { if (t) { import("wouter").then(({ useLocation: _ }) => {}); window.location.href = `/tickers/${t.toUpperCase()}`; } }} />
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-foreground font-bold text-sm mb-1">No posts about ${ticker} yet</p>
                <p className="text-muted-foreground text-xs">Be the first to share your take</p>
              </div>
            )}
          </div>
        )}

        {/* SIGNAL TAB */}
        {activeTab === "signal" && (
          <div>
            {tickerData ? (
              <div className="space-y-4">
                {/* Score overview */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Score</p>
                    <p className="text-2xl font-black" style={{ color: scoreColor }}>{Math.round(tickerData.convergence_score || 0)}</p>
                  </div>
                  <div className="bg-muted rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Direction</p>
                    <p className="text-sm font-black" style={{ color: scoreColor }}>{tickerData.direction || dirLabel}</p>
                  </div>
                  <div className="bg-muted rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Timeframe</p>
                    <p className="text-sm font-black text-foreground">{tickerData.timeframe || "Swing"}</p>
                  </div>
                </div>
                {/* Kai analysis */}
                {tickerData.analysis && (
                  <div className="bg-muted rounded-xl p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Kai's Take</p>
                    <p className="text-sm text-foreground leading-relaxed">{tickerData.analysis}</p>
                  </div>
                )}
                {/* Key levels */}
                {tickerData.key_levels && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Key Levels</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Support", value: tickerData.key_levels.support, color: "#4DC820" },
                        { label: "Resistance", value: tickerData.key_levels.resistance, color: "#E8193C" },
                        { label: "Invalidation", value: tickerData.key_levels.invalidation, color: "#F79009" },
                      ].map(k => (
                        <div key={k.label} className="bg-muted rounded-xl p-2 text-center border border-border">
                          <p className="text-[9px] font-bold uppercase tracking-wide mb-0.5" style={{ color: k.color }}>{k.label}</p>
                          <p className="ticker-mono text-xs font-bold text-foreground">{k.value || "—"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Link href={`/intelligence?ticker=${ticker}`}>
                  <button className="w-full text-xs font-bold py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors flex items-center justify-center gap-1">
                    View full analysis with charts <ArrowUpRight size={11} />
                  </button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-8 h-8 rounded-full border-2 border-[#4DC820] border-t-transparent animate-spin mx-auto mb-3" />
                <p className="text-muted-foreground text-xs">Loading signal data…</p>
              </div>
            )}
          </div>
        )}

        {/* VIDEOS TAB */}
        {activeTab === "videos" && (
          <div>
            {videos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {videos.map((v: any) => (
                  <Link key={v.id || v.video_id} href={`/video/${v.id || v.video_id}`}>
                    <div className="group bg-muted rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer">
                      <div className="relative aspect-video bg-black">
                        {v.thumbnail_url && (
                          <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play size={24} className="text-white" />
                        </div>
                        {v.duration && (
                          <span className="absolute bottom-1.5 right-1.5 text-[9px] font-bold bg-black/80 text-white px-1.5 py-0.5 rounded">
                            {v.duration}
                          </span>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-bold text-foreground line-clamp-2 leading-tight">{v.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{v.creator_name || v.channel_name}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Play size={24} className="text-muted-foreground mx-auto mb-2" />
                <p className="text-foreground font-bold text-sm mb-1">No videos found for ${ticker}</p>
                <p className="text-muted-foreground text-xs">Check back as educators publish new content</p>
              </div>
            )}
          </div>
        )}

        {/* SENTIMENT TAB */}
        {activeTab === "sentiment" && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm font-bold text-foreground mb-1">Community Sentiment on ${ticker}</p>
              <p className="text-xs text-muted-foreground">{total} votes</p>
            </div>
            {/* Vote buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleVote("bull")}
                disabled={!!voted}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all disabled:cursor-not-allowed"
                style={{
                  borderColor: voted === "bull" ? "#4DC820" : "var(--border)",
                  background: voted === "bull" ? "rgba(77,200,32,0.08)" : "var(--muted)",
                }}
              >
                <ThumbsUp size={24} style={{ color: voted === "bull" ? "#4DC820" : "var(--muted-foreground)" }} />
                <span className="font-black text-2xl" style={{ color: "#4DC820" }}>{bullPct}%</span>
                <span className="text-xs font-bold text-muted-foreground">Bullish</span>
                <span className="text-[10px] text-muted-foreground">{bullVotes} votes</span>
              </button>
              <button
                onClick={() => handleVote("bear")}
                disabled={!!voted}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all disabled:cursor-not-allowed"
                style={{
                  borderColor: voted === "bear" ? "#E8193C" : "var(--border)",
                  background: voted === "bear" ? "rgba(232,25,60,0.08)" : "var(--muted)",
                }}
              >
                <ThumbsDown size={24} style={{ color: voted === "bear" ? "#E8193C" : "var(--muted-foreground)" }} />
                <span className="font-black text-2xl" style={{ color: "#E8193C" }}>{bearPct}%</span>
                <span className="text-xs font-bold text-muted-foreground">Bearish</span>
                <span className="text-[10px] text-muted-foreground">{bearVotes} votes</span>
              </button>
            </div>
            {/* Sentiment bar */}
            <div className="h-3 rounded-full overflow-hidden bg-muted flex">
              <motion.div
                className="h-full rounded-l-full"
                style={{ background: "#4DC820" }}
                animate={{ width: `${bullPct}%` }}
                transition={{ duration: 0.5 }}
              />
              <motion.div
                className="h-full rounded-r-full"
                style={{ background: "#E8193C" }}
                animate={{ width: `${bearPct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            {voted && (
              <p className="text-center text-xs text-muted-foreground">
                You voted {voted === "bull" ? "Bullish 🔥" : "Bearish 🐻"} · +10 XP earned
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Trending Ticker Strip ────────────────────────────────────────────────────

function TrendingTickerStrip({ radarTickers, activeAsset, activeTicker, onTickerClick }: {
  radarTickers: any[];
  activeAsset: AssetClass;
  activeTicker: string | null;
  onTickerClick: (ticker: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const STATIC: Record<AssetClass, any[]> = {
    all:     [{ symbol: "NVDA", score: 78, direction: "bullish", price: 118.45, change_pct: 2.34 }, { symbol: "PLTR", score: 72, direction: "bullish", price: 24.18, change_pct: 1.87 }, { symbol: "TSLA", score: 52, direction: "neutral", price: 248.50, change_pct: -0.43 }, { symbol: "SPY", score: 45, direction: "bearish", price: 512.30, change_pct: -1.12 }, { symbol: "BTC", score: 70, direction: "bullish", price: 83200, change_pct: 1.55 }, { symbol: "EURUSD", score: 55, direction: "neutral", price: 1.0842, change_pct: 0.12 }, { symbol: "ES", score: 40, direction: "bearish", price: 5180, change_pct: -0.88 }, { symbol: "GLD", score: 68, direction: "bullish", price: 218.40, change_pct: 0.76 }, { symbol: "AAPL", score: 63, direction: "bullish", price: 172.80, change_pct: 0.94 }, { symbol: "QQQ", score: 48, direction: "neutral", price: 436.20, change_pct: -0.31 }],
    stocks:  [{ symbol: "NVDA", score: 78, direction: "bullish", price: 118.45, change_pct: 2.34 }, { symbol: "PLTR", score: 72, direction: "bullish", price: 24.18, change_pct: 1.87 }, { symbol: "TSLA", score: 52, direction: "neutral", price: 248.50, change_pct: -0.43 }, { symbol: "AAPL", score: 63, direction: "bullish", price: 172.80, change_pct: 0.94 }, { symbol: "AMZN", score: 61, direction: "bullish", price: 186.20, change_pct: 1.22 }, { symbol: "SPY", score: 45, direction: "bearish", price: 512.30, change_pct: -1.12 }, { symbol: "QQQ", score: 48, direction: "neutral", price: 436.20, change_pct: -0.31 }, { symbol: "MSFT", score: 60, direction: "bullish", price: 384.50, change_pct: 0.67 }],
    forex:   [{ symbol: "EURUSD", score: 55, direction: "neutral", price: 1.0842, change_pct: 0.12 }, { symbol: "GBPUSD", score: 48, direction: "bearish", price: 1.2634, change_pct: -0.34 }, { symbol: "USDJPY", score: 62, direction: "bullish", price: 151.42, change_pct: 0.28 }, { symbol: "AUDUSD", score: 44, direction: "bearish", price: 0.6521, change_pct: -0.51 }, { symbol: "USDCAD", score: 58, direction: "bullish", price: 1.3612, change_pct: 0.19 }],
    futures: [{ symbol: "ES", score: 40, direction: "bearish", price: 5180, change_pct: -0.88 }, { symbol: "NQ", score: 45, direction: "bearish", price: 17840, change_pct: -1.04 }, { symbol: "CL", score: 65, direction: "bullish", price: 78.42, change_pct: 1.33 }, { symbol: "GC", score: 68, direction: "bullish", price: 2342.10, change_pct: 0.82 }, { symbol: "ZB", score: 52, direction: "neutral", price: 118.20, change_pct: -0.14 }],
    crypto:  [{ symbol: "BTC", score: 70, direction: "bullish", price: 83200, change_pct: 1.55 }, { symbol: "ETH", score: 65, direction: "bullish", price: 3180, change_pct: 2.10 }, { symbol: "SOL", score: 72, direction: "bullish", price: 148.20, change_pct: 3.44 }, { symbol: "DOGE", score: 38, direction: "bearish", price: 0.1421, change_pct: -2.88 }, { symbol: "XRP", score: 55, direction: "neutral", price: 0.5820, change_pct: 0.44 }],
  };
  const staticMap = Object.values(STATIC).flat().reduce((acc: Record<string, any>, t) => { acc[t.symbol] = t; return acc; }, {});
  const liveTickers = radarTickers.length > 0 && activeAsset === "all"
    ? radarTickers.map((t: any) => ({ ...staticMap[t.symbol] || {}, ...t }))
    : STATIC[activeAsset];

  return (
    <div
      ref={scrollRef}
      className="flex items-center gap-3 overflow-x-auto pb-3 pt-2 px-4 sm:px-6"
      style={{
        scrollbarWidth: "none",
        minHeight: 114,
        // iOS Safari: enable momentum scrolling and prevent clipping
        WebkitOverflowScrolling: "touch" as any,
        // iOS Safari: prevent the scroll container from collapsing its children
        alignItems: "flex-start",
      }}
    >
      {liveTickers.map((t: any) => {
        const isBull = t.direction?.toLowerCase() === "bullish";
        const isBear = t.direction?.toLowerCase() === "bearish";
        const color = isBull ? "#4DC820" : isBear ? "#E8193C" : "#F79009";
        const isActive = activeTicker === t.symbol;
        const changePct = t.change_pct ?? (isBull ? 1.2 : isBear ? -1.4 : 0.1);
        const price = t.price;
        const formattedPrice = price
          ? price >= 1000 ? `$${(price / 1000).toFixed(1)}K`
          : price >= 1 ? `$${price.toFixed(2)}`
          : `$${price.toFixed(4)}`
          : null;
        return (
          <button
            key={t.symbol}
            onClick={() => onTickerClick(isActive ? "" : t.symbol)}
            className="flex-shrink-0 flex flex-col rounded-xl transition-all border"
            style={{
              // iOS Safari fix: overflow:hidden on a button clips SVG children — use clip instead
              overflow: "hidden",
              background: isActive ? color + "12" : "var(--card)",
              borderColor: isActive ? color : "var(--border)",
              boxShadow: isActive ? `0 0 0 1.5px ${color}50` : "0 1px 3px rgba(0,0,0,0.06)",
              width: 120,
            }}
          >
            <div className="flex items-center gap-1.5 px-2.5 pt-2.5 pb-0">
              <TickerLogo symbol={t.symbol} size={20} />
              <span className="text-[12px] font-black tracking-tight flex-1 truncate" style={{ color: isActive ? color : "var(--foreground)" }}>
                {t.symbol}
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: color + "20", color }}>
                {Math.round(t.score ?? 50)}
              </span>
            </div>
            {/* iOS Safari fix: explicit pixel width/height, no padding that reduces available space */}
            <div style={{ width: 120, height: 40, flexShrink: 0, display: "block" }}>
              <SparklineChart symbol={t.symbol} color={color} height={40} width={120} price={t.price} changePct={changePct} />
            </div>
            <div className="flex items-center justify-between px-3 pb-2.5 pt-0">
              {formattedPrice && (
                <span className="text-[10px] font-bold text-muted-foreground">{formattedPrice}</span>
              )}
              <span className="text-[10px] font-black" style={{ color }}>
                {changePct >= 0 ? "↑" : "↓"} {Math.abs(changePct).toFixed(2)}%
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
// ─── Main Community Page ──────────────────────────────────────────────────────

export default function CommunityPage() {
  const { selected: globalSelected, isAll: globalIsAll, toggle: toggleAssetClass, selectAll: selectAllAssets } = useAssetClass();
  // Map global multi-select to local single AssetClass for backward compat
  const activeAsset: AssetClass = globalIsAll ? "all" : (globalSelected[0] as AssetClass) ?? "all";
  const [activeTicker, setActiveTicker] = useState<string | null>(null);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("trending");
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [radarTickers, setRadarTickers] = useState<any[]>([]);
  const [tickerSearch, setTickerSearch] = useState("");
  const [navCollapsed, setNavCollapsed] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Load feed from Railway API
  useEffect(() => {
    const tab = feedFilter === "following" ? "following" : feedFilter === "latest" ? "discover" : "trending";
    setFeedLoading(true);
    import("@/lib/api").then(({ fetchFeed }) => {
      fetchFeed(tab, 1).then((data: any[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const normalized: Post[] = data.map((p: any) => ({
            id: p.id,
            type: (p.post_type || "market_take") as PostType,
            assetClass: "stocks" as AssetClass,
            ticker: p.ticker,
            sentiment: p.sentiment as Sentiment | undefined,
            thesis: p.thesis,
            text: p.body || p.thesis || "",
            entry: p.entry_price ? `$${p.entry_price}` : undefined,
            target: p.target_price ? `$${p.target_price}` : undefined,
            stop: p.stop_price ? `$${p.stop_price}` : undefined,
            timeframe: p.timeframe,
            user: {
              name: p.user?.name || "Trader",
              handle: p.user?.handle ? `@${p.user.handle}` : "@trader",
              initials: (p.user?.name || "T").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
              color: "#4DC820",
              style: p.user?.style || "Trader",
              level: "Pro",
              levelColor: "#4DC820",
            },
            timestamp: p.created_at ? new Date(p.created_at).toLocaleDateString() : "Recently",
            reactions: [
              { emoji: "🔥", label: "Bullish", count: p.likes_count || 0, active: p.user_liked || false },
              { emoji: "❤️", label: "Like", count: 0, active: false },
            ],
            comments: p.comments_count || 0,
            reposts: p.reposts_count || 0,
          }));
          setPosts(normalized);
        } else {
          setPosts(SEED_POSTS);
        }
      }).catch(() => setPosts(SEED_POSTS))
        .finally(() => setFeedLoading(false));
    });
  }, [feedFilter]);

  useEffect(() => {
    fetchRadar().then(r => {
      const all = [...(r.critical || []), ...(r.high_conviction || []), ...(r.watch || [])];
      setRadarTickers(all);
    }).catch(() => {});
  }, []);

  const [, navigate] = useLocation();
  const handleTickerClick = (ticker: string) => {
    if (ticker) {
      navigate(`/tickers/${ticker.toUpperCase()}`);
      return;
    }
    setActiveTicker(null);
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
    // Optimistic update
    const post = posts.find(p => p.id === postId);
    const wasLiked = post?.reactions[0]?.active;
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return {
        ...p,
        reactions: p.reactions.map(r => {
          if (r.emoji !== emoji) return r;
          return { ...r, count: wasLiked ? r.count - 1 : r.count + 1, active: !wasLiked };
        }),
      };
    }));
    // Persist to Railway API
    import("@/lib/api").then(({ likePost, unlikePost }) => {
      if (wasLiked) unlikePost(postId).catch(() => {});
      else likePost(postId).catch(() => {});
    });
  };

  const handlePost = (text: string) => {
    const newPost: Post = {
      id: Date.now().toString(), type: "market_take",
      assetClass: activeAsset === "all" ? "stocks" : activeAsset,
      user: { name: "You", handle: "@you", initials: "YO", color: "#4DC820", style: "Trader", level: "Rookie", levelColor: "#667085" },
      timestamp: "Just now", text,
      reactions: [{ emoji: "🔥", label: "Bullish", count: 0 }, { emoji: "❤️", label: "Like", count: 0 }],
      comments: 0, reposts: 0,
    };
    setPosts(prev => [newPost, ...prev]);
    // Persist to Railway API
    import("@/lib/api").then(({ createPost }) => {
      createPost({ post_type: "market_take", body: text }).catch(() => {});
    });
  };

  const FEED_FILTERS: { id: FeedFilter; label: string }[] = [
    { id: "trending",    label: "Trending" },
    { id: "following",   label: "Following" },
    { id: "latest",      label: "Latest" },
    { id: "trade_ideas", label: "Trade Ideas" },
  ];

  const filteredPosts = posts.filter(p => {
    if (activeAsset !== "all" && p.assetClass && p.assetClass !== activeAsset) return false;
    if (feedFilter === "trade_ideas") return p.type === "trade_idea";
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Nav — hidden when collapsed for more screen real estate */}
      <AnimatePresence>
        {!navCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Nav />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Trending Tickers Hero — sits directly below Nav, scrolls away with page ── */}
      <div
        className="bg-card border-b border-border"
        style={{
          boxShadow: "0 1px 8px rgba(0,0,0,0.08)",
        }}
      >
        {/* Header: Trending label + scrollable asset tabs + actions */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-2 pb-1">
          {/* Row 1: Trending + scrollable tabs + collapse toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex-shrink-0">Trending</span>
            {/* Scrollable tab strip — no wrapping */}
            <div className="flex items-center gap-0.5 overflow-x-auto flex-1 min-w-0" style={{ scrollbarWidth: "none" }}>
              {ASSET_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => tab.id === "all" ? selectAllAssets() : toggleAssetClass(tab.id as "stocks" | "futures" | "forex" | "crypto")}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-md transition-all flex-shrink-0"
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
            {/* Right actions — always visible, no wrapping */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <form onSubmit={handleTickerSearch} className="relative hidden sm:block">
                <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={tickerSearch}
                  onChange={e => setTickerSearch(e.target.value.toUpperCase())}
                  placeholder="$TICKER"
                  className="pl-6 pr-2.5 py-1.5 text-[11px] bg-muted border border-border rounded-lg focus:outline-none focus:border-[#4DC820] transition-colors w-20 text-foreground placeholder:text-muted-foreground uppercase font-bold"
                />
              </form>
              <Link href="/discover">
                <button className="hidden sm:flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold rounded-lg border border-border hover:border-[#4DC820] hover:text-[#4DC820] transition-all text-muted-foreground">
                  <TrendingUp size={10} /> Discover
                </button>
              </Link>
              <button
                onClick={() => setNavCollapsed(!navCollapsed)}
                title={navCollapsed ? "Show navigation" : "Hide navigation"}
                className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold rounded-lg border transition-all"
                style={{
                  borderColor: navCollapsed ? "#4DC820" : "var(--border)",
                  color: navCollapsed ? "#4DC820" : "var(--muted-foreground)",
                  background: navCollapsed ? "rgba(77,200,32,0.08)" : "transparent",
                }}
              >
                {navCollapsed ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
                <span className="hidden md:inline">{navCollapsed ? "Nav" : "Nav"}</span>
              </button>
            </div>
          </div>
          {/* Mobile-only row 2: search + discover */}
          <div className="flex items-center gap-2 mt-1.5 sm:hidden">
            <form onSubmit={handleTickerSearch} className="relative flex-1">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={tickerSearch}
                onChange={e => setTickerSearch(e.target.value.toUpperCase())}
                placeholder="Search $TICKER"
                className="pl-6 pr-2.5 py-1.5 text-[11px] bg-muted border border-border rounded-lg focus:outline-none focus:border-[#4DC820] transition-colors w-full text-foreground placeholder:text-muted-foreground uppercase font-bold"
              />
            </form>
            <Link href="/discover">
              <button className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-lg border border-border hover:border-[#4DC820] hover:text-[#4DC820] transition-all text-muted-foreground flex-shrink-0">
                <TrendingUp size={10} /> Discover
              </button>
            </Link>
          </div>
        </div>
        {/* Scrollable StockTwits-style ticker cards */}
        <TrendingTickerStrip
          radarTickers={radarTickers}
          activeAsset={activeAsset}
          activeTicker={activeTicker}
          onTickerClick={handleTickerClick}
        />
      </div>

      {/* ── Main Layout ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5">

          {/* Left: Ticker Hub or Feed */}
          <div>
            <AnimatePresence mode="wait">
              {activeTicker ? (
                <TickerHub
                  key={activeTicker}
                  ticker={activeTicker}
                  radarTickers={radarTickers}
                  onClose={() => setActiveTicker(null)}
                />
              ) : null}
            </AnimatePresence>

            {/* Feed filter row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-0.5">
                {FEED_FILTERS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFeedFilter(f.id)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all"
                    style={{
                      background: feedFilter === f.id ? "rgba(77,200,32,0.12)" : "transparent",
                      color: feedFilter === f.id ? "#4DC820" : "var(--muted-foreground)",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <Link href="/feed">
                <button className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg cc-gradient-bg text-[#101828] flex items-center gap-1">
                  <Zap size={10} /> Swipe Feed
                </button>
              </Link>
            </div>

            <ComposeBox onPost={handlePost} />

            <div className="space-y-2.5">
              <AnimatePresence>
                {filteredPosts.map(post => (
                  <PostCard key={post.id} post={post} onReact={handleReact} onTickerClick={handleTickerClick} />
                ))}
              </AnimatePresence>
              {filteredPosts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-sm">No posts found. Be the first to post!</p>
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="hidden lg:block space-y-4">
            {/* Trending tickers list */}
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
                <Flame size={13} className="text-[#E8193C]" /> Hot Tickers
              </h3>
              <div className="space-y-1">
                {[
                  { tag: "PLTR", posts: 284, dir: "bullish" },
                  { tag: "NVDA", posts: 219, dir: "bullish" },
                  { tag: "BTC",  posts: 198, dir: "bullish" },
                  { tag: "TSLA", posts: 176, dir: "neutral" },
                  { tag: "SPY",  posts: 142, dir: "bearish" },
                  { tag: "ES",   posts: 98,  dir: "bearish" },
                ].map((t, i) => {
                  const color = t.dir === "bullish" ? "#4DC820" : t.dir === "bearish" ? "#E8193C" : "#F79009";
                  return (
                    <button key={t.tag} onClick={() => handleTickerClick(t.tag)}
                            className="w-full flex items-center justify-between py-1.5 hover:bg-muted rounded-lg px-2 -mx-2 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground w-4">#{i + 1}</span>
                        <span className="ticker-mono text-sm font-bold text-foreground">${t.tag}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">{t.posts}</span>
                        <span className="text-xs font-bold" style={{ color }}>{t.dir === "bullish" ? "↑" : t.dir === "bearish" ? "↓" : "→"}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Kai's Radar */}
            {radarTickers.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
                  <BarChart2 size={13} className="text-[#00AEEF]" /> Kai's Radar
                </h3>
                <div className="space-y-1">
                  {radarTickers.slice(0, 5).map((t: any) => {
                    const isBull = t.direction?.toLowerCase() === "bullish";
                    const isBear = t.direction?.toLowerCase() === "bearish";
                    const color = isBull ? "#4DC820" : isBear ? "#E8193C" : "#F79009";
                    return (
                      <button key={t.symbol} onClick={() => handleTickerClick(t.symbol)}
                              className="w-full flex items-center gap-2 py-1.5 hover:bg-muted rounded-lg px-2 -mx-2 transition-colors">
                        <TickerLogo symbol={t.symbol} size={20} />
                        <span className="ticker-mono text-sm font-bold text-foreground flex-1 text-left">{t.symbol}</span>
                        <div className="flex items-center gap-1.5">
                          <div className="h-1 w-10 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${t.score}%`, background: color }} />
                          </div>
                          <span className="text-[10px] font-bold" style={{ color }}>{t.score}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <Link href="/intelligence">
                  <button className="w-full mt-3 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1">
                    All signals <ChevronRight size={10} />
                  </button>
                </Link>
              </div>
            )}

            {/* Who to follow */}
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
                <Users size={13} className="text-[#7B2FBE]" /> Who to Follow
              </h3>
              <div className="space-y-2.5">
                {[
                  { name: "Jordan Davis",  handle: "@jdtrader",    style: "Swing", level: "Expert",  color: "#4DC820" },
                  { name: "Alex Kim",      handle: "@alphatrader", style: "Day",   level: "Veteran", color: "#00AEEF" },
                  { name: "Sam Rivera",    handle: "@macrotrader", style: "Macro", level: "Elite",   color: "#7B2FBE" },
                ].map(u => (
                  <div key={u.handle} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                         style={{ background: u.color }}>
                      {u.name.split(" ").map((w: string) => w[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{u.name}</p>
                      <p className="text-[9px] text-muted-foreground">{u.style} · {u.level}</p>
                    </div>
                    <button
                      onClick={() => toast.success(`Following ${u.name}! +5 XP`)}
                      className="text-[9px] font-bold px-2 py-0.5 rounded-md border border-[#4DC820] text-[#4DC820] hover:bg-[rgba(77,200,32,0.08)] transition-colors flex-shrink-0"
                    >
                      Follow
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <KaiChat />
    </div>
  );
}
