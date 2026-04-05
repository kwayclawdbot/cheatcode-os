// CheatCode OS — Home Page: "Today in the Market" v2
// Color updates: CC Green CTAs, CC Cyan for Kai, CC Red for bearish,
// CC Yellow for watch/choppy, gradient hero bar, spectrum accent on section labels

import { Link } from "wouter";
import { TrendingUp, TrendingDown, Minus, ArrowRight, ChevronRight, Flame } from "lucide-react";
import { VideoCard } from "@/components/shared/VideoCard";
import { ScoreRing } from "@/components/shared/ScoreRing";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import {
  marketSentiment as mockSentiment, todaysPicks as mockPicks, topicGrid as mockTopicGrid,
  hotThemes as mockThemes, radarTickers as mockRadar, creators as mockCreators
} from "@/lib/mockData";
import { fetchHome, fetchRadar } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

// Transform API data to match existing component shapes
function useHomeData() {
  const { data: home } = useApi(fetchHome, null);
  const { data: radar } = useApi(fetchRadar, null);

  const marketSentiment = home ? {
    label: home.market_sentiment.charAt(0).toUpperCase() + home.market_sentiment.slice(1),
    description: home.sentiment_summary || "",
    type: home.market_sentiment as "bullish" | "bearish" | "choppy" | "neutral",
    date: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
  } : mockSentiment;

  const todaysPicks = home?.todays_picks?.length ? home.todays_picks.map((p) => ({
    id: p.id,
    type: p.content_type as "video" | "podcast",
    title: p.title,
    creator: { name: p.creator_name || "Unknown", avatar: (p.creator_name || "??").slice(0, 2).toUpperCase(), color: "#667085" },
    thumbnail: p.thumbnail_url || "",
    duration: p.duration_seconds ? `${Math.floor(p.duration_seconds / 60)}:${String(p.duration_seconds % 60).padStart(2, "0")}` : "",
    quickTake: p.quick_take || "",
    tags: p.topics.map((t) => t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())),
    relevanceBadge: p.relevance_score >= 0.8 ? "Critical" : p.relevance_score >= 0.6 ? "High Relevance" : "Watch",
    tickers: [] as string[],
    convergenceScore: Math.round(p.relevance_score * 100),
    publishedAt: p.published_at ? new Date(p.published_at).toLocaleDateString() : "",
  })) : mockPicks;

  const radarTickers = radar?.critical?.concat(radar.high_conviction || [], radar.watch || []).map((t) => ({
    ticker: t.symbol,
    score: t.score,
    direction: t.direction ? t.direction.charAt(0).toUpperCase() + t.direction.slice(1) : "Neutral",
    timeframe: t.timeframe ? t.timeframe.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Swing",
    confidence: t.confidence ? t.confidence.charAt(0).toUpperCase() + t.confidence.slice(1).replace(/_/g, " ") : "Watch",
    change: "",
  })) || mockRadar;

  const hotThemes = home?.themes?.length ? home.themes.map((t) => ({
    id: t.slug,
    label: t.name,
    status: t.status.charAt(0).toUpperCase() + t.status.slice(1),
    level: Math.round(t.score / 20),
    tickers: [] as string[],
    score: Math.round(t.score),
    color: t.status === "escalating" ? "#F04438" : t.status === "active" ? "#12B76A" : "#F79009",
  })) : mockThemes;

  return { marketSentiment, todaysPicks, topicGrid: mockTopicGrid, hotThemes, radarTickers, creators: mockCreators };
}


const HERO_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663185570724/QgiApnmXYRXSMA2KNkFFkL/hero-banner-2yeBhxB5MaexrZkXyaLwmy.webp";

function SentimentIcon({ type }: { type: string }) {
  if (type === "bullish") return <TrendingUp size={15} />;
  if (type === "bearish") return <TrendingDown size={15} />;
  return <Minus size={15} />;
}

function SectionHeader({ label, href, count, accent }: { label: string; href?: string; count?: number; accent?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        {accent && (
          <span className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: accent }} />
        )}
        <h2 className="text-lg font-bold text-[#101828]" style={{ fontFamily: "var(--font-display)" }}>
          {label}
        </h2>
        {count && (
          <span className="text-xs text-[#667085] bg-[#F2F4F7] px-2 py-0.5 rounded-full font-medium">
            {count}
          </span>
        )}
      </div>
      {href && (
        <Link href={href}>
          <span className="text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all" style={{ color: "#4DC820" }}>
            See all <ChevronRight size={14} />
          </span>
        </Link>
      )}
    </div>
  );
}

function RadarRow() {
  return (
    <div className="bg-white rounded-xl border border-[#EAECF0] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#EAECF0] flex items-center justify-between"
           style={{ background: "linear-gradient(90deg, #2B3245 0%, #1a2035 100%)" }}>
        <div className="flex items-center gap-2">
          <Flame size={15} className="text-[#C8D400]" />
          <span className="font-bold text-sm text-white" style={{ fontFamily: "var(--font-display)" }}>
            Kai's Radar
          </span>
          <span className="text-[10px] font-bold text-[#4DC820] bg-[#4DC820]/20 px-1.5 py-0.5 rounded-full tracking-widest">
            LIVE
          </span>
        </div>
        <Link href="/intelligence">
          <span className="text-xs font-semibold flex items-center gap-1 cc-gradient-text">
            Full breakdown <ChevronRight size={12} />
          </span>
        </Link>
      </div>
      <div className="divide-y divide-[#F2F4F7]">
        {radarTickers.map((t) => (
          <Link key={t.ticker} href={`/intelligence?ticker=${t.ticker}`}>
            <div className="flex items-center gap-3 px-4 py-3 hover:bg-[#F9FAFB] transition-colors">
              <ScoreRing score={t.score} size="sm" showLabel={false} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="ticker-mono text-sm text-[#101828]">{t.ticker}</span>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                    t.direction === "Bullish"
                      ? "text-[#2E7A10] bg-[#F0FDE8]"
                      : "text-[#A8001F] bg-[#FFF0F3]"
                  }`}>
                    {t.direction}
                  </span>
                  <span className="text-xs text-[#98A2B3]">{t.timeframe}</span>
                </div>
                <div className="text-xs text-[#667085] mt-0.5">{t.confidence} conviction</div>
              </div>
              <div className={`text-sm font-semibold ${t.change.startsWith("+") ? "text-[#4DC820]" : "text-[#E8193C]"}`}>
                {t.change}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ThemeCard({ theme }: { theme: typeof hotThemes[0] }) {
  const statusColors: Record<string, { text: string; bg: string; border: string }> = {
    "Escalating": { text: "#A8001F", bg: "#FFF0F3", border: "#F8A3B1" },
    "Active":     { text: "#2E7A10", bg: "#F0FDE8", border: "#B6F08A" },
    "Watch":      { text: "#7A6800", bg: "#FAFDE8", border: "#E8F08A" },
    "New":        { text: "#005F8A", bg: "#E8F8FF", border: "#7FDBF8" },
  };
  const s = statusColors[theme.status] || statusColors["Watch"];
  return (
    <Link href={`/themes/${theme.id}`}>
      <div className="content-card bg-white rounded-xl border border-[#EAECF0] p-4 cursor-pointer w-56 flex-shrink-0">
        <div className="flex items-start justify-between mb-2">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                style={{ color: s.text, backgroundColor: s.bg, borderColor: s.border }}>
            {theme.status}
          </span>
          <span className="score-number text-lg font-bold" style={{ color: theme.color }}>
            {theme.score}
          </span>
        </div>
        <h3 className="font-semibold text-[#101828] text-sm leading-snug mb-2"
            style={{ fontFamily: "var(--font-display)" }}>
          {theme.label}
        </h3>
        <div className="flex gap-1 flex-wrap">
          {theme.tickers.map(t => (
            <span key={t} className="ticker-mono text-[10px] bg-[#F9FAFB] border border-[#EAECF0] px-1.5 py-0.5 rounded text-[#475467]">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-1 flex-1 rounded-full"
                 style={{ backgroundColor: i < theme.level ? theme.color : "#EAECF0" }} />
          ))}
          <span className="text-[10px] text-[#98A2B3] ml-1">Lvl {theme.level}</span>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const { marketSentiment, todaysPicks, topicGrid, hotThemes, radarTickers, creators } = useHomeData();
  const videos = todaysPicks.filter(p => p.type === "video");
  const podcasts = todaysPicks.filter(p => p.type === "podcast");

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Nav />

      <main className="page-enter">
        {/* Hero Banner */}
        <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #2B3245 0%, #1a2035 100%)" }}>
          {/* Subtle hero image overlay */}
          <div className="absolute inset-0 opacity-[0.08]">
            <img src={HERO_IMAGE} alt="" className="w-full h-full object-cover object-center" />
          </div>
          {/* Spectrum gradient bar at top */}
          <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #E8193C 0%, #00AEEF 33%, #7B2FBE 66%, #4DC820 100%)" }} />

          <div className="container mx-auto py-8 relative">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="section-label mb-1" style={{ color: "#98A2B3" }}>{marketSentiment.date}</p>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-display)" }}>
                  Today in the Market
                </h1>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold sentiment-${marketSentiment.type}`}>
                  <SentimentIcon type={marketSentiment.type} />
                  {marketSentiment.label} — {marketSentiment.description}
                </div>
              </div>
              <div className="flex gap-3">
                <Link href="/intelligence">
                  <button className="flex items-center gap-2 text-[#101828] text-sm font-bold px-4 py-2 rounded-lg cc-gradient-bg hover:opacity-90 transition-opacity">
                    <TrendingUp size={14} />
                    Open Radar
                  </button>
                </Link>
                <Link href="/newsletter">
                  <button className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 transition-colors">
                    Daily Brief
                    <ArrowRight size={14} />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto py-8 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-10">

              {/* Today's Picks */}
              <section>
                <SectionHeader label="Today's Picks" href="/topics" accent="#4DC820" />
                <div className="scroll-row">
                  {videos.map(v => <VideoCard key={v.id} {...v} />)}
                </div>
              </section>

              {/* Hot Themes */}
              <section>
                <SectionHeader label="Hot Themes" href="/themes" accent="#E8193C" />
                <div className="scroll-row">
                  {hotThemes.map(t => <ThemeCard key={t.id} theme={t} />)}
                </div>
              </section>

              {/* Podcasts */}
              <section>
                <SectionHeader label="Podcasts Worth Your Time" href="/podcasts" accent="#00AEEF" />
                <div className="scroll-row">
                  {podcasts.map(p => <VideoCard key={p.id} {...p} />)}
                  {videos.slice(0, 2).map(v => <VideoCard key={`pod-${v.id}`} {...v} type="podcast" />)}
                </div>
              </section>

              {/* Explore by Topic */}
              <section>
                <SectionHeader label="Explore by Topic" href="/topics" accent="#7B2FBE" />
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {topicGrid.map(topic => (
                    <Link key={topic.id} href={`/topics/${topic.id}`}>
                      <div className="content-card rounded-xl border border-[#EAECF0] p-3 text-center cursor-pointer"
                           style={{ backgroundColor: topic.color }}>
                        <div className="text-2xl mb-1">{topic.icon}</div>
                        <div className="text-xs font-semibold text-[#101828] leading-tight">{topic.label}</div>
                        <div className="text-[10px] text-[#667085] mt-0.5">{topic.count} videos</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <RadarRow />

              {/* Top Creators */}
              <div className="bg-white rounded-xl border border-[#EAECF0] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#EAECF0] flex items-center justify-between">
                  <span className="font-bold text-sm text-[#101828]" style={{ fontFamily: "var(--font-display)" }}>
                    Top Creators
                  </span>
                </div>
                <div className="divide-y divide-[#F2F4F7]">
                  {creators.slice(0, 5).map(c => (
                    <Link key={c.id} href={`/creators/${c.id}`}>
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-[#F9FAFB] transition-colors">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                             style={{ backgroundColor: c.color }}>
                          {c.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-[#101828] truncate">{c.name}</div>
                          <div className="text-xs text-[#667085] truncate">{c.specialty}</div>
                        </div>
                        <span className="text-xs text-[#98A2B3]">{c.videoCount}</span>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="px-4 py-3 border-t border-[#EAECF0]">
                  <Link href="/creators">
                    <span className="text-xs font-semibold flex items-center gap-1 cc-gradient-text">
                      All creators <ChevronRight size={12} />
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <KaiChat />
    </div>
  );
}
