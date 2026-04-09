// CheatCode OS — Video Page
// Design: YouTube embed top, Kai enrichment layer below (the product)
// Enrichment: quick take, key insights, ticker pills, quality score, pill badges
// Data: Railway API (content detail) + tRPC ingest.getVideoEnrichment (LLM on-demand)

import { Link, useParams } from "wouter";
import {
  ArrowLeft, ExternalLink, ChevronDown, ChevronUp,
  Play, Clock, Bookmark, Share2, Zap, TrendingUp,
  TrendingDown, Minus, BookOpen, BarChart2, Brain,
  AlertTriangle, Lightbulb, Target, Wifi
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { ScoreRing } from "@/components/shared/ScoreRing";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { fetchContentDetail, fetchContent, normalizeContentCard, trackEvent, fetchContentByTicker } from "@/lib/api";
import { getCreatorAvatar, getCreatorColor } from "@/lib/creatorRegistry";
import { useVideoComments } from "@/hooks/useVideoComments";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { getLoginUrl } from "@/const";
import { MessageCircle, Send, ThumbsUp, Trash2 } from "lucide-react";

// ─── VideoCommentSection ─────────────────────────────────────────────────────

function VideoCommentSection({ videoId }: { videoId: string }) {
  const { user, isAuthenticated } = useSupabaseAuth();
  const { comments, connected, postComment, likeComment, deleteComment, isPosting } = useVideoComments(videoId);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isPosting || !user) return;
    const initials = (user.email || user.user_metadata?.full_name || "?").slice(0, 2).toUpperCase();
    const colors = ["#12B76A", "#2E90FA", "#F79009", "#E8193C", "#7C3AED", "#0EA5E9", "#D946EF"];
    const colorIdx = user.id.split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % colors.length;
    await postComment({
      body: trimmed,
      username: user.user_metadata?.full_name || user.email?.split("@")[0] || "Trader",
      avatarInitials: initials,
      avatarColor: colors[colorIdx],
    });
    setText("");
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getAvatar = (userId: string, username: string) => {
    const colors = ["#12B76A", "#2E90FA", "#F79009", "#E8193C", "#7C3AED", "#0EA5E9", "#D946EF"];
    const idx = userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
    return { color: colors[idx], initials: (username || "?").slice(0, 2).toUpperCase() };
  };

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <span className="font-semibold text-sm text-foreground flex items-center gap-2">
          <MessageCircle size={14} className="text-[#00AEEF]" />
          Community Discussion
          {comments.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">({comments.length})</span>
          )}
        </span>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-[#4DC820]" : "bg-muted-foreground"}`} />
          <span className="text-[10px] text-muted-foreground">{connected ? "Live" : "Offline"}</span>
        </div>
      </div>

      {/* Comment list */}
      <div className="max-h-80 overflow-y-auto">
        {comments.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <MessageCircle size={24} className="text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">No comments yet. Be the first to share your take.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {comments.map((msg) => {
              const isOwn = user?.id === String(msg.userId);
              return (
                <div key={msg.id} className="flex gap-3 px-5 py-3.5 group/comment hover:bg-muted/30 transition-colors">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: msg.avatarColor || "#667085" }}
                  >
                    {msg.avatarInitials || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-foreground">{msg.username}</span>
                      <span className="text-[10px] text-muted-foreground">{formatTime(typeof msg.createdAt === "string" ? new Date(msg.createdAt).getTime() : msg.createdAt instanceof Date ? msg.createdAt.getTime() : msg.createdAt)}</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{msg.body}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <button
                        onClick={() => likeComment(msg.id)}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-[#4DC820] transition-colors"
                      >
                        <ThumbsUp size={10} />
                        {msg.likeCount > 0 && msg.likeCount}
                      </button>
                      {isOwn && (
                        <button
                          onClick={() => deleteComment(msg.id)}
                          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-[#E8193C] transition-colors opacity-0 group-hover/comment:opacity-100"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3">
        {isAuthenticated ? (
          <div className="flex gap-2 items-end">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
              style={{ backgroundColor: user ? getAvatar(user.id, user.email || "").color : "#667085" }}
            >
              {user?.email?.slice(0, 2).toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 flex gap-2">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Share your take on this video..."
                rows={1}
                className="flex-1 bg-muted rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none focus:ring-1 focus:ring-[#00AEEF]/40 min-h-[36px] max-h-24"
                style={{ overflowY: text.includes("\n") || text.length > 80 ? "auto" : "hidden" }}
              />
              <button
                onClick={handleSend}
                disabled={!text.trim() || isPosting}
                className="w-9 h-9 rounded-xl flex items-center justify-center cc-gradient-bg text-[#101828] disabled:opacity-40 transition-opacity flex-shrink-0"
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Sign in to join the discussion</p>
            <a
              href={getLoginUrl()}
              className="text-xs font-semibold text-[#00AEEF] hover:underline"
            >
              Sign In
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────

function CollapsibleSection({
  title, children, defaultOpen = false, icon
}: {
  title: string; children: React.ReactNode; defaultOpen?: boolean; icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl overflow-hidden border border-border bg-card">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-card hover:bg-muted/60 transition-colors"
      >
        <span className="font-semibold text-sm text-foreground flex items-center gap-2">
          {icon}
          {title}
        </span>
        {open
          ? <ChevronUp size={15} className="text-muted-foreground" />
          : <ChevronDown size={15} className="text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
}

function TickerPill({
  ticker, sentiment, context, isPrimary
}: {
  ticker: string; sentiment?: string; context?: string; isPrimary?: boolean;
}) {
  const sentimentColor =
    sentiment === "bullish"
      ? { bg: "#F0FDE8", text: "#2E7A10", border: "#B6F08A", icon: <TrendingUp size={10} /> }
      : sentiment === "bearish"
      ? { bg: "#FFF0F3", text: "#A8001F", border: "#F8A3B1", icon: <TrendingDown size={10} /> }
      : { bg: "#F4F4F5", text: "#52525B", border: "#D4D4D8", icon: <Minus size={10} /> };

  return (
    <Link href={`/tickers/${ticker.toUpperCase()}`}>
      <div
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer transition-all hover:shadow-sm hover:scale-105 active:scale-95"
        style={{ backgroundColor: sentimentColor.bg, color: sentimentColor.text, borderColor: sentimentColor.border }}
        title={context}
      >
        {sentimentColor.icon}
        <span className="text-xs font-bold tracking-wide" style={{ fontFamily: "var(--font-mono)" }}>
          {ticker}
        </span>
        {isPrimary && (
          <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.08)" }}>
            PRIMARY
          </span>
        )}
      </div>
    </Link>
  );
}

function PillBadge({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border"
      style={{ background: "rgba(0,174,239,0.08)", color: "#005F8A", borderColor: "rgba(0,174,239,0.2)" }}
    >
      <Zap size={9} />
      {label}
    </span>
  );
}

function InsightIcon({ category }: { category: string }) {
  const map: Record<string, React.ReactNode> = {
    strategy: <Target size={13} className="text-[#7C3AED]" />,
    analysis: <BarChart2 size={13} className="text-[#2E90FA]" />,
    risk: <AlertTriangle size={13} className="text-[#F79009]" />,
    opportunity: <TrendingUp size={13} className="text-[#12B76A]" />,
    education: <BookOpen size={13} className="text-[#667085]" />,
  };
  return <>{map[category] ?? <Lightbulb size={13} className="text-[#667085]" />}</>;
}

function SkillBadge({ level }: { level: string }) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    beginner: { label: "Beginner", bg: "#F0FDE8", text: "#2E7A10" },
    intermediate: { label: "Intermediate", bg: "#EFF8FF", text: "#1570EF" },
    advanced: { label: "Advanced", bg: "#F5F3FF", text: "#6927DA" },
  };
  const s = map[level] ?? map.intermediate;
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.text }}>
      {s.label}
    </span>
  );
}

function ContentTypeBadge({ type }: { type: string }) {
  const label = type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">
      {label}
    </span>
  );
}

// ─── More on $TICKER shelf ───────────────────────────────────────────────────

function MoreOnTickerShelf({
  tickers,
  currentVideoId,
}: {
  tickers: Array<{ ticker: string; sentiment: string; mention_context?: string; is_primary?: boolean }>;
  currentVideoId: string;
}) {
  // Pick the primary ticker (or first ticker) to drive the shelf
  const primaryTicker = tickers.find(t => t.is_primary)?.ticker || tickers[0]?.ticker;

  const [tickerVideosRaw, setTickerVideosRaw] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    if (!primaryTicker) return;
    let cancelled = false;
    setIsLoading(true);
    fetchContentByTicker(primaryTicker)
      .then(rows => { if (!cancelled) setTickerVideosRaw(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (!cancelled) setTickerVideosRaw([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [primaryTicker]);

  const videos = tickerVideosRaw.filter((v: any) => v.id !== currentVideoId).slice(0, 6);

  if (!primaryTicker) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: "#00AEEF" }} />
        <h3 className="font-bold text-sm text-foreground" style={{ fontFamily: "var(--font-display)" }}>
          More on ${primaryTicker}
        </h3>
        <Link href={`/tickers/${primaryTicker}`}>
          <span className="text-[10px] font-semibold text-[#00AEEF] hover:underline ml-1">
            See all
          </span>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-28 h-16 rounded-xl bg-muted flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-2.5 bg-muted rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-6 rounded-xl border border-border bg-card/50">
          <p className="text-sm text-muted-foreground">
            No other videos for ${primaryTicker} yet.
          </p>
          <Link href={`/tickers/${primaryTicker}`}>
            <button className="mt-2 text-xs font-semibold text-[#00AEEF] hover:underline">
              Explore ${primaryTicker} intelligence →
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {videos.map((v: any) => (
            <Link key={v.id} href={`/video/${v.id}`}>
              <div className="flex gap-3 cursor-pointer group/mt rounded-xl p-2 hover:bg-muted/50 transition-colors">
                <div className="relative w-28 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                  <img
                    src={v.thumbnailUrl || `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`}
                    alt={v.title}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover/mt:scale-105"
                    onError={(e) => {
                      // Fallback to hqdefault YouTube thumbnail, then a branded dark placeholder
                      const img = e.currentTarget as HTMLImageElement;
                      if (v.youtubeId && !img.src.includes('hqdefault')) {
                        img.src = `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`;
                      } else {
                        img.style.display = 'none';
                      }
                    }}
                  />
                  {/* Quality score badge */}
                  {v.qualityScore > 0 && (
                    <span
                      className="absolute top-1 right-1 text-[9px] font-bold px-1 py-0.5 rounded"
                      style={{
                        background: v.qualityScore >= 80 ? "rgba(77,200,32,0.85)" : "rgba(200,212,0,0.85)",
                        color: "#101828",
                      }}
                    >
                      {v.qualityScore}
                    </span>
                  )}
                  {/* Ticker pill */}
                  <span
                    className="absolute bottom-1 left-1 text-[8px] font-bold px-1 py-0.5 rounded"
                    style={{ background: "rgba(0,174,239,0.85)", color: "#fff", fontFamily: "var(--font-mono)" }}
                  >
                    ${primaryTicker}
                  </span>
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  <p
                    className="text-xs font-semibold text-foreground line-clamp-2 leading-snug"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {v.title}
                  </p>
                  {v.quickTake && (
                    <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{v.quickTake}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">{v.creatorName || ""}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

import ErrorBoundary from "@/components/ErrorBoundary";

function VideoPageInner() {
  const { id } = useParams<{ id: string }>();
  const [playing, setPlaying] = useState(false);
  const [video, setVideo] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgFailed, setImgFailed] = useState(false);

  // Stable reference for tRPC query input
  const contentId = useMemo(() => id ?? "", [id]);

  // ── Fetch main content detail ──────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    trackEvent("video_view", { content_id: id });
    fetchContentDetail(id)
      .then((detail) => {
      try {
        const n = normalizeContentCard(detail);
        const slug = n.creator_slug || "";
        // Defensive coercion: any backend field may be null/undefined for
        // older rows. Filter to strings and dicts so the React render tree
        // never blows up on a typo or a missing column.
        const safeTopics = (Array.isArray(n.topics) ? n.topics : [])
          .filter((t): t is string => typeof t === "string" && t.length > 0);
        const safeTickers = Array.isArray(detail.tickers)
          ? detail.tickers.filter((t: any) => t && typeof t.ticker === "string")
          : [];
        const safeInsights = Array.isArray(detail.key_insights)
          ? detail.key_insights.filter((k: any) => k && k.insight)
          : [];
        const safeTimestamps = Array.isArray(detail.timestamps)
          ? detail.timestamps.filter((ts: any) => ts && (ts.label || ts.title))
          : [];
        setVideo({
          id: n.id,
          type: n.content_type,
          youtubeId: n.youtubeId || "",
          title: n.title || "Untitled",
          creatorId: slug,
          creator: {
            name: n.creator_name || "Unknown",
            avatar: (n.creator_name || "??").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
            avatarUrl: getCreatorAvatar(slug),
            color: getCreatorColor(slug),
          },
          thumbnail: n.thumbnailUrl || "",
          duration: n.durationLabel || "",
          quickTake: detail.quick_take || "",
          tags: safeTopics.map((t) => t.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())),
          relevanceBadge: n.relevanceLabel || "Watch",
          tickers: safeTickers,
          keyInsights: safeInsights,
          timestamps: safeTimestamps,
          externalUrl: n.external_url,
          description: detail.description || "",
          convergenceScore: Math.round((n.relevance_score || 0) * 100),
          publishedAt: n.publishedLabel || "",
          skillLevel: (detail as any).skill_level || "intermediate",
          contentType: (detail as any).content_type || "trading_education",
          pillBadges: (detail as any).pill_badges || [],
        });
      } catch (err) {
        console.error("[VideoPage] failed to normalise content detail", err);
      }
        if (detail.related?.length) {
          setRelated(detail.related.map((r) => {
            const rn = normalizeContentCard(r);
            const rslug = rn.creator_slug || "";
            return {
              id: rn.id,
              youtubeId: rn.youtubeId || "",
              title: rn.title,
              creator: {
                name: rn.creator_name || "Unknown",
                avatar: (rn.creator_name || "??").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
                avatarUrl: getCreatorAvatar(rslug),
                color: getCreatorColor(rslug),
              },
              thumbnail: rn.thumbnailUrl || "",
              duration: rn.durationLabel || "",
              convergenceScore: Math.round(rn.relevance_score * 100),
              publishedAt: rn.publishedLabel || "",
            };
          }));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  // ── Fallback related content ───────────────────────────────────────────────
  useEffect(() => {
    if (related.length > 0 || loading) return;
    fetchContent({ sort: "relevance", page: 1 })
      .then((items) => {
        setRelated(
          items.slice(0, 5).map((r) => {
            const rn = normalizeContentCard(r);
            const rslug = rn.creator_slug || "";
            return {
              id: rn.id,
              youtubeId: rn.youtubeId || "",
              title: rn.title,
              creator: {
                name: rn.creator_name || "Unknown",
                avatar: (rn.creator_name || "??").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
                avatarUrl: getCreatorAvatar(rslug),
                color: getCreatorColor(rslug),
              },
              thumbnail: rn.thumbnailUrl || "",
              duration: rn.durationLabel || "",
              convergenceScore: Math.round(rn.relevance_score * 100),
              publishedAt: rn.publishedLabel || "",
            };
          }).filter(r => r.id !== id)
        );
      })
      .catch(() => {});
  }, [related.length, loading, id]);

  // LLM enrichment endpoint never shipped; use what /content/{id} already returns.
  const enrichment: any = null;
  const enrichLoading = false;

  const quickTake = enrichment?.quickTake || video?.quickTake || "";
  const keyInsights: Array<{ insight: string; category: string }> =
    enrichment?.keyInsights?.length ? enrichment.keyInsights : (video?.keyInsights || []);
  const tickers: Array<{ ticker: string; sentiment: string; mention_context?: string; is_primary?: boolean }> =
    enrichment?.tickers?.length ? enrichment.tickers : (video?.tickers || []);
  const pillBadges: string[] = enrichment?.pillBadges?.length ? enrichment.pillBadges : (video?.pillBadges || []);
  const topics: string[] = enrichment?.topics?.length ? enrichment.topics : (video?.tags || []);
  const skillLevel: string = enrichment?.skillLevel || video?.skillLevel || "intermediate";
  const contentType: string = enrichment?.contentType || video?.contentType || "trading_education";
  const qualityScore: number = enrichment?.qualityScore ?? video?.convergenceScore ?? 0;

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="container mx-auto py-6 max-w-6xl">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-32" />
            <div className="rounded-2xl bg-muted" style={{ aspectRatio: "16/9" }} />
            <div className="h-6 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </main>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="container mx-auto py-6 max-w-6xl">
          <Link href="/">
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
              <ArrowLeft size={14} /> Back to Home
            </button>
          </Link>
          <div className="text-center py-20">
            <p className="text-lg font-semibold text-foreground mb-2">Video not found</p>
            <p className="text-sm text-muted-foreground">This content may have been removed or the ID is invalid.</p>
            <Link href="/"><button className="mt-4 cc-gradient-bg text-[#101828] font-bold px-6 py-2 rounded-lg">Go Home</button></Link>
          </div>
        </main>
      </div>
    );
  }

  const youtubeId = video.youtubeId as string;
  const creatorId = video.creatorId as string;

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="page-enter container mx-auto py-6 max-w-6xl">
        <Link href="/">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft size={14} /> Back to Today's Picks
          </button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

          {/* ── Main Column ─────────────────────────────────────────────── */}
          <div className="space-y-5 min-w-0">

            {/* Video embed */}
            <div className="rounded-2xl overflow-hidden bg-black shadow-lg" style={{ aspectRatio: "16/9" }}>
              {playing && youtubeId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                  style={{ border: "none" }}
                />
              ) : (
                <div
                  className="relative w-full h-full cursor-pointer group"
                  onClick={() => setPlaying(true)}
                >
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1280&q=80";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                      <Play size={24} fill="#101828" className="ml-1" />
                    </div>
                  </div>
                  {video.duration && (
                    <span className="absolute bottom-3 right-3 text-xs font-semibold text-white bg-black/70 px-2 py-1 rounded-lg">
                      {video.duration}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Title + meta */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-xl font-bold text-foreground leading-snug flex-1"
                    style={{ fontFamily: "var(--font-display)" }}>
                  {video.title}
                </h1>
                <div className="flex gap-2 flex-shrink-0">
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">
                    <Bookmark size={14} />
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">
                    <Share2 size={14} />
                  </button>
                </div>
              </div>

              {/* Creator + date row */}
              <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                <div className="flex items-center gap-2">
                  {creatorId ? (
                    <Link href={`/creators/${creatorId}`}>
                      <div
                        className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:ring-2 ring-[#4DC820] flex-shrink-0"
                        style={{ backgroundColor: video.creator.color }}
                      >
                        {video.creator.avatarUrl && !imgFailed ? (
                          <img src={video.creator.avatarUrl} alt={video.creator.name}
                            className="w-full h-full object-cover"
                            onError={() => setImgFailed(true)} />
                        ) : video.creator.avatar}
                      </div>
                    </Link>
                  ) : (
                    <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-white text-xs font-bold"
                         style={{ backgroundColor: video.creator.color }}>
                      {video.creator.avatar}
                    </div>
                  )}
                  {creatorId ? (
                    <Link href={`/creators/${creatorId}`}>
                      <span className="text-sm font-medium text-muted-foreground hover:underline cursor-pointer">
                        {video.creator.name}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">{video.creator.name}</span>
                  )}
                </div>
                <span className="text-border">·</span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock size={12} />{video.publishedAt}
                </span>
                {video.duration && (
                  <>
                    <span className="text-border">·</span>
                    <span className="text-sm text-muted-foreground">{video.duration}</span>
                  </>
                )}
                {youtubeId && (
                  <a
                    href={`https://www.youtube.com/watch?v=${youtubeId}`}
                    target="_blank" rel="noopener noreferrer"
                    className="ml-auto text-xs text-[#00AEEF] flex items-center gap-1 hover:underline"
                  >
                    Watch on YouTube <ExternalLink size={10} />
                  </a>
                )}
              </div>

              {/* Badge row */}
              <div className="flex gap-2 mt-3 flex-wrap items-center">
                <SkillBadge level={skillLevel} />
                <ContentTypeBadge type={contentType} />
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                  video.relevanceBadge === "Critical"
                    ? "bg-[#FFF0F3] text-[#A8001F] border-[#F8A3B1]"
                    : video.relevanceBadge === "High Relevance"
                    ? "bg-[#F0FDE8] text-[#2E7A10] border-[#B6F08A]"
                    : "bg-[#FAFDE8] text-[#7A6800] border-[#E8F08A]"
                }`}>
                  {video.relevanceBadge}
                </span>
                {topics.slice(0, 3).map((t: string) => (
                  <span key={t} className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
                    {t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                ))}
              </div>

              {/* Pill badges */}
              {pillBadges.length > 0 && (
                <div className="flex gap-2 mt-2.5 flex-wrap">
                  {pillBadges.map((badge: string) => (
                    <PillBadge key={badge} label={badge} />
                  ))}
                </div>
              )}
            </div>

            {/* ── Kai Quick Take ─────────────────────────────────────────── */}
            {(quickTake || enrichLoading) && (
              <div
                className="rounded-2xl p-5 border"
                style={{
                  background: "linear-gradient(135deg, rgba(0,174,239,0.06) 0%, rgba(77,200,32,0.04) 100%)",
                  borderColor: "rgba(0,174,239,0.2)"
                }}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #00AEEF, #4DC820)" }}
                  >
                    <Brain size={13} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: "#005F8A" }}>Kai's Quick Take</p>
                    <p className="text-[10px] text-muted-foreground">
                      {enrichLoading && !quickTake
                        ? "Analysing video..."
                        : enrichment?.fromCache === false
                        ? "Generated on-demand"
                        : "From content layer"}
                    </p>
                  </div>
                  {enrichLoading && !quickTake && (
                    <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Wifi size={10} className="animate-pulse" />
                      Thinking...
                    </div>
                  )}
                </div>
                {quickTake ? (
                  <p className="text-sm text-foreground leading-relaxed">{quickTake}</p>
                ) : (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-5/6" />
                    <div className="h-3 bg-muted rounded w-4/6" />
                  </div>
                )}
              </div>
            )}

            {/* ── Key Insights ───────────────────────────────────────────── */}
            {(keyInsights.length > 0 || enrichLoading) && (
              <CollapsibleSection
                title="Key Insights"
                defaultOpen={true}
                icon={<Lightbulb size={14} className="text-[#F79009]" />}
              >
                {keyInsights.length > 0 ? (
                  <div className="divide-y divide-border">
                    {keyInsights.map((ins, i) => (
                      <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                        <div className="mt-0.5 flex-shrink-0">
                          <InsightIcon category={ins.category} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground leading-relaxed">
                            {typeof ins === "string" ? ins : ins.insight}
                          </p>
                          {ins.category && (
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-0.5 block">
                              {ins.category}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-4 space-y-2 animate-pulse">
                    {[1, 2, 3].map(i => <div key={i} className="h-3 bg-muted rounded w-full" />)}
                  </div>
                )}
              </CollapsibleSection>
            )}

            {/* ── Tickers Discussed ──────────────────────────────────────── */}
            {(tickers.length > 0 || enrichLoading) && (
              <CollapsibleSection
                title="Tickers Discussed"
                defaultOpen={true}
                icon={<BarChart2 size={14} className="text-[#2E90FA]" />}
              >
                <div className="p-5">
                  {/* Pill row */}
                  {tickers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {tickers.map((t) => (
                        <TickerPill
                          key={t.ticker}
                          ticker={t.ticker}
                          sentiment={t.sentiment}
                          context={t.mention_context}
                          isPrimary={t.is_primary}
                        />
                      ))}
                    </div>
                  )}
                  {/* Context cards */}
                  {tickers.filter(t => t.mention_context).length > 0 && (
                    <div className="space-y-2.5">
                      {tickers.filter(t => t.mention_context).map((t) => (
                        <Link key={t.ticker} href={`/tickers/${t.ticker.toUpperCase()}`}>
                          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                              style={{
                                background:
                                  t.sentiment === "bullish" ? "#12B76A" :
                                  t.sentiment === "bearish" ? "#E8193C" : "#667085"
                              }}
                            >
                              {t.ticker.slice(0, 3)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-sm font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                                  {t.ticker}
                                </span>
                                {t.sentiment && (
                                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                                    t.sentiment === "bullish" ? "text-[#2E7A10] bg-[#F0FDE8]" :
                                    t.sentiment === "bearish" ? "text-[#A8001F] bg-[#FFF0F3]" :
                                    "text-[#52525B] bg-[#F4F4F5]"
                                  }`}>
                                    {t.sentiment.charAt(0).toUpperCase() + t.sentiment.slice(1)}
                                  </span>
                                )}
                                {t.is_primary && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#EFF8FF] text-[#1570EF]">
                                    PRIMARY
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">{t.mention_context}</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                  {enrichLoading && tickers.length === 0 && (
                    <div className="space-y-2 animate-pulse">
                      {[1, 2].map(i => <div key={i} className="h-12 bg-muted rounded-xl" />)}
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* ── Timestamps ─────────────────────────────────────────────── */}
            {video.timestamps?.length > 0 && (
              <CollapsibleSection
                title="Timestamps"
                icon={<Clock size={14} className="text-muted-foreground" />}
              >
                <div className="divide-y divide-border">
                  {video.timestamps.map((ts: any, i: number) => {
                    const secs = ts.seconds || 0;
                    const mins = Math.floor(secs / 60);
                    const s = String(secs % 60).padStart(2, "0");
                    return (
                      <button
                        key={i}
                        onClick={() => setPlaying(true)}
                        className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-muted transition-colors text-left"
                      >
                        <span className="ticker-mono text-xs w-10 flex-shrink-0" style={{ color: "#4DC820" }}>
                          {mins}:{s}
                        </span>
                        <span className="text-sm text-muted-foreground">{ts.label}</span>
                      </button>
                    );
                  })}
                </div>
              </CollapsibleSection>
            )}

            {/* ── Description ────────────────────────────────────────────── */}
            {video.description && (
              <CollapsibleSection
                title="Description"
                icon={<BookOpen size={14} className="text-muted-foreground" />}
              >
                <div className="px-5 py-4">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-6">
                    {video.description}
                  </p>
                </div>
              </CollapsibleSection>
            )}
            {/* ── Community Discussion ─────────────────────────────────── */}
            <VideoCommentSection videoId={video.id} />

            {/* ── More on $TICKER ────────────────────────────────────────── */}
            <MoreOnTickerShelf tickers={tickers} currentVideoId={video.id} />
          </div>

          {/* ── Sidebar ─────────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Convergence score card */}
            <div className="bg-card rounded-2xl border border-border p-5 text-center">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
                Convergence Score
              </p>
              <ScoreRing score={qualityScore} size="lg" />
              <p className="text-sm font-bold mt-3" style={{
                color: qualityScore >= 80 ? "#4DC820" : qualityScore >= 60 ? "#C8D400" : "#E8193C"
              }}>
                {video.relevanceBadge}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{video.creator.name}</p>
              {tickers[0]?.ticker && (
                <Link href={`/tickers/${tickers[0].ticker.toUpperCase()}`}>
                  <button className="w-full mt-4 text-[#101828] text-sm font-bold py-2.5 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity">
                    Full Intelligence Breakdown
                  </button>
                </Link>
              )}
            </div>

            {/* Primary tickers quick-access */}
            {tickers.filter(t => t.is_primary).length > 0 && (
              <div className="bg-card rounded-2xl border border-border p-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
                  Primary Tickers
                </p>
                <div className="flex flex-wrap gap-2">
                  {tickers.filter(t => t.is_primary).map((t) => (
                    <TickerPill
                      key={t.ticker}
                      ticker={t.ticker}
                      sentiment={t.sentiment}
                      context={t.mention_context}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Watch Next */}
            {related.length > 0 && (
              <div>
                <h3 className="font-bold text-sm text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
                  Watch Next
                </h3>
                <div className="space-y-3">
                  {related.slice(0, 5).map(v => (
                    <Link key={v.id} href={`/video/${v.id}`}>
                      <div className="flex gap-3 cursor-pointer group/wn">
                        <div className="relative w-28 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                          <img
                            src={v.thumbnail}
                            alt={v.title}
                            className="w-full h-full object-cover transition-transform duration-200 group-hover/wn:scale-105"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=320&q=60";
                            }}
                          />
                          <div className="absolute inset-0"
                               style={{ background: "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%)" }} />
                          {v.duration && (
                            <span className="absolute bottom-1 left-1.5 text-[9px] font-semibold text-white bg-black/60 px-1 py-0.5 rounded">
                              {v.duration}
                            </span>
                          )}
                          <span
                            className="absolute top-1 right-1 text-[9px] font-bold px-1 py-0.5 rounded"
                            style={{
                              background: v.convergenceScore >= 80 ? "rgba(77,200,32,0.85)" : "rgba(200,212,0,0.85)",
                              color: "#101828"
                            }}
                          >
                            {v.convergenceScore}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 py-0.5">
                          <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug"
                             style={{ fontFamily: "var(--font-display)" }}>
                            {v.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            {v.creator.avatarUrl && (
                              <img
                                src={v.creator.avatarUrl}
                                alt={v.creator.name}
                                className="w-4 h-4 rounded-full object-cover"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                              />
                            )}
                            <p className="text-[10px] text-muted-foreground">{v.creator.name}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <KaiChat />
    </div>
  );
}

// Wrap VideoPage in an error boundary so any render crash surfaces a
// graceful fallback instead of a white screen. Real error is logged to
// console + visible in the browser devtools for diagnosis.
export default function VideoPage() {
  return (
    <ErrorBoundary>
      <VideoPageInner />
    </ErrorBoundary>
  );
}
