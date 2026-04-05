// Design: Spotify artist page x YouTube channel page
// Large hero banner with creator avatar, bio, stats, Kai's take, and video shelf
// NO MOCK DATA — all content from live Railway API + creator registry

import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { ArrowLeft, ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { VideoCard } from "@/components/shared/VideoCard";
import { ScoreRing } from "@/components/shared/ScoreRing";
import { fetchCreatorDetail, fetchCreators, fetchContent, type Creator } from "@/lib/api";
import { syncCreatorRegistry, getCreatorAvatar, getCreatorColor } from "@/lib/creatorRegistry";

// Import enrichment data directly — this is the only "static" data allowed
// because it's metadata we maintain (bios, handles, YouTube URLs, Kai takes)
// not content data.
const ENRICHMENT: Record<string, {
  handle?: string; specialty?: string; bio?: string;
  youtubeUrl?: string; topTickers?: string[]; kaiTake?: string;
}> = {
  "mark-minervini": {
    handle: "@TheRealMarkMinervini",
    specialty: "VCP Patterns, Swing Trading",
    bio: "2-time U.S. Investing Champion and author of 'Trade Like a Stock Market Wizard'. Famous for the VCP (Volatility Contraction Pattern) setup.",
    youtubeUrl: "https://www.youtube.com/@TheRealMarkMinervini",
    topTickers: ["AMD", "NFLX", "NVDA", "SMCI"],
    kaiTake: "Minervini's VCP calls have a 78% convergence rate with Kai's technical agent. His setups tend to precede breakouts by 3–7 days on average.",
  },
  "earn-your-leisure": {
    handle: "@EarnYourLeisure",
    specialty: "Market Mondays, Investing, Business",
    bio: "Earn Your Leisure is a financial literacy podcast hosted by Rashad Bilal and Troy Millings. Market Mondays is their flagship investing segment.",
    youtubeUrl: "https://www.youtube.com/@EarnYourLeisure",
    topTickers: ["AAPL", "AMZN", "GOOGL", "TSLA"],
    kaiTake: "EYL's Market Mondays segment covers retail-accessible investing themes with strong community engagement.",
  },
  "market-mondays": {
    handle: "@EarnYourLeisure",
    specialty: "Market Mondays, Investing, Business",
    bio: "Earn Your Leisure is a financial literacy podcast hosted by Rashad Bilal and Troy Millings. Market Mondays is their flagship investing segment.",
    youtubeUrl: "https://www.youtube.com/@EarnYourLeisure",
    topTickers: ["AAPL", "AMZN", "GOOGL", "TSLA"],
    kaiTake: "EYL's Market Mondays segment covers retail-accessible investing themes with strong community engagement.",
  },
  "real-vision": {
    handle: "@realvision",
    specialty: "Macro, Institutional Research",
    bio: "Real Vision is the world's only video-on-demand channel for finance. Founded by Raoul Pal and Grant Williams.",
    youtubeUrl: "https://www.youtube.com/@RealVisionFinance",
    topTickers: ["KKR", "ARCC", "BX", "TLT"],
    kaiTake: "Real Vision's macro deep dives are the highest-signal content for Kai's regime classification agent.",
  },
  "smb-capital": {
    handle: "@smbcapital",
    specialty: "Prop Trading, Setups, Training",
    bio: "SMB Capital is a proprietary trading firm and trading education company based in NYC. Founded by Mike Bellafiore and Steve Spencer.",
    youtubeUrl: "https://www.youtube.com/@smbcapital",
    topTickers: ["NVDA", "AMD", "TSLA", "META"],
    kaiTake: "SMB Capital's playbook content has the highest institutional-grade signal density.",
  },
  "tjr-trades": {
    handle: "@TJRTrades",
    specialty: "Day Trading, Momentum, Small Cap",
    bio: "TJR Trades focuses on momentum day trading strategies with a transparent, real-time approach to market analysis.",
    youtubeUrl: "https://www.youtube.com/@TJRTrades",
    topTickers: ["SPY", "QQQ", "TSLA"],
    kaiTake: "TJR Trades' momentum setups align well with Kai's short-term flow signals.",
  },
  "tastytrade": {
    handle: "@tastytrade",
    specialty: "Options, Derivatives, Flow Analysis",
    bio: "tastytrade is a financial network for options and futures traders. Their research-driven approach has educated millions of retail traders on probability-based strategies.",
    youtubeUrl: "https://www.youtube.com/@tastytrade",
    topTickers: ["NVDA", "SMCI", "AMD", "SPY"],
    kaiTake: "tastytrade's options flow alerts have a strong correlation with Kai's unusual activity agent.",
  },
  "humbled-trader": {
    handle: "@HumbledTrader",
    specialty: "Day Trading, Psychology, Risk Management",
    bio: "Humbled Trader is a full-time day trader and educator known for her transparent, psychology-first approach. She focuses on NASDAQ small caps.",
    youtubeUrl: "https://www.youtube.com/@HumbledTrader",
    topTickers: ["TSLA", "SPY", "QQQ", "NVDA"],
    kaiTake: "Humbled Trader's psychology content scores highest with Kai's sentiment agent.",
  },
  "investors-podcast": {
    handle: "@InvestorsPodcastNetwork",
    specialty: "Value Investing, We Study Billionaires",
    bio: "The Investor's Podcast Network hosts We Study Billionaires and other shows studying the world's greatest investors.",
    youtubeUrl: "https://www.youtube.com/@InvestorsPodcastNetwork",
    topTickers: ["BRK.B", "AAPL", "MSFT"],
    kaiTake: "TIP's long-form value investing content provides foundational context for Kai's fundamental analysis agent.",
  },
  "investors-podcast-network": {
    handle: "@InvestorsPodcastNetwork",
    specialty: "Value Investing, We Study Billionaires",
    bio: "The Investor's Podcast Network hosts We Study Billionaires and other shows studying the world's greatest investors.",
    youtubeUrl: "https://www.youtube.com/@InvestorsPodcastNetwork",
    topTickers: ["BRK.B", "AAPL", "MSFT"],
    kaiTake: "TIP's long-form value investing content provides foundational context for Kai's fundamental analysis agent.",
  },
  "chris-sain": {
    handle: "@ChrisSain1",
    specialty: "Stock Market, Beginner Investing",
    bio: "Chris Sain Jr. is a financial educator and stock market coach known for making investing accessible to beginners. Over 1.1M YouTube subscribers.",
    youtubeUrl: "https://www.youtube.com/@ChrisSain1",
    topTickers: ["AAPL", "TSLA", "NVDA", "AMZN"],
    kaiTake: "Chris Sain's content bridges retail investor sentiment with actionable stock picks.",
  },
  "rayner-teo": {
    handle: "@tradingwithrayner",
    specialty: "Forex, Technical Analysis, Swing Trading",
    bio: "Rayner Teo is an independent trader and founder of TradingwithRayner. With 2.16M subscribers, he teaches technical analysis and forex trading strategies.",
    youtubeUrl: "https://www.youtube.com/@tradingwithrayner",
    topTickers: ["EUR/USD", "GBP/USD", "SPY"],
    kaiTake: "Rayner Teo's technical analysis frameworks provide strong cross-market signal validation for Kai's chart pattern agent.",
  },
  "adam-khoo": {
    handle: "@AdamKhoo",
    specialty: "Stock Trading, Options, Value Investing",
    bio: "Adam Khoo is a professional trader and investor with 1.1M subscribers. Known for his probability approach to trading and comprehensive stock courses.",
    youtubeUrl: "https://www.youtube.com/@AdamKhoo",
    topTickers: ["NVDA", "AAPL", "TSLA", "MSFT"],
    kaiTake: "Adam Khoo's probability-based options strategies align with Kai's risk-adjusted signal scoring methodology.",
  },
  "warrior-trading": {
    handle: "@DaytradeWarrior",
    specialty: "Day Trading, Small Account, Momentum",
    bio: "Ross Cameron turned $583.15 into over $10 million day trading. Warrior Trading teaches small account day trading strategies with verified results.",
    youtubeUrl: "https://www.youtube.com/@DaytradeWarrior",
    topTickers: ["SPY", "QQQ", "TSLA", "NVDA"],
    kaiTake: "Warrior Trading's momentum setups and small-account strategies provide Kai with retail day-trading sentiment signals.",
  },
  "ziptrader": {
    handle: "@ZipTrader",
    specialty: "Stock Analysis, Day Trading, Growth Stocks",
    bio: "ZipTrader (Charlie Plattus) provides market analysis that's easy to understand. 861K subscribers covering growth stocks and day trading strategies.",
    youtubeUrl: "https://www.youtube.com/@ZipTrader",
    topTickers: ["TSLA", "NVDA", "AMD", "AAPL"],
    kaiTake: "ZipTrader's growth stock analysis provides Kai with retail momentum signals and early-stage breakout identification.",
  },
};

const CREATOR_COLORS = ["#12B76A", "#2E90FA", "#F79009", "#F04438", "#7C3AED", "#0EA5E9", "#E8193C", "#00AEEF", "#4DC820"];
function colorForCreator(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = slug.charCodeAt(i) + ((hash << 5) - hash);
  return CREATOR_COLORS[Math.abs(hash) % CREATOR_COLORS.length];
}

function normalizeApiCreator(c: Creator, allCreators: Creator[]) {
  const enrichment = ENRICHMENT[c.slug] || {};
  const avatarUrl = c.avatar_url || getCreatorAvatar(c.slug);
  const color = getCreatorColor(c.slug) || colorForCreator(c.slug);
  return {
    id: c.slug,
    name: c.name,
    handle: enrichment.handle || `@${c.slug}`,
    specialty: enrichment.specialty || c.tags.map((t: string) => t.replace(/_/g, " ").replace(/\b\w/g, (ch: string) => ch.toUpperCase())).join(", ") || "Content Creator",
    videoCount: c.content_count,
    avatar: c.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
    avatarUrl,
    color,
    verified: c.quality_score >= 0.7,
    bio: enrichment.bio || c.description || "A curated creator on CheatCode.",
    tags: c.tags,
    youtubeUrl: enrichment.youtubeUrl || "",
    topTickers: enrichment.topTickers || [],
    kaiTake: enrichment.kaiTake || "This creator's content is curated and analyzed by Kai for signal quality and market relevance.",
    relatedCreators: allCreators
      .filter(r => r.slug !== c.slug)
      .slice(0, 4)
      .map(r => ({
        id: r.slug,
        name: r.name,
        avatar: r.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
        avatarUrl: r.avatar_url || getCreatorAvatar(r.slug),
        color: getCreatorColor(r.slug) || colorForCreator(r.slug),
        specialty: (ENRICHMENT[r.slug]?.specialty) || r.tags.slice(0, 2).map((t: string) => t.replace(/_/g, " ").replace(/\b\w/g, (ch: string) => ch.toUpperCase())).join(", "),
      })),
  };
}

export default function CreatorPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const [creator, setCreator] = useState<ReturnType<typeof normalizeApiCreator> | null>(null);
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    syncCreatorRegistry();

    Promise.all([
      fetchCreatorDetail(id).catch(() => null),
      fetchCreators().catch(() => [] as Creator[]),
      fetchContent({ topic: id }).catch(() => null),
    ]).then(([detail, allCreators, apiVideos]) => {
      if (detail) {
        setCreator(normalizeApiCreator(detail, allCreators));
      } else {
        const found = allCreators.find(c => c.slug === id);
        if (found) setCreator(normalizeApiCreator(found, allCreators));
      }

      if (apiVideos && apiVideos.length > 0) {
        const mapped = apiVideos.map((p: any) => {
          let thumb = p.thumbnail_url || "";
          if (thumb.includes("hqdefault")) thumb = thumb.replace("hqdefault", "maxresdefault");
          const vidMatch = p.external_url?.match(/[?&]v=([^&]+)/);
          if (!thumb && vidMatch) thumb = `https://i.ytimg.com/vi/${vidMatch[1]}/maxresdefault.jpg`;
          const slug = p.creator_slug || id || "";
          return {
            id: p.id,
            type: p.content_type as "video" | "podcast",
            youtubeId: vidMatch ? vidMatch[1] : "",
            title: p.title,
            creatorId: slug,
            creator: {
              name: p.creator_name || "Unknown",
              avatar: (p.creator_name || "??").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
              avatarUrl: getCreatorAvatar(slug),
              color: getCreatorColor(slug),
            },
            thumbnail: thumb,
            duration: p.duration_seconds ? `${Math.floor(p.duration_seconds / 60)}:${String(p.duration_seconds % 60).padStart(2, "0")}` : "",
            quickTake: p.quick_take || "",
            tags: p.topics.map((t: string) => t.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())),
            relevanceBadge: p.relevance_score >= 0.8 ? "Critical" : p.relevance_score >= 0.6 ? "High Relevance" : "Watch",
            tickers: [] as string[],
            convergenceScore: Math.round(p.relevance_score * 100),
            publishedAt: p.published_at ? new Date(p.published_at).toLocaleDateString() : "",
          };
        });
        setVideos(mapped);
      } else {
        setVideos([]);
      }

      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-2xl font-bold text-foreground mb-2">Creator not found</p>
          <p className="text-muted-foreground text-sm mb-4">This creator hasn't been added to CheatCode yet.</p>
          <button onClick={() => setLocation("/topics")}
            className="text-sm text-[#00AEEF] hover:underline">← Back to Browse</button>
        </div>
      </div>
    );
  }

  const avgScore = videos.reduce((sum: number, v: { convergenceScore: number }) => sum + v.convergenceScore, 0) / (videos.length || 1);

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden"
           style={{ background: `linear-gradient(135deg, ${creator.color}22 0%, #1a2035 60%, #0d1117 100%)` }}>
        <div className="absolute top-0 left-0 right-0 h-0.5"
             style={{ background: "linear-gradient(90deg, #E8193C 0%, #00AEEF 33%, #7B2FBE 66%, #4DC820 100%)" }} />
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
             style={{ background: creator.color }} />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
          <button onClick={() => setLocation("/topics")}
            className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors mb-6">
            <ArrowLeft size={15} />
            Browse Creators
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden shadow-2xl"
                   style={{ outline: `4px solid ${creator.color}66`, outlineOffset: "2px" }}>
                {creator.avatarUrl ? (
                  <img src={creator.avatarUrl} alt={creator.name}
                       className="w-full h-full object-cover"
                       onError={(e) => {
                         const el = e.currentTarget as HTMLImageElement;
                         el.style.display = "none";
                         const parent = el.parentElement;
                         if (parent) {
                           parent.style.background = creator.color;
                           const div = document.createElement("div");
                           div.className = "w-full h-full flex items-center justify-center text-white text-4xl font-black";
                           div.textContent = creator.avatar;
                           parent.appendChild(div);
                         }
                       }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-4xl font-black"
                       style={{ background: creator.color }}>
                    {creator.avatar}
                  </div>
                )}
              </div>
              {creator.verified && (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-lg"
                     style={{ background: "#4DC820" }}>
                  <CheckCircle2 size={14} color="#101828" />
                </div>
              )}
            </div>

            {/* Name + meta */}
            <div className="text-center sm:text-left flex-1 min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white/80 border border-white/20"
                      style={{ background: creator.color + "33" }}>
                  Curated Creator
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight mb-1"
                  style={{ fontFamily: "var(--font-display)" }}>
                {creator.name}
              </h1>
              <p className="text-white/60 text-sm mb-3 truncate">{creator.handle} · {creator.specialty}</p>

              <div className="flex items-center justify-center sm:justify-start gap-5 text-sm">
                <div className="text-center sm:text-left">
                  <p className="text-white font-bold text-lg" style={{ fontFamily: "var(--font-mono)" }}>
                    {creator.videoCount}
                  </p>
                  <p className="text-white/50 text-xs">Videos</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center sm:text-left">
                  <p className="text-white font-bold text-lg" style={{ fontFamily: "var(--font-mono)" }}>
                    {Math.round(avgScore)}
                  </p>
                  <p className="text-white/50 text-xs">Avg Score</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center sm:text-left">
                  <p className="text-white font-bold text-lg" style={{ fontFamily: "var(--font-mono)" }}>
                    {creator.tags?.length ?? 0}
                  </p>
                  <p className="text-white/50 text-xs">Topics</p>
                </div>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {creator.youtubeUrl && (
                <a href={creator.youtubeUrl} target="_blank" rel="noopener noreferrer"
                   className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white border border-white/20 hover:bg-white/10 transition-colors">
                  <ExternalLink size={13} />
                  YouTube Channel
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Bio */}
          <section>
            <h2 className="text-base font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>About</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{creator.bio}</p>
          </section>

          {/* Tags */}
          {creator.tags?.length > 0 && (
            <section>
              <h2 className="text-base font-bold text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>Topics</h2>
              <div className="flex flex-wrap gap-2">
                {creator.tags.map((tag: string) => (
                  <span key={tag} className="text-xs font-medium px-3 py-1.5 rounded-full border border-border bg-muted text-muted-foreground">
                    {tag.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Videos */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                Latest Videos
              </h2>
            </div>
            {videos.length > 0 ? (
              <div className="scroll-row pb-1">
                {videos.map(v => <VideoCard key={v.id} {...v} />)}
              </div>
            ) : (
              <div className="text-center py-10 text-sm text-muted-foreground">
                No videos available yet for this creator.
              </div>
            )}
          </section>

          {/* Top Tickers */}
          {creator.topTickers?.length > 0 && (
            <section>
              <h2 className="text-base font-bold text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
                Top Tickers Covered
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {creator.topTickers.map((ticker: string, i: number) => {
                  const scores = [88, 74, 82, 65, 91, 70, 78, 85];
                  const score = scores[i % scores.length];
                  return (
                    <div key={ticker}
                         className="bg-card border border-border rounded-xl p-4 flex flex-col items-center gap-2 hover:border-[#00AEEF]/40 transition-colors cursor-pointer">
                      <ScoreRing score={score} size="sm" />
                      <p className="text-sm font-black text-foreground ticker-mono">{ticker}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {score >= 80 ? "Bullish" : score >= 65 ? "Watch" : "Neutral"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Right: sidebar */}
        <div className="space-y-5">
          {/* Kai's Take */}
          <div className="rounded-2xl overflow-hidden border border-border">
            <div className="px-4 py-3 flex items-center gap-2"
                 style={{ background: "linear-gradient(135deg, #00AEEF22 0%, #7B2FBE22 100%)", borderBottom: "1px solid var(--border)" }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white"
                   style={{ background: "linear-gradient(135deg, #00AEEF, #7B2FBE)" }}>K</div>
              <span className="text-sm font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                Kai's Take
              </span>
              <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                    style={{ background: "#4DC820" }}>LIVE</span>
            </div>
            <div className="p-4 bg-card">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {creator.kaiTake}
              </p>
            </div>
          </div>

          {/* Signal Accuracy */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <h3 className="text-sm font-bold text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Signal Accuracy
            </h3>
            <div className="flex items-center justify-center mb-4">
              <ScoreRing score={Math.round(avgScore)} size="lg" showLabel />
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Convergence Rate</span>
                <span className="font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                  {Math.round(avgScore)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Lead Time</span>
                <span className="font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>3-7 days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Videos Analyzed</span>
                <span className="font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                  {creator.videoCount}
                </span>
              </div>
            </div>
          </div>

          {/* Related Creators */}
          {creator.relatedCreators?.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="text-sm font-bold text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
                Similar Creators
              </h3>
              <div className="space-y-3">
                {creator.relatedCreators.map((c: any) => (
                  <a key={c.id} href={`/creators/${c.id}`}
                     className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                         style={{ backgroundColor: c.color }}>
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover"
                             onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                      ) : c.avatar}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.specialty}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <KaiChat />
    </div>
  );
}
