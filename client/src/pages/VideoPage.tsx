// CheatCode OS — Video Page
// Design: YouTube embed top, AI context layer below (the product)
// NO MOCK DATA — all content from live Railway API + creator registry

import { Link, useParams } from "wouter";
import { ArrowLeft, ExternalLink, ChevronDown, ChevronUp, Lock, Play, Clock, Bookmark, Share2 } from "lucide-react";
import { useState, useEffect } from "react";
import { ScoreRing } from "@/components/shared/ScoreRing";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { fetchContentDetail, fetchContent, normalizeContentCard } from "@/lib/api";
import { getCreatorAvatar, getCreatorColor } from "@/lib/creatorRegistry";

function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted transition-colors"
      >
        <span className="font-semibold text-sm text-foreground" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </span>
        {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-border bg-card">
          {children}
        </div>
      )}
    </div>
  );
}

function TickerCard({ ticker, context, sentiment }: { ticker: string; context: string; sentiment?: string }) {
  return (
    <Link href={`/intelligence?ticker=${ticker}`}>
      <div className="content-card flex items-start gap-3 p-3 bg-card rounded-xl border border-border cursor-pointer">
        <div className="flex-shrink-0">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold text-white"
               style={{ background: sentiment === "bullish" ? "#12B76A" : sentiment === "bearish" ? "#E8193C" : "#667085" }}>
            {ticker.slice(0, 3)}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="ticker-mono text-sm font-bold text-foreground">{ticker}</span>
            {sentiment && (
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                sentiment === "bullish" ? "text-[#2E7A10] bg-[#F0FDE8]" : "text-[#A8001F] bg-[#FFF0F3]"
              }`}>
                {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{context}</p>
          <p className="text-xs text-[#00AEEF] mt-1 flex items-center gap-1">
            <Lock size={10} /> View full analysis
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const [playing, setPlaying] = useState(false);
  const [video, setVideo] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchContentDetail(id)
      .then((detail) => {
        const n = normalizeContentCard(detail);
        const slug = n.creator_slug || "";
        setVideo({
          id: n.id,
          type: n.content_type,
          youtubeId: n.youtubeId || "",
          title: n.title,
          creatorId: slug,
          creator: {
            name: n.creator_name || "Unknown",
            avatar: (n.creator_name || "??").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
            avatarUrl: getCreatorAvatar(slug),
            color: getCreatorColor(slug),
          },
          thumbnail: n.thumbnailUrl || "",
          duration: n.durationLabel || "",
          quickTake: n.quick_take || "",
          tags: n.topics.map((t: string) => t.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())),
          relevanceBadge: n.relevanceLabel || "Watch",
          tickers: detail.tickers || [],
          convergenceScore: Math.round(n.relevance_score * 100),
          publishedAt: n.publishedLabel || "",
          keyInsights: detail.key_insights || [],
          timestamps: detail.timestamps || [],
          externalUrl: n.external_url,
          description: detail.description || "",
        });
        // Set related from API response
        if (detail.related?.length) {
          setRelated(detail.related.map((r) => {
            const rn = normalizeContentCard(r);
            const rslug = rn.creator_slug || "";
            return {
              id: rn.id,
              type: rn.content_type,
              youtubeId: rn.youtubeId || "",
              title: rn.title,
              creatorId: rslug,
              creator: {
                name: rn.creator_name || "Unknown",
                avatar: (rn.creator_name || "??").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
                avatarUrl: getCreatorAvatar(rslug),
                color: getCreatorColor(rslug),
              },
              thumbnail: rn.thumbnailUrl || "",
              duration: rn.durationLabel || "",
              quickTake: rn.quick_take || "",
              tags: rn.topics.map((t: string) => t.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())),
              relevanceBadge: rn.relevanceLabel || "Watch",
              tickers: [] as string[],
              convergenceScore: Math.round(rn.relevance_score * 100),
              publishedAt: rn.publishedLabel || "",
            };
          }));
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [id]);

  // Fetch related content if API didn't return any
  useEffect(() => {
    if (related.length > 0 || loading) return;
    fetchContent({ sort: "relevance", page: 1 })
      .then((items) => {
        const mapped = items.slice(0, 5).map((r) => {
          const rn = normalizeContentCard(r);
          const rslug = rn.creator_slug || "";
          return {
            id: rn.id,
            type: rn.content_type,
            youtubeId: rn.youtubeId || "",
            title: rn.title,
            creatorId: rslug,
            creator: {
              name: rn.creator_name || "Unknown",
              avatar: (rn.creator_name || "??").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
              avatarUrl: getCreatorAvatar(rslug),
              color: getCreatorColor(rslug),
            },
            thumbnail: rn.thumbnailUrl || "",
            duration: rn.durationLabel || "",
            quickTake: rn.quick_take || "",
            tags: rn.topics.map((t: string) => t.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())),
            relevanceBadge: rn.relevanceLabel || "Watch",
            tickers: [] as string[],
            convergenceScore: Math.round(rn.relevance_score * 100),
            publishedAt: rn.publishedLabel || "",
          };
        });
        setRelated(mapped.filter(r => r.id !== id));
      })
      .catch(() => {});
  }, [related.length, loading, id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="container mx-auto py-6">
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
        <main className="container mx-auto py-6">
          <Link href="/">
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
              <ArrowLeft size={14} />
              Back
            </button>
          </Link>
          <div className="text-center py-16">
            <p className="text-lg font-semibold text-foreground mb-2">Video not found</p>
            <p className="text-sm text-muted-foreground">This content may have been removed or the ID is invalid.</p>
            <Link href="/">
              <button className="mt-4 cc-gradient-bg text-[#101828] font-bold px-6 py-2 rounded-lg">Go Home</button>
            </Link>
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

      <main className="page-enter container mx-auto py-6">
        <Link href="/">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft size={14} />
            Back to Today's Picks
          </button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Video embed */}
            <div className="relative bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
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
                <>
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover opacity-80"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=640&q=80"; }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={() => setPlaying(true)}
                      className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                    >
                      <Play size={24} fill="#101828" className="text-[#101828] ml-1" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Title + meta */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-xl font-bold text-foreground leading-snug" style={{ fontFamily: "var(--font-display)" }}>
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
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {creatorId ? (
                    <Link href={`/creators/${creatorId}`}>
                      <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:ring-2 ring-[#4DC820] flex-shrink-0"
                           style={{ backgroundColor: video.creator.color }}>
                        {video.creator.avatarUrl ? (
                          <img src={video.creator.avatarUrl} alt={video.creator.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                        ) : video.creator.avatar}
                      </div>
                    </Link>
                  ) : (
                    <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-white text-xs font-bold"
                         style={{ backgroundColor: video.creator.color }}>
                      {video.creator.avatarUrl ? (
                        <img src={video.creator.avatarUrl} alt={video.creator.name} className="w-full h-full object-cover" />
                      ) : video.creator.avatar}
                    </div>
                  )}
                  {creatorId ? (
                    <Link href={`/creators/${creatorId}`}>
                      <span className="text-sm font-medium text-muted-foreground hover:underline cursor-pointer">{video.creator.name}</span>
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">{video.creator.name}</span>
                  )}
                </div>
                <span className="text-border">·</span>
                <span className="text-sm text-muted-foreground flex items-center gap-1"><Clock size={12} />{video.publishedAt}</span>
                {video.duration && (
                  <>
                    <span className="text-border">·</span>
                    <span className="text-sm text-muted-foreground">{video.duration}</span>
                  </>
                )}
                {youtubeId && (
                  <a href={`https://www.youtube.com/watch?v=${youtubeId}`} target="_blank" rel="noopener noreferrer"
                     className="ml-auto text-xs text-[#00AEEF] flex items-center gap-1 hover:underline">
                    Watch on YouTube <ExternalLink size={10} />
                  </a>
                )}
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {video.tags.map((t: string) => (
                  <span key={t} className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
                    {t}
                  </span>
                ))}
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                  video.relevanceBadge === "Critical" ? "bg-[#FFF0F3] text-[#A8001F] border-[#F8A3B1]" :
                  video.relevanceBadge === "High Relevance" ? "bg-[#F0FDE8] text-[#2E7A10] border-[#B6F08A]" :
                  "bg-[#FAFDE8] text-[#7A6800] border-[#E8F08A]"
                }`}>
                  {video.relevanceBadge}
                </span>
              </div>
            </div>

            {/* Quick Take */}
            {video.quickTake && (
              <div className="rounded-xl p-4 border border-border" style={{ background: "linear-gradient(to right, rgba(0,174,239,0.08), rgba(77,200,32,0.06))" }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#00AEEF" }}>
                    <span className="text-white text-[9px] font-bold">K</span>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: "#005F8A" }}>Kai's Quick Take</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{video.quickTake}</p>
              </div>
            )}

            {/* Description */}
            {video.description && (
              <CollapsibleSection title="About This Video" defaultOpen={false}>
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{video.description}</p>
                </div>
              </CollapsibleSection>
            )}

            {/* Key Insights from API */}
            {video.keyInsights?.length > 0 && (
              <CollapsibleSection title="Key Insights" defaultOpen>
                <ul className="divide-y divide-border">
                  {video.keyInsights.map((insight: any, i: number) => (
                    <li key={i} className="flex gap-3 px-4 py-3">
                      <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "#F0FDE8", color: "#2E7A10" }}>
                        {i + 1}
                      </span>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {typeof insight === "string" ? insight : insight.insight || ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </CollapsibleSection>
            )}

            {/* Tickers Mentioned from API */}
            {video.tickers?.length > 0 && (
              <CollapsibleSection title="Tickers Mentioned" defaultOpen>
                <div className="p-4 space-y-3">
                  {video.tickers.map((t: any) => (
                    <TickerCard
                      key={t.ticker}
                      ticker={t.ticker}
                      context={t.mention_context || `Mentioned in this ${video.type}`}
                      sentiment={t.sentiment}
                    />
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Timestamps from API */}
            {video.timestamps?.length > 0 && (
              <CollapsibleSection title="Timestamps">
                <div className="divide-y divide-border">
                  {video.timestamps.map((ts: any, i: number) => {
                    const secs = ts.seconds || 0;
                    const mins = Math.floor(secs / 60);
                    const s = String(secs % 60).padStart(2, "0");
                    return (
                      <button key={i} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left">
                        <span className="ticker-mono text-xs w-10 flex-shrink-0" style={{ color: "#4DC820" }}>{mins}:{s}</span>
                        <span className="text-sm text-muted-foreground">{ts.label}</span>
                      </button>
                    );
                  })}
                </div>
              </CollapsibleSection>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Convergence score */}
            <div className="bg-card rounded-xl border border-border p-5 text-center">
              <p className="section-label mb-3">Convergence Score</p>
              <ScoreRing score={video.convergenceScore} size="lg" />
              <p className="text-sm font-semibold mt-3" style={{
                color: video.convergenceScore >= 80 ? "#4DC820" : video.convergenceScore >= 60 ? "#C8D400" : "#E8193C"
              }}>
                {video.relevanceBadge}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{video.creator.name}</p>
              {video.tickers?.[0]?.ticker && (
                <Link href={`/intelligence?ticker=${video.tickers[0].ticker}`}>
                  <button className="w-full mt-4 text-[#101828] text-sm font-bold py-2 rounded-lg cc-gradient-bg hover:opacity-90 transition-opacity">
                    Full Intelligence Breakdown
                  </button>
                </Link>
              )}
            </div>

            {/* Related videos */}
            {related.length > 0 && (
              <div>
                <h3 className="font-bold text-sm text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
                  Watch Next
                </h3>
                <div className="space-y-3">
                  {related.slice(0, 4).map(v => (
                    <Link key={v.id} href={`/video/${v.id}`}>
                      <div className="flex gap-3 cursor-pointer group/wn">
                        <div className="relative w-28 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-[#1a2035]">
                          <img src={v.thumbnail} alt={v.title}
                            className="w-full h-full object-cover transition-transform duration-200 group-hover/wn:scale-105"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=320&q=60"; }}
                          />
                          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)" }} />
                          {v.duration && (
                            <span className="absolute bottom-1 left-1.5 text-[9px] font-semibold text-white bg-black/60 px-1 py-0.5 rounded">{v.duration}</span>
                          )}
                          <span className="absolute top-1 right-1 text-[9px] font-bold px-1 py-0.5 rounded"
                                style={{ background: v.convergenceScore >= 80 ? "rgba(77,200,32,0.85)" : "rgba(200,212,0,0.85)", color: "#101828" }}>
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
                              <img src={v.creator.avatarUrl} alt={v.creator.name}
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
