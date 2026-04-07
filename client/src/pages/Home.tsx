// CheatCode OS — Home Page (Community-First Redesign)
// Vision: The home feed IS the community. Traders come here to see what's happening
// right now — who's posting, what setups are hot, what the market is doing.
// YouTube content lives in the secondary "Watch" shelf below the fold.
//
// Layout:
//   Left 2/3  → Community feed (live posts + compose)
//   Right 1/3 → Market Pulse sidebar (indices, trending traders, Kai's radar)
//   Below     → Watch shelf (top YouTube picks from Railway API)

import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, MessageCircle, Repeat2,
  Bookmark, Share2, Flame, ChevronRight, ChevronLeft,
  ArrowUpRight, Trophy, Activity,
  Pencil, Send
} from "lucide-react";
import { toast } from "sonner";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { VideoCard } from "@/components/shared/VideoCard";
import { TickerLogo } from "@/components/intelligence/TickerLogo";
import { useTheme } from "@/contexts/ThemeContext";
import {
  fetchFeed, fetchRadar, fetchHome, fetchMarketSummary, fetchLeaderboard,
  likePost, unlikePost, repostPost, bookmarkPost, createPost, createComment, fetchComments,
  normalizeContentCard,
} from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { syncCreatorRegistry, getCreatorAvatar, getCreatorColor } from "@/lib/creatorRegistry";

// ─── Types ────────────────────────────────────────────────────────────────────

type PostType = "trade_idea" | "pl_share" | "market_take" | "question";
type Sentiment = "bullish" | "bearish" | "neutral";

interface Reaction { emoji: string; label: string; count: number; active?: boolean; }

interface Post {
  id: string;
  type: PostType;
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

const POST_TYPE_CONFIG: Record<PostType, { label: string; color: string }> = {
  trade_idea:  { label: "Trade Idea",  color: "#00AEEF" },
  pl_share:    { label: "P&L Share",   color: "#4DC820" },
  market_take: { label: "Market Take", color: "#7B2FBE" },
  question:    { label: "Question",    color: "#667085" },
};

const SEED_POSTS: Post[] = [
  {
    id: "s1", type: "trade_idea",
    user: { name: "Jordan Davis", handle: "@jdtrader", initials: "JD", color: "#4DC820", style: "Swing Trader", level: "Expert", levelColor: "#F79009" },
    timestamp: "2h", sentiment: "bullish", ticker: "PLTR", timeframe: "Swing",
    entry: "$24.50", target: "$32.00", stop: "$21.80",
    thesis: "Breaking out of a 6-week base on heavy volume. Institutional accumulation visible on the daily. Risk/reward is 3:1.",
    reactions: [{ emoji: "🔥", label: "Bullish", count: 47 }, { emoji: "👀", label: "Watching", count: 23 }],
    comments: 14, reposts: 6,
  },
  {
    id: "s2", type: "pl_share",
    user: { name: "Alex Kim", handle: "@alphatrader", initials: "AK", color: "#00AEEF", style: "Day Trader", level: "Veteran", levelColor: "#F04438" },
    timestamp: "4h", outcome: "win", ticker: "NVDA", pnl: "+$2,840",
    text: "Caught the morning breakout on NVDA. Entered at $118.20 off the 9 EMA, took half off at $121 and let the rest run to $124.50.",
    reactions: [{ emoji: "🔥", label: "Bullish", count: 89 }, { emoji: "❤️", label: "Like", count: 134 }],
    comments: 28, reposts: 19,
  },
  {
    id: "s3", type: "market_take",
    user: { name: "Sam Rivera", handle: "@macrotrader", initials: "SR", color: "#7B2FBE", style: "Macro", level: "Elite", levelColor: "#E8193C" },
    timestamp: "6h", sentiment: "bearish",
    text: "The market is pricing in 3 rate cuts this year but the data doesn't support it. CPI is still sticky. I think we see a repricing in Q2.",
    reactions: [{ emoji: "🐻", label: "Bearish", count: 62 }, { emoji: "👀", label: "Watching", count: 44 }],
    comments: 41, reposts: 27,
  },
];

// ─── Mini Post Card ───────────────────────────────────────────────────────────

function MiniPostCard({ post, onReact }: { post: Post; onReact: (id: string, emoji: string) => void }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [localComments, setLocalComments] = useState(post.comments);
  const [localReposts, setLocalReposts] = useState(post.reposts);
  const [bookmarked, setBookmarked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  const typeConfig = POST_TYPE_CONFIG[post.type];
  const sentColor = post.sentiment === "bullish" ? "#4DC820" : post.sentiment === "bearish" ? "#E8193C" : "#F79009";
  const displayText = post.text || post.thesis || "";

  const handleToggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next && !commentsLoaded) {
      setCommentsLoaded(true);
      fetchComments(post.id).then(data => setComments(Array.isArray(data) ? data : [])).catch(() => {});
    }
  };

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    const body = commentText.trim();
    setCommentText("");
    setLocalComments(c => c + 1);
    setComments(prev => [{ id: Date.now().toString(), body, user: { name: "You" } }, ...prev]);
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
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast.success("Link copied!")).catch(() => {});
    else toast.success("Link: " + url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border p-3 hover:border-border/60 transition-all"
    >
      {/* Header */}
      <div className="flex items-start gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
             style={{ background: post.user.color }}>
          {post.user.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link href={`/traders/${post.user.handle.replace("@", "")}`}>
              <span className="font-bold text-foreground text-sm hover:underline cursor-pointer">{post.user.name}</span>
            </Link>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{post.user.style}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: post.user.levelColor + "cc" }}>{post.user.level}</span>
            {post.ticker && (
              <Link href={`/intelligence?ticker=${post.ticker}`}>
                <span className="flex items-center gap-0.5 ticker-mono text-[11px] font-black px-1.5 py-0.5 rounded-lg hover:bg-muted transition-colors"
                      style={{ color: sentColor }}>
                  <TickerLogo symbol={post.ticker} size={14} />
                  ${post.ticker}
                </span>
              </Link>
            )}
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: typeConfig.color + "18", color: typeConfig.color }}>
              {typeConfig.label}
            </span>
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

      {/* Body */}
      {displayText && (
        <p className="text-sm text-foreground leading-relaxed mb-2">{displayText}</p>
      )}

      {/* Trade levels */}
      {post.type === "trade_idea" && (post.entry || post.target || post.stop) && (
        <div className="grid grid-cols-3 gap-1.5 mb-2">
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
      )}

      {/* Reactions + actions */}
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
          >
            <Repeat2 size={12} /> {localReposts}
          </button>
          <button
            onClick={handleBookmark}
            className="transition-colors"
            style={{ color: bookmarked ? "#4DC820" : "var(--muted-foreground)" }}
          >
            <Bookmark size={12} fill={bookmarked ? "#4DC820" : "none"} />
          </button>
          <button onClick={handleShare} className="text-muted-foreground hover:text-foreground transition-colors">
            <Share2 size={12} />
          </button>
        </div>
      </div>

      {/* Inline comments */}
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

// ─── Compact Compose ─────────────────────────────────────────────────────────

function ComposeBar({ onPost }: { onPost: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onPost(text.trim());
    setText("");
    setOpen(false);
    toast.success("Posted! +15 XP");
  };

  return (
    <div className="bg-card rounded-xl border border-border p-3">
      {!open ? (
        <button
          onClick={() => { setOpen(true); setTimeout(() => textareaRef.current?.focus(), 50); }}
          className="w-full flex items-center gap-3 text-muted-foreground text-sm hover:text-foreground transition-colors"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white cc-gradient-bg flex-shrink-0">
            <Pencil size={13} />
          </div>
          <span>What's your market take today?</span>
        </button>
      ) : (
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Share a trade idea, market take, or P&L…"
            className="w-full text-sm bg-muted rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none border border-transparent focus:border-border transition-colors resize-none"
            rows={3}
          />
          <div className="flex items-center justify-between">
            <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg cc-gradient-bg text-[#101828] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={11} /> Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Home Page ───────────────────────────────────────────────────────────

export default function Home() {
  const { theme } = useTheme();

  // Feed state
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedFilter, setFeedFilter] = useState<"trending" | "latest" | "trade_ideas">("trending");

  // Sidebar data
  const [radarTickers, setRadarTickers] = useState<any[]>([]);
  const [topTraders, setTopTraders] = useState<any[]>([]);
  const [marketSummary, setMarketSummary] = useState<any>(null);

  // Watch shelf
  const { data: homeData } = useApi(fetchHome, null);

  useEffect(() => { syncCreatorRegistry(); }, []);

  // Load community feed
  useEffect(() => {
    setFeedLoading(true);
    const tab = feedFilter === "latest" ? "discover" : "trending";
    fetchFeed(tab, 1).then((data: any[]) => {
      if (Array.isArray(data) && data.length > 0) {
        const normalized: Post[] = data.map((p: any) => ({
          id: p.id,
          type: (p.post_type || "market_take") as PostType,
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
        const filtered = feedFilter === "trade_ideas" ? normalized.filter(p => p.type === "trade_idea") : normalized;
        setPosts(filtered.length ? filtered : SEED_POSTS);
      } else {
        setPosts(SEED_POSTS);
      }
    }).catch(() => setPosts(SEED_POSTS)).finally(() => setFeedLoading(false));
  }, [feedFilter]);

  // Load sidebar data
  useEffect(() => {
    fetchRadar().then(r => {
      const all = [...(r.critical || []), ...(r.high_conviction || []), ...(r.watch || [])].slice(0, 8);
      setRadarTickers(all);
    }).catch(() => {});
    fetchLeaderboard("xp").then(data => {
      if (Array.isArray(data)) setTopTraders(data.slice(0, 5));
    }).catch(() => {});
    fetchMarketSummary().then(data => setMarketSummary(data)).catch(() => {});
  }, []);

  const handleReact = (postId: string, emoji: string) => {
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
    if (wasLiked) unlikePost(postId).catch(() => {});
    else likePost(postId).catch(() => {});
  };

  const handlePost = (text: string) => {
    const newPost: Post = {
      id: Date.now().toString(), type: "market_take",
      user: { name: "You", handle: "@you", initials: "YO", color: "#4DC820", style: "Trader", level: "Rookie", levelColor: "#667085" },
      timestamp: "Just now", text,
      reactions: [{ emoji: "🔥", label: "Bullish", count: 0 }, { emoji: "❤️", label: "Like", count: 0 }],
      comments: 0, reposts: 0,
    };
    setPosts(prev => [newPost, ...prev]);
    createPost({ post_type: "market_take", body: text }).catch(() => {});
  };

  // Watch shelf videos
  const watchVideos = homeData?.todays_picks?.slice(0, 6).map(normalizeContentCard) || [];
  const watchRef = useRef<HTMLDivElement>(null);
  const scrollWatch = (dir: "left" | "right") => {
    if (watchRef.current) watchRef.current.scrollBy({ left: dir === "right" ? 320 : -320, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* Market ticker strip */}
      {marketSummary?.indices?.length > 0 && (
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-[57px] z-10">
          <div className="container mx-auto">
            <div className="flex items-center gap-6 py-1.5 overflow-x-auto scrollbar-hide">
              {marketSummary.indices.map((idx: any) => {
                const isUp = idx.change_pct >= 0;
                return (
                  <div key={idx.symbol} className="flex items-center gap-2 flex-shrink-0">
                    <span className="ticker-mono text-xs font-black text-foreground">{idx.symbol}</span>
                    <span className="text-xs font-bold text-foreground">{idx.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    <span className="text-[10px] font-bold flex items-center gap-0.5" style={{ color: isUp ? "#4DC820" : "#E8193C" }}>
                      {isUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                      {isUp ? "+" : ""}{idx.change_pct.toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto py-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Left: Community Feed ── */}
          <div className="lg:col-span-2 space-y-3">
            {/* Feed header */}
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-black text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                Community Feed
              </h1>
              <Link href="/community">
                <span className="text-xs font-semibold cc-gradient-text flex items-center gap-1">
                  Full Feed <ChevronRight size={12} />
                </span>
              </Link>
            </div>

            {/* Feed filter tabs */}
            <div className="flex items-center gap-1">
              {(["trending", "latest", "trade_ideas"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFeedFilter(f)}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"
                  style={{
                    background: feedFilter === f ? "var(--primary)" : "transparent",
                    color: feedFilter === f ? "var(--primary-foreground)" : "var(--muted-foreground)",
                  }}
                >
                  {f === "trade_ideas" ? "Trade Ideas" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Compose bar */}
            <ComposeBar onPost={handlePost} />

            {/* Posts */}
            {feedLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-card rounded-xl border border-border p-3 animate-pulse">
                    <div className="flex gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-muted rounded w-1/3" />
                        <div className="h-2.5 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-3 bg-muted rounded" />
                      <div className="h-3 bg-muted rounded w-4/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {posts.map(post => (
                    <MiniPostCard key={post.id} post={post} onReact={handleReact} />
                  ))}
                </AnimatePresence>
                {posts.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-sm">No posts yet. Be the first to share!</p>
                  </div>
                )}
              </div>
            )}

            <Link href="/community">
              <button className="w-full py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                See all posts in Community →
              </button>
            </Link>
          </div>

          {/* ── Right: Market Pulse Sidebar ── */}
          <div className="space-y-4">

            {/* Market Indices */}
            {marketSummary?.indices?.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="font-bold text-foreground text-sm mb-2 flex items-center gap-2">
                  <Activity size={14} className="text-[#4DC820]" />
                  Market Pulse
                </h3>
                <div className="divide-y divide-border">
                  {marketSummary.indices.map((idx: any) => {
                    const isUp = idx.change_pct >= 0;
                    return (
                      <div key={idx.symbol} className="flex items-center justify-between py-1.5">
                        <span className="text-xs font-bold text-foreground ticker-mono">{idx.name || idx.symbol}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground ticker-mono">{idx.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                          <span className="text-[10px] font-bold flex items-center gap-0.5" style={{ color: isUp ? "#4DC820" : "#E8193C" }}>
                            {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {isUp ? "+" : ""}{idx.change_pct.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Kai's Radar */}
            {radarTickers.length > 0 && (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-2"
                     style={{ background: "linear-gradient(90deg, #2B3245 0%, #1a2035 100%)" }}>
                  <Flame size={14} className="text-[#C8D400]" />
                  <span className="font-bold text-sm text-white" style={{ fontFamily: "var(--font-display)" }}>Kai's Radar</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full tracking-widest ml-auto"
                        style={{ background: "rgba(77,200,32,0.2)", color: "#4DC820" }}>LIVE</span>
                </div>
                <div className="p-3 space-y-1.5">
                  {radarTickers.slice(0, 6).map((t: any) => {
                    const isUp = t.direction === "bullish" || t.direction === "long";
                    const score = Math.round(t.score || 70);
                    return (
                      <Link key={t.symbol} href={`/intelligence?ticker=${t.symbol}`}>
                        <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                          <TickerLogo symbol={t.symbol} size={20} />
                          <span className="ticker-mono text-xs font-black text-foreground flex-1">{t.symbol}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold" style={{ color: isUp ? "#4DC820" : "#E8193C" }}>
                              {isUp ? "↑" : "↓"} {t.timeframe?.replace(/_/g, " ") || "Swing"}
                            </span>
                            <span className="text-[10px] font-black ticker-mono px-1 py-0.5 rounded"
                                  style={{ background: isUp ? "rgba(77,200,32,0.12)" : "rgba(232,25,60,0.12)", color: isUp ? "#4DC820" : "#E8193C" }}>
                              {score}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <div className="px-3 pb-3">
                  <Link href="/intelligence">
                    <button className="w-full text-[11px] font-bold py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                      Full Intelligence →
                    </button>
                  </Link>
                </div>
              </div>
            )}

            {/* Top Traders */}
            {topTraders.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                    <Trophy size={14} className="text-[#C8D400]" />
                    Top Traders
                  </h3>
                  <Link href="/leaderboard">
                    <span className="text-[10px] font-semibold cc-gradient-text">Leaderboard →</span>
                  </Link>
                </div>
                <div className="space-y-2">
                  {topTraders.map((trader: any, i: number) => {
                    const COLORS = ["#4DC820", "#00AEEF", "#7B2FBE", "#F79009", "#E8193C"];
                    const color = COLORS[i % COLORS.length];
                    const initials = (trader.display_name || trader.handle || "T").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <Link key={trader.handle || i} href={`/traders/${trader.handle || "me"}`}>
                        <div className="flex items-center gap-2.5 py-1 hover:bg-muted rounded-lg px-1.5 transition-colors cursor-pointer">
                          <span className="text-[10px] font-black text-muted-foreground w-4 text-center">#{i + 1}</span>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                               style={{ background: color }}>
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{trader.display_name || trader.handle || "Trader"}</p>
                            <p className="text-[10px] text-muted-foreground">{(trader.xp || 0).toLocaleString()} XP</p>
                          </div>
                          <ArrowUpRight size={12} className="text-muted-foreground flex-shrink-0" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-2.5">
              <Link href="/community">
                <div className="rounded-xl p-3.5 text-center cursor-pointer hover:opacity-90 transition-opacity"
                     style={{ background: "linear-gradient(135deg, #2B3245 0%, #1a2035 100%)" }}>
                  <div className="text-xl mb-1">💬</div>
                  <p className="text-xs font-bold text-white">Community</p>
                  <p className="text-[9px] text-white/50 mt-0.5">Full feed</p>
                </div>
              </Link>
              <Link href="/learn">
                <div className="rounded-xl p-3.5 text-center cursor-pointer hover:opacity-90 transition-opacity cc-gradient-bg">
                  <div className="text-xl mb-1">📚</div>
                  <p className="text-xs font-bold text-[#101828]">Learn</p>
                  <p className="text-[9px] text-[#101828]/60 mt-0.5">Learning paths</p>
                </div>
              </Link>
              <Link href="/journal">
                <div className="rounded-xl p-3.5 text-center cursor-pointer hover:opacity-90 transition-opacity"
                     style={{ background: "linear-gradient(135deg, #7B2FBE22, #7B2FBE44)", border: "1px solid #7B2FBE33" }}>
                  <div className="text-xl mb-1">📓</div>
                  <p className="text-xs font-bold text-foreground">Journal</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Track trades</p>
                </div>
              </Link>
              <Link href="/leaderboard">
                <div className="rounded-xl p-3.5 text-center cursor-pointer hover:opacity-90 transition-opacity"
                     style={{ background: "linear-gradient(135deg, #C8D40022, #C8D40044)", border: "1px solid #C8D40033" }}>
                  <div className="text-xl mb-1">🏆</div>
                  <p className="text-xs font-bold text-foreground">Leaderboard</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Rankings</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Watch Shelf (secondary, below the fold) ── */}
        {watchVideos.length > 0 && (
          <div className="mt-8 relative group/shelf">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: "#E8193C" }} />
                <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                  Watch — Today's Best Picks
                </h2>
              </div>
              <Link href="/topics">
                <span className="text-xs font-semibold flex items-center gap-1 cc-gradient-text opacity-0 group-hover/shelf:opacity-100 transition-opacity">
                  See all <ChevronRight size={12} />
                </span>
              </Link>
            </div>
            <div className="relative">
              <button
                onClick={() => scrollWatch("left")}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-8 h-8 bg-card rounded-full shadow-md flex items-center justify-center opacity-0 group-hover/shelf:opacity-100 transition-opacity border border-border"
              >
                <ChevronLeft size={14} className="text-muted-foreground" />
              </button>
              <div ref={watchRef} className="scroll-row pb-1">
                {watchVideos.map(v => (
                  <VideoCard
                    key={v.id}
                    id={v.id}
                    type={v.content_type as "video" | "podcast"}
                    title={v.title}
                    creatorId={v.creator_slug || ""}
                    creator={{
                      name: v.creator_name || "Unknown",
                      avatar: (v.creator_name || "??").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
                      avatarUrl: getCreatorAvatar(v.creator_slug || ""),
                      color: getCreatorColor(v.creator_slug || "") || "#4DC820",
                    }}
                    thumbnail={v.thumbnailUrl || ""}
                    duration={v.durationLabel || ""}
                    quickTake={v.quick_take || ""}
                    tags={v.topics.map((t: string) => t.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()))}
                    relevanceBadge={v.relevanceLabel || "Watch"}
                    tickers={[]}
                    convergenceScore={Math.round(v.relevance_score * 100)}
                    publishedAt={v.publishedLabel || ""}
                  />
                ))}
              </div>
              <button
                onClick={() => scrollWatch("right")}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-8 h-8 bg-card rounded-full shadow-md flex items-center justify-center opacity-0 group-hover/shelf:opacity-100 transition-opacity border border-border"
              >
                <ChevronRight size={14} className="text-muted-foreground" />
              </button>
            </div>
          </div>
        )}
      </main>

      <KaiChat />
    </div>
  );
}
