// CheatCode OS — Home Page v3: YouTube x Netflix
// Design: Visual-first. Big thumbnails. Netflix shelf rows.
// - Featured "Hero Card" at top (like Netflix featured title)
// - Horizontal scroll shelves per category
// - Minimal text — everything is in the thumbnail or on hover
// - Kai's Radar sidebar stays data-dense (it's meant to be)

import { Link } from "wouter";
import { TrendingUp, TrendingDown, Minus, ChevronRight, ChevronLeft, Flame, Play } from "lucide-react";
import { useRef } from "react";
import { VideoCard } from "@/components/shared/VideoCard";
import { ScoreRing } from "@/components/shared/ScoreRing";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import {
  marketSentiment, todaysPicks, topicGrid, hotThemes, radarTickers, creators
} from "@/lib/mockData";

// ─── Shelf Row (Netflix-style) ───────────────────────────────────────────────
function Shelf({ title, href, accent, children }: {
  title: string; href?: string; accent?: string; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") => {
    if (ref.current) ref.current.scrollBy({ left: dir === "right" ? 320 : -320, behavior: "smooth" });
  };

  return (
    <section className="relative group/shelf">
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2.5">
          {accent && <span className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: accent }} />}
          <h2 className="text-base font-bold text-[#101828]" style={{ fontFamily: "var(--font-display)" }}>
            {title}
          </h2>
        </div>
        {href && (
          <Link href={href}>
            <span className="text-xs font-semibold flex items-center gap-1 cc-gradient-text opacity-0 group-hover/shelf:opacity-100 transition-opacity">
              See all <ChevronRight size={12} />
            </span>
          </Link>
        )}
      </div>

      <div className="relative">
        {/* Left scroll button */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center opacity-0 group-hover/shelf:opacity-100 transition-opacity border border-[#EAECF0]"
        >
          <ChevronLeft size={14} className="text-[#475467]" />
        </button>

        <div ref={ref} className="scroll-row pb-1">
          {children}
        </div>

        {/* Right scroll button */}
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center opacity-0 group-hover/shelf:opacity-100 transition-opacity border border-[#EAECF0]"
        >
          <ChevronRight size={14} className="text-[#475467]" />
        </button>
      </div>
    </section>
  );
}

// ─── Featured Hero Card (Netflix "featured title" style) ──────────────────────
function FeaturedCard({ video }: { video: typeof todaysPicks[0] }) {
  return (
    <Link href={`/video/${video.id}`}>
      <div className="relative rounded-2xl overflow-hidden cursor-pointer group"
           style={{ aspectRatio: "21/9", minHeight: 240 }}>
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0"
             style={{ background: "linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)" }} />
        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:justify-center md:pb-0">
          <div className="max-w-sm">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 inline-block"
                  style={{ background: "rgba(77,200,32,0.85)", color: "#101828" }}>
              {video.relevanceBadge}
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-white leading-snug mb-2"
                style={{ fontFamily: "var(--font-display)" }}>
              {video.title}
            </h2>
            <p className="text-sm text-white/70 leading-relaxed line-clamp-2 mb-4 hidden md:block">
              {video.quickTake}
            </p>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 text-[#101828] text-sm font-bold px-4 py-2 rounded-lg cc-gradient-bg hover:opacity-90 transition-opacity">
                <Play size={13} fill="#101828" />
                Watch Now
              </button>
              <div className="flex items-center gap-1.5">
                {video.tickers.slice(0, 3).map(t => (
                  <span key={t} className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(255,255,255,0.15)", color: "white", fontFamily: "var(--font-mono)" }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Score ring — top right */}
        <div className="absolute top-4 right-4">
          <ScoreRing score={video.convergenceScore} size="md" showLabel={false} />
        </div>
        {/* Creator — top left */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
               style={{ backgroundColor: video.creator.color }}>
            {video.creator.avatar}
          </div>
          <span className="text-xs font-semibold text-white/80">{video.creator.name}</span>
        </div>
      </div>
    </Link>
  );
}

// ─── Theme Pill (compact, visual) ─────────────────────────────────────────────
function ThemePill({ theme }: { theme: typeof hotThemes[0] }) {
  return (
    <Link href={`/themes/${theme.id}`}>
      <div className="flex-shrink-0 cursor-pointer group/pill"
           style={{ width: 180 }}>
        {/* Visual bar */}
        <div className="rounded-xl overflow-hidden mb-2 relative"
             style={{ height: 90, background: `linear-gradient(135deg, ${theme.color}22 0%, ${theme.color}44 100%)`, border: `1px solid ${theme.color}33` }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-black opacity-20" style={{ color: theme.color, fontFamily: "var(--font-mono)" }}>
              {theme.score}
            </span>
          </div>
          <div className="absolute bottom-2 left-3 right-3">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-1 flex-1 rounded-full"
                     style={{ backgroundColor: i < theme.level ? theme.color : `${theme.color}33` }} />
              ))}
            </div>
          </div>
          <div className="absolute top-2 right-2">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: `${theme.color}33`, color: theme.color }}>
              {theme.status}
            </span>
          </div>
        </div>
        <p className="text-xs font-semibold text-[#101828] leading-snug line-clamp-2"
           style={{ fontFamily: "var(--font-display)" }}>
          {theme.label}
        </p>
        <div className="flex gap-1 mt-1 flex-wrap">
          {theme.tickers.slice(0, 2).map(t => (
            <span key={t} className="text-[9px] font-bold text-[#667085]" style={{ fontFamily: "var(--font-mono)" }}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

// ─── Topic Tile (visual grid) ──────────────────────────────────────────────────
function TopicTile({ topic }: { topic: typeof topicGrid[0] }) {
  return (
    <Link href={`/topics/${topic.id}`}>
      <div className="flex-shrink-0 w-28 cursor-pointer group/tile">
        <div className="rounded-xl overflow-hidden mb-1.5 flex flex-col items-center justify-center"
             style={{ height: 80, backgroundColor: topic.color }}>
          <span className="text-3xl">{topic.icon}</span>
        </div>
        <p className="text-[11px] font-semibold text-[#101828] text-center leading-tight"
           style={{ fontFamily: "var(--font-display)" }}>
          {topic.label}
        </p>
        <p className="text-[10px] text-[#98A2B3] text-center">{topic.count}</p>
      </div>
    </Link>
  );
}

// ─── Radar Sidebar ─────────────────────────────────────────────────────────────
function RadarSidebar() {
  return (
    <div className="bg-white rounded-xl border border-[#EAECF0] overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between"
           style={{ background: "linear-gradient(90deg, #2B3245 0%, #1a2035 100%)" }}>
        <div className="flex items-center gap-2">
          <Flame size={14} className="text-[#C8D400]" />
          <span className="font-bold text-sm text-white" style={{ fontFamily: "var(--font-display)" }}>Kai's Radar</span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full tracking-widest"
                style={{ background: "rgba(77,200,32,0.2)", color: "#4DC820" }}>LIVE</span>
        </div>
        <Link href="/intelligence">
          <span className="text-xs font-semibold cc-gradient-text flex items-center gap-1">
            Full <ChevronRight size={11} />
          </span>
        </Link>
      </div>
      <div className="divide-y divide-[#F2F4F7]">
        {radarTickers.map(t => (
          <Link key={t.ticker} href={`/intelligence?ticker=${t.ticker}`}>
            <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#F9FAFB] transition-colors">
              <div className="relative w-8 h-8 flex-shrink-0">
                {(() => {
                  const color = t.score >= 80 ? "#4DC820" : t.score >= 60 ? "#C8D400" : "#E8193C";
                  const r = 13, sw = 2.5, circ = 2 * Math.PI * r;
                  const offset = circ - (t.score / 100) * circ;
                  return (
                    <svg width={32} height={32} style={{ transform: "rotate(-90deg)" }}>
                      <circle cx={16} cy={16} r={r} stroke="#EAECF0" strokeWidth={sw} fill="none" />
                      <circle cx={16} cy={16} r={r} stroke={color} strokeWidth={sw}
                        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" fill="none" />
                    </svg>
                  );
                })()}
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-[#101828]"
                      style={{ fontFamily: "var(--font-mono)" }}>
                  {t.score}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="ticker-mono text-xs font-bold text-[#101828]">{t.ticker}</span>
                  <span className="text-[9px] font-semibold px-1 py-0.5 rounded"
                        style={{
                          color: t.direction === "Bullish" ? "#2E7A10" : "#A8001F",
                          background: t.direction === "Bullish" ? "#F0FDE8" : "#FFF0F3",
                        }}>
                    {t.direction}
                  </span>
                </div>
                <div className="text-[10px] text-[#98A2B3]">{t.timeframe}</div>
              </div>
              <div className="text-xs font-bold flex-shrink-0"
                   style={{ color: t.change.startsWith("+") ? "#4DC820" : "#E8193C" }}>
                {t.change}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const videos = todaysPicks.filter(p => p.type === "video");
  const podcasts = todaysPicks.filter(p => p.type === "podcast");
  const featured = todaysPicks[2]; // tastytrade options flow — highest visual impact

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Nav />

      <main className="page-enter">
        {/* Compact market bar — just one line */}
        <div className="border-b border-[#EAECF0] bg-white">
          <div className="container mx-auto py-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm">
              {marketSentiment.type === "bullish"
                ? <TrendingUp size={14} style={{ color: "#4DC820" }} />
                : marketSentiment.type === "bearish"
                ? <TrendingDown size={14} style={{ color: "#E8193C" }} />
                : <Minus size={14} style={{ color: "#C8D400" }} />}
              <span className="font-semibold text-[#101828]">{marketSentiment.label}</span>
              <span className="text-[#667085] hidden sm:inline">— {marketSentiment.description}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#98A2B3]">{marketSentiment.date}</span>
              <Link href="/newsletter">
                <span className="text-xs font-semibold cc-gradient-text">Daily Brief →</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="container mx-auto py-6 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content — 2/3 width */}
            <div className="lg:col-span-2 space-y-8">

              {/* Featured hero card */}
              <FeaturedCard video={featured} />

              {/* Today's Picks shelf */}
              <Shelf title="Today's Picks" href="/topics" accent="#4DC820">
                {videos.map(v => <VideoCard key={v.id} {...v} />)}
                {podcasts.slice(0, 2).map(p => <VideoCard key={`p-${p.id}`} {...p} />)}
              </Shelf>

              {/* Hot Themes shelf */}
              <Shelf title="Hot Themes" href="/topics" accent="#E8193C">
                {hotThemes.map(t => <ThemePill key={t.id} theme={t} />)}
              </Shelf>

              {/* Podcasts shelf */}
              <Shelf title="Podcasts Worth Your Time" href="/podcasts" accent="#00AEEF">
                {podcasts.map(p => <VideoCard key={p.id} {...p} wide />)}
                {videos.slice(0, 2).map(v => <VideoCard key={`pod-${v.id}`} {...v} type="podcast" wide />)}
              </Shelf>

              {/* Browse by Topic */}
              <Shelf title="Browse by Topic" href="/topics" accent="#7B2FBE">
                {topicGrid.map(t => <TopicTile key={t.id} topic={t} />)}
              </Shelf>

              {/* Top Creators shelf */}
              <Shelf title="Top Creators" href="/creators" accent="#C8D400">
                {creators.map(c => (
                  <Link key={c.id} href={`/creators/${c.id}`}>
                    <div className="flex-shrink-0 w-36 cursor-pointer group/creator text-center">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-2 transition-transform duration-200 group-hover/creator:scale-110"
                           style={{ backgroundColor: c.color }}>
                        {c.avatar}
                      </div>
                      <p className="text-xs font-semibold text-[#101828] truncate" style={{ fontFamily: "var(--font-display)" }}>
                        {c.name}
                      </p>
                      <p className="text-[10px] text-[#98A2B3] truncate">{c.specialty}</p>
                    </div>
                  </Link>
                ))}
              </Shelf>
            </div>

            {/* Sidebar — 1/3 width */}
            <div className="space-y-5">
              <RadarSidebar />

              {/* Quick links */}
              <div className="grid grid-cols-2 gap-3">
                <Link href="/intelligence">
                  <div className="rounded-xl p-4 text-center cursor-pointer hover:opacity-90 transition-opacity"
                       style={{ background: "linear-gradient(135deg, #2B3245 0%, #1a2035 100%)" }}>
                    <div className="text-2xl mb-1">🧠</div>
                    <p className="text-xs font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Intelligence</p>
                    <p className="text-[10px] text-white/50 mt-0.5">Ticker lookup</p>
                  </div>
                </Link>
                <Link href="/learn">
                  <div className="rounded-xl p-4 text-center cursor-pointer hover:opacity-90 transition-opacity cc-gradient-bg">
                    <div className="text-2xl mb-1">📚</div>
                    <p className="text-xs font-bold text-[#101828]" style={{ fontFamily: "var(--font-display)" }}>Learn</p>
                    <p className="text-[10px] text-[#101828]/60 mt-0.5">Learning paths</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <KaiChat />
    </div>
  );
}
