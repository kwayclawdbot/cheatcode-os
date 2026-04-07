// CheatCode OS — Ticker Page (/tickers/:symbol)
// Full-page ticker hub: community sentiment, top posts, Kai's signal, and related videos.
// Clicking a $TICKER pill anywhere in the app navigates here.

import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, MessageCircle, Repeat2, Bookmark, Share2,
  BarChart2, Play, ThumbsUp, ThumbsDown, TrendingUp, TrendingDown,
  Flame, Zap, ChevronDown, ArrowUpRight, Activity,
} from "lucide-react";
import { toast } from "sonner";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { TickerLogo } from "@/components/intelligence/TickerLogo";
import {
  fetchTicker, fetchContentByTicker, fetchContent, fetchFeed,
  likePost, repostPost, bookmarkPost, createComment, fetchComments,
} from "@/lib/api";

// ─── XP Level System ─────────────────────────────────────────────────────────
const XP_LEVELS = [
  { level: 1, name: "Rookie",     minXP: 0,     color: "#667085" },
  { level: 2, name: "Apprentice", minXP: 500,   color: "#00AEEF" },
  { level: 3, name: "Trader",     minXP: 1500,  color: "#7B2FBE" },
  { level: 4, name: "Veteran",    minXP: 4000,  color: "#F79009" },
  { level: 5, name: "Elite",      minXP: 10000, color: "#E8193C" },
  { level: 6, name: "Legend",     minXP: 25000, color: "#4DC820" },
];
function getLevel(xp: number) {
  return XP_LEVELS.slice().reverse().find(l => xp >= l.minXP) || XP_LEVELS[0];
}

// ─── Post Types ───────────────────────────────────────────────────────────────
type PostType = "trade_idea" | "pl_share" | "market_take" | "question";
const POST_TYPE_CONFIG: Record<PostType, { label: string; color: string }> = {
  trade_idea:  { label: "Trade Idea",  color: "#00AEEF" },
  pl_share:    { label: "P&L Share",   color: "#4DC820" },
  market_take: { label: "Market Take", color: "#7B2FBE" },
  question:    { label: "Question",    color: "#667085" },
};

// ─── Post Card (compact) ──────────────────────────────────────────────────────
function TickerPostCard({ post }: { post: any }) {
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [localLikes, setLocalLikes] = useState(post.reactions?.[0]?.count || post.likes || 0);
  const [localReposts, setLocalReposts] = useState(post.reposts || 0);
  const [bookmarked, setBookmarked] = useState(false);
  const [reposted, setReposted] = useState(false);

  const typeConfig = POST_TYPE_CONFIG[(post.type as PostType)] || POST_TYPE_CONFIG.market_take;
  const level = getLevel(post.user?.xp || 0);
  const displayText = post.text || post.thesis || "";
  const isLong = displayText.length > 200;

  const handleToggleComments = () => {
    if (!showComments && comments.length === 0) {
      fetchComments(post.id).then(setComments).catch(() => {});
    }
    setShowComments(v => !v);
  };
  const handleReshare = () => {
    if (reposted) return;
    setReposted(true);
    setLocalReposts((v: number) => v + 1);
    repostPost(post.id).catch(() => {});
    toast.success("Reshared! +5 XP");
  };
  const handleBookmark = () => {
    setBookmarked(v => !v);
    bookmarkPost(post.id).catch(() => {});
    toast.success(bookmarked ? "Removed from saved" : "Saved! +2 XP");
  };
  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/community?post=${post.id}`).catch(() => {});
    toast.success("Link copied!");
  };
  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    const text = commentText.trim();
    setCommentText("");
    setComments(prev => [...prev, { id: Date.now(), body: text, user: { name: "You" } }]);
    createComment(post.id, text).catch(() => {});
    toast.success("Comment posted! +5 XP");
  };

  return (
    <div className="bg-card rounded-xl border border-border p-3 hover:border-border/80 transition-all">
      {/* Header */}
      <div className="flex items-start gap-2.5 mb-2">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
             style={{ background: post.user?.color || "#4DC820" }}>
          {post.user?.initials || (post.user?.name || "T")[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <Link href={`/traders/${(post.user?.handle || "trader").replace("@", "")}`}>
              <span className="font-bold text-foreground text-sm hover:underline cursor-pointer">
                {post.user?.name || "Trader"}
              </span>
            </Link>
            <span className="text-[10px] text-muted-foreground">{post.user?.handle || "@trader"}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: level.color }}>
              {level.name}
            </span>
            {post.user?.style && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground hidden sm:inline">
                {post.user.style}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: typeConfig.color + "18", color: typeConfig.color }}>
              {typeConfig.label}
            </span>
            {post.sentiment && (
              <span className="text-[9px] font-bold"
                    style={{ color: post.sentiment === "bullish" ? "#4DC820" : post.sentiment === "bearish" ? "#E8193C" : "#F79009" }}>
                {post.sentiment === "bullish" ? "🔥 Bullish" : post.sentiment === "bearish" ? "🐻 Bearish" : "👀 Neutral"}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto">{post.timestamp || "now"}</span>
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

      {/* Body */}
      {displayText && (
        <p className="text-sm text-foreground leading-relaxed mb-2">
          {isLong && !expanded ? displayText.slice(0, 200) + "…" : displayText}
          {isLong && (
            <button onClick={() => setExpanded(!expanded)}
                    className="text-[#4DC820] font-bold ml-1 hover:underline text-xs">
              {expanded ? "less" : "more"}
            </button>
          )}
        </p>
      )}

      {/* Key levels */}
      {post.type === "trade_idea" && (post.entry || post.target || post.stop) && (
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          {[
            { label: "Entry", value: post.entry, color: "#667085" },
            { label: "Target", value: post.target, color: "#4DC820" },
            { label: "Stop", value: post.stop, color: "#E8193C" },
          ].filter(k => k.value).map(k => (
            <div key={k.label} className="bg-muted rounded-lg p-1.5 text-center">
              <p className="text-[8px] font-bold uppercase tracking-wide mb-0.5" style={{ color: k.color }}>{k.label}</p>
              <p className="text-xs font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1.5 border-t border-border">
        <button onClick={handleToggleComments}
                className="flex items-center gap-1 text-[11px] transition-colors"
                style={{ color: showComments ? "#4DC820" : "var(--muted-foreground)" }}>
          <MessageCircle size={12} /> {post.comments || 0}
        </button>
        <button onClick={handleReshare}
                className="flex items-center gap-1 text-[11px] transition-colors"
                style={{ color: reposted ? "#4DC820" : "var(--muted-foreground)" }}>
          <Repeat2 size={12} /> {localReposts}
        </button>
        <button onClick={handleBookmark} className="transition-colors"
                style={{ color: bookmarked ? "#4DC820" : "var(--muted-foreground)" }}>
          <Bookmark size={12} fill={bookmarked ? "#4DC820" : "none"} />
        </button>
        <button onClick={handleShare} className="text-muted-foreground hover:text-foreground transition-colors">
          <Share2 size={12} />
        </button>
      </div>

      {/* Inline comments */}
      <AnimatePresence>
        {showComments && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-2 border-t border-border mt-1.5 space-y-2">
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground flex-shrink-0 mt-0.5">Y</div>
                <div className="flex-1 flex gap-1.5">
                  <input type="text" value={commentText} onChange={e => setCommentText(e.target.value)}
                         onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); } }}
                         placeholder="Add a comment…"
                         className="flex-1 text-xs bg-muted rounded-lg px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground outline-none border border-transparent focus:border-border transition-colors" />
                  {commentText.trim() && (
                    <button onClick={handleSubmitComment}
                            className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg text-white flex-shrink-0"
                            style={{ background: "#4DC820" }}>
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
              {comments.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-1">No comments yet. Be first!</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main TickerPage ──────────────────────────────────────────────────────────
type TickerTab = "feed" | "signal" | "videos" | "sentiment";

export default function TickerPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = (params.symbol || "").toUpperCase();

  const [activeTab, setActiveTab] = useState<TickerTab>("feed");
  const [tickerData, setTickerData] = useState<any>(null);
  const [tickerLoading, setTickerLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [videos, setVideos] = useState<any[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [bullVotes, setBullVotes] = useState(62);
  const [bearVotes, setBearVotes] = useState(38);
  const [voted, setVoted] = useState<"bull" | "bear" | null>(null);

  useEffect(() => {
    if (!symbol) return;
    setTickerLoading(true);
    setPostsLoading(true);

    // Fetch ticker intelligence
    fetchTicker(symbol).then(setTickerData).catch(() => {}).finally(() => setTickerLoading(false));

    // Fetch community posts about this ticker
    fetchFeed("discover").then((data: any[]) => {
      const filtered = data.filter((p: any) =>
        p.ticker?.toUpperCase() === symbol ||
        p.body?.toUpperCase().includes(`$${symbol}`) ||
        p.text?.toUpperCase().includes(`$${symbol}`)
      );
      const mapped = filtered.map((p: any) => ({
        id: p.id || String(Math.random()),
        type: (p.post_type || p.type || "market_take") as PostType,
        user: {
          name: p.user?.display_name || p.user?.name || "Trader",
          handle: `@${p.user?.handle || "trader"}`,
          initials: (p.user?.display_name || p.user?.name || "T").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
          color: "#4DC820",
          style: p.user?.trading_style || "Trader",
          xp: p.user?.xp || 0,
        },
        timestamp: p.created_at ? new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "now",
        sentiment: p.sentiment,
        ticker: p.ticker,
        text: p.body || p.text,
        thesis: p.thesis,
        outcome: p.outcome,
        pnl: p.pnl,
        entry: p.entry_price ? `$${p.entry_price}` : undefined,
        target: p.target_price ? `$${p.target_price}` : undefined,
        stop: p.stop_price ? `$${p.stop_price}` : undefined,
        reactions: p.reactions || [{ emoji: "🔥", count: p.likes || 0 }],
        comments: p.comment_count || 0,
        reposts: p.repost_count || 0,
      }));
      setPosts(mapped);
    }).catch(() => {}).finally(() => setPostsLoading(false));
  }, [symbol]);

  useEffect(() => {
    if (activeTab !== "videos" || !symbol) return;
    setVideosLoading(true);
    fetchContentByTicker(symbol)
      .then(r => setVideos(Array.isArray(r) ? r : []))
      .catch(() => fetchContent({ topic: symbol.toLowerCase() }).then(r => setVideos(r || [])).catch(() => {}))
      .finally(() => setVideosLoading(false));
  }, [activeTab, symbol]);

  const isBull = tickerData?.direction?.toLowerCase() === "bullish";
  const isBear = tickerData?.direction?.toLowerCase() === "bearish";
  const scoreColor = isBull ? "#4DC820" : isBear ? "#E8193C" : "#F79009";
  const dirLabel = isBull ? "Bullish" : isBear ? "Bearish" : "Neutral";

  const total = bullVotes + bearVotes;
  const bullPct = Math.round((bullVotes / total) * 100);
  const bearPct = 100 - bullPct;

  const handleVote = (dir: "bull" | "bear") => {
    if (voted) return;
    setVoted(dir);
    if (dir === "bull") setBullVotes(v => v + 1);
    else setBearVotes(v => v + 1);
    toast.success(`Voted ${dir === "bull" ? "Bullish" : "Bearish"} on $${symbol}! +10 XP`);
  };

  const TABS: { id: TickerTab; label: string; icon: React.ReactNode }[] = [
    { id: "feed",      label: "Community Feed", icon: <MessageCircle size={13} /> },
    { id: "signal",    label: "Kai's Signal",   icon: <Zap size={13} /> },
    { id: "videos",    label: "Videos",         icon: <Play size={13} /> },
    { id: "sentiment", label: "Sentiment Vote", icon: <Activity size={13} /> },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Nav />
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Back button */}
        <Link href="/">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5">
            <ArrowLeft size={14} />
            Back to Feed
          </button>
        </Link>

        {/* Ticker Hero */}
        <div className="rounded-2xl border border-border p-5 mb-6"
             style={{ background: scoreColor + "06" }}>
          {tickerLoading ? (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-muted animate-pulse" />
              <div className="space-y-2">
                <div className="h-6 w-32 bg-muted rounded animate-pulse" />
                <div className="h-4 w-48 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <TickerLogo symbol={symbol} size={56} className="rounded-xl flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-2xl font-black text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                    ${symbol}
                  </span>
                  {tickerData?.name && (
                    <span className="text-sm text-muted-foreground">{tickerData.name}</span>
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ background: scoreColor }}>
                    {dirLabel}
                  </span>
                  {tickerData?.convergence_score != null && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      Score {Math.round(tickerData.convergence_score)}
                    </span>
                  )}
                </div>
                {tickerData?.last_price != null && (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                      ${tickerData.last_price.toFixed(2)}
                    </span>
                    {tickerData.price_change_pct != null && (
                      <span className="text-sm font-bold flex items-center gap-0.5"
                            style={{ color: tickerData.price_change_pct >= 0 ? "#4DC820" : "#E8193C" }}>
                        {tickerData.price_change_pct >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {tickerData.price_change_pct >= 0 ? "+" : ""}{tickerData.price_change_pct.toFixed(2)}%
                      </span>
                    )}
                  </div>
                )}
                {tickerData?.catalyst && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tickerData.catalyst}</p>
                )}
              </div>
              {/* Quick stats */}
              <div className="flex gap-3 flex-shrink-0">
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Posts</p>
                  <p className="text-lg font-black text-foreground">{posts.length || "—"}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Bull%</p>
                  <p className="text-lg font-black" style={{ color: "#4DC820" }}>{bullPct}%</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 border-b border-border overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-colors relative flex-shrink-0"
              style={{ color: activeTab === tab.id ? "#4DC820" : "var(--muted-foreground)" }}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="ticker-tab-indicator"
                            className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                            style={{ background: "#4DC820" }} />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {/* COMMUNITY FEED */}
          {activeTab === "feed" && (
            <motion.div key="feed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {postsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-card rounded-xl border border-border p-4">
                      <div className="flex gap-2.5 mb-3">
                        <div className="w-9 h-9 rounded-full bg-muted animate-pulse flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                          <div className="h-3 w-48 bg-muted rounded animate-pulse" />
                        </div>
                      </div>
                      <div className="h-4 w-full bg-muted rounded animate-pulse mb-1.5" />
                      <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : posts.length > 0 ? (
                <div className="space-y-3">
                  {posts.map(post => (
                    <TickerPostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <MessageCircle size={20} className="text-muted-foreground" />
                  </div>
                  <p className="font-bold text-foreground mb-1">No posts about ${symbol} yet</p>
                  <p className="text-sm text-muted-foreground mb-4">Be the first to share your take</p>
                  <Link href="/community">
                    <button className="text-sm font-bold px-4 py-2 rounded-xl text-white"
                            style={{ background: "#4DC820" }}>
                      Post about ${symbol}
                    </button>
                  </Link>
                </div>
              )}
            </motion.div>
          )}

          {/* KAI'S SIGNAL */}
          {activeTab === "signal" && (
            <motion.div key="signal" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {tickerLoading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 rounded-full border-2 border-[#4DC820] border-t-transparent animate-spin mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Loading signal data…</p>
                </div>
              ) : tickerData ? (
                <div className="space-y-4">
                  {/* Score cards */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Convergence Score", value: Math.round(tickerData.convergence_score || 0), color: scoreColor, large: true },
                      { label: "Direction", value: tickerData.direction || dirLabel, color: scoreColor, large: false },
                      { label: "Timeframe", value: tickerData.timeframe || "Swing", color: "var(--foreground)", large: false },
                    ].map(item => (
                      <div key={item.label} className="bg-card rounded-xl border border-border p-4 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">{item.label}</p>
                        <p className={`font-black ${item.large ? "text-3xl" : "text-lg"}`} style={{ color: item.color }}>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Kai's take */}
                  {tickerData.analysis && (
                    <div className="bg-card rounded-xl border border-border p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                             style={{ background: "#4DC820" }}>K</div>
                        <p className="text-xs font-bold text-foreground">Kai's Take</p>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{tickerData.analysis}</p>
                    </div>
                  )}

                  {/* Catalyst */}
                  {tickerData.catalyst && (
                    <div className="bg-card rounded-xl border border-border p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Catalyst</p>
                      <p className="text-sm text-foreground leading-relaxed">{tickerData.catalyst}</p>
                    </div>
                  )}

                  {/* Key levels */}
                  {tickerData.key_levels && (
                    <div className="bg-card rounded-xl border border-border p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-3">Key Levels</p>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "Support",      value: tickerData.key_levels.support,      color: "#4DC820" },
                          { label: "Resistance",   value: tickerData.key_levels.resistance,   color: "#E8193C" },
                          { label: "Invalidation", value: tickerData.key_levels.invalidation, color: "#F79009" },
                        ].map(k => (
                          <div key={k.label} className="bg-muted rounded-xl p-3 text-center">
                            <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: k.color }}>{k.label}</p>
                            <p className="text-sm font-black text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                              {k.value || "—"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Evidence chain */}
                  {tickerData.evidence_chain && tickerData.evidence_chain.length > 0 && (
                    <div className="bg-card rounded-xl border border-border p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-3">Evidence Chain</p>
                      <div className="space-y-2">
                        {tickerData.evidence_chain.slice(0, 5).map((e: any, i: number) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                                 style={{ background: e.direction === "bullish" ? "#4DC820" : e.direction === "bearish" ? "#E8193C" : "#F79009" }} />
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold text-foreground">{e.source}: </span>
                              <span className="text-xs text-muted-foreground">{e.signal}</span>
                            </div>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                  style={{
                                    background: e.direction === "bullish" ? "#4DC82018" : e.direction === "bearish" ? "#E8193C18" : "#F7900918",
                                    color: e.direction === "bullish" ? "#4DC820" : e.direction === "bearish" ? "#E8193C" : "#F79009",
                                  }}>
                              {e.direction}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Link href={`/intelligence?ticker=${symbol}`}>
                    <button className="w-full text-xs font-bold py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors flex items-center justify-center gap-1">
                      View full analysis with charts <ArrowUpRight size={11} />
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-16">
                  <Zap size={32} className="text-muted-foreground mx-auto mb-3" />
                  <p className="font-bold text-foreground mb-1">No signal data for ${symbol}</p>
                  <p className="text-sm text-muted-foreground">Kai hasn't analyzed this ticker yet</p>
                </div>
              )}
            </motion.div>
          )}

          {/* VIDEOS */}
          {activeTab === "videos" && (
            <motion.div key="videos" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {videosLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-card rounded-xl overflow-hidden border border-border">
                      <div className="aspect-video bg-muted animate-pulse" />
                      <div className="p-3 space-y-1.5">
                        <div className="h-3 w-full bg-muted rounded animate-pulse" />
                        <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : videos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {videos.map((v: any) => (
                    <Link key={v.id || v.video_id} href={`/video/${v.id || v.video_id}`}>
                      <div className="group bg-card rounded-xl overflow-hidden border border-border hover:shadow-md transition-all cursor-pointer">
                        <div className="relative aspect-video bg-muted">
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
                        <div className="p-3">
                          <p className="text-xs font-bold text-foreground line-clamp-2 leading-tight">{v.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{v.creator_name || v.channel_name}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Play size={32} className="text-muted-foreground mx-auto mb-3" />
                  <p className="font-bold text-foreground mb-1">No videos about ${symbol} yet</p>
                  <p className="text-sm text-muted-foreground">Check back later as creators cover this ticker</p>
                </div>
              )}
            </motion.div>
          )}

          {/* SENTIMENT VOTE */}
          {activeTab === "sentiment" && (
            <motion.div key="sentiment" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="max-w-md mx-auto">
                <div className="bg-card rounded-2xl border border-border p-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <TickerLogo symbol={symbol} size={32} className="rounded-lg" />
                    <span className="text-xl font-black text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                      ${symbol}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">What's your take on ${symbol} right now?</p>

                  {/* Vote buttons */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <button
                      onClick={() => handleVote("bull")}
                      disabled={!!voted}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all"
                      style={{
                        borderColor: voted === "bull" ? "#4DC820" : voted ? "var(--border)" : "var(--border)",
                        background: voted === "bull" ? "#4DC82012" : "transparent",
                        opacity: voted && voted !== "bull" ? 0.5 : 1,
                      }}
                    >
                      <ThumbsUp size={24} style={{ color: "#4DC820" }} />
                      <span className="font-bold text-sm" style={{ color: "#4DC820" }}>Bullish</span>
                      <span className="text-xs text-muted-foreground">{bullVotes} votes</span>
                    </button>
                    <button
                      onClick={() => handleVote("bear")}
                      disabled={!!voted}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all"
                      style={{
                        borderColor: voted === "bear" ? "#E8193C" : voted ? "var(--border)" : "var(--border)",
                        background: voted === "bear" ? "#E8193C12" : "transparent",
                        opacity: voted && voted !== "bear" ? 0.5 : 1,
                      }}
                    >
                      <ThumbsDown size={24} style={{ color: "#E8193C" }} />
                      <span className="font-bold text-sm" style={{ color: "#E8193C" }}>Bearish</span>
                      <span className="text-xs text-muted-foreground">{bearVotes} votes</span>
                    </button>
                  </div>

                  {/* Sentiment bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span style={{ color: "#4DC820" }}>🔥 {bullPct}% Bullish</span>
                      <span style={{ color: "#E8193C" }}>🐻 {bearPct}% Bearish</span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden bg-muted flex">
                      <motion.div
                        className="h-full rounded-l-full"
                        style={{ background: "#4DC820" }}
                        animate={{ width: `${bullPct}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                      <motion.div
                        className="h-full rounded-r-full"
                        style={{ background: "#E8193C" }}
                        animate={{ width: `${bearPct}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {total} community votes · {voted ? "You voted!" : "Cast your vote above"}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Kai Chat FAB */}
      <KaiChat />
    </div>
  );
}
