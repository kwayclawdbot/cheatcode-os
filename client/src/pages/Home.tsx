// CheatCode OS — Home Page: "Today in the Market"
// Design: Daily habit page. Opens every morning.
// Layout: Sentiment bar → Featured picks → Horizontal scroll rows → Topic grid → Radar
// Style: Robinhood-simple. No charts. No data overload.

import { Link } from "wouter";
import { TrendingUp, TrendingDown, Minus, ArrowRight, Play, ChevronRight, Flame } from "lucide-react";
import { VideoCard } from "@/components/shared/VideoCard";
import { ScoreRing } from "@/components/shared/ScoreRing";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import {
  marketSentiment, todaysPicks, topicGrid, hotThemes, radarTickers, creators
} from "@/lib/mockData";

const HERO_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663185570724/QgiApnmXYRXSMA2KNkFFkL/hero-banner-2yeBhxB5MaexrZkXyaLwmy.webp";

function SentimentIcon({ type }: { type: string }) {
  if (type === "bullish") return <TrendingUp size={16} className="text-[#027A48]" />;
  if (type === "bearish") return <TrendingDown size={16} className="text-[#B42318]" />;
  return <Minus size={16} className="text-[#B54708]" />;
}

function SectionHeader({ label, href, count }: { label: string; href?: string; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
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
          <span className="text-sm text-[#12B76A] font-semibold flex items-center gap-1 hover:gap-2 transition-all">
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
      <div className="px-4 py-3 border-b border-[#EAECF0] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame size={16} className="text-[#F79009]" />
          <span className="font-bold text-sm text-[#101828]" style={{ fontFamily: "var(--font-display)" }}>
            Kai's Radar
          </span>
          <span className="section-label">LIVE</span>
        </div>
        <Link href="/intelligence">
          <span className="text-xs text-[#12B76A] font-semibold flex items-center gap-1">
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
                    t.direction === "Bullish" ? "text-[#027A48] bg-[#ECFDF3]" : "text-[#B42318] bg-[#FEF3F2]"
                  }`}>
                    {t.direction}
                  </span>
                  <span className="text-xs text-[#98A2B3]">{t.timeframe}</span>
                </div>
                <div className="text-xs text-[#667085] mt-0.5">{t.confidence} conviction</div>
              </div>
              <div className={`text-sm font-semibold ${t.change.startsWith("+") ? "text-[#12B76A]" : "text-[#F04438]"}`}>
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
  const statusColors: Record<string, string> = {
    "Escalating": "text-[#B42318] bg-[#FEF3F2] border-[#FECDCA]",
    "Active": "text-[#027A48] bg-[#ECFDF3] border-[#A9EFC5]",
    "Watch": "text-[#B54708] bg-[#FFFAEB] border-[#FEDF89]",
    "New": "text-[#1570EF] bg-[#EFF8FF] border-[#B2DDFF]",
  };
  return (
    <Link href={`/themes/${theme.id}`}>
      <div className="content-card bg-white rounded-xl border border-[#EAECF0] p-4 cursor-pointer w-56 flex-shrink-0">
        <div className="flex items-start justify-between mb-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColors[theme.status]}`}>
            {theme.status}
          </span>
          <span className="score-number text-lg font-bold" style={{ color: theme.color }}>
            {theme.score}
          </span>
        </div>
        <h3 className="font-semibold text-[#101828] text-sm leading-snug mb-2" style={{ fontFamily: "var(--font-display)" }}>
          {theme.label}
        </h3>
        <div className="flex gap-1 flex-wrap">
          {theme.tickers.map(t => (
            <span key={t} className="ticker-mono text-[10px] bg-[#F9FAFB] border border-[#EAECF0] px-1.5 py-0.5 rounded text-[#475467]">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i < theme.level ? "" : "bg-[#EAECF0]"}`}
                 style={{ backgroundColor: i < theme.level ? theme.color : undefined }} />
          ))}
          <span className="text-[10px] text-[#98A2B3] ml-1">Lvl {theme.level}</span>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const videos = todaysPicks.filter(p => p.type === "video");
  const podcasts = todaysPicks.filter(p => p.type === "podcast");

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Nav />

      <main className="page-enter">
        {/* Hero Banner */}
        <div className="relative bg-white border-b border-[#EAECF0] overflow-hidden">
          <div className="absolute inset-0 opacity-[0.06]">
            <img src={HERO_IMAGE} alt="" className="w-full h-full object-cover object-center" />
          </div>
          <div className="container mx-auto py-8 relative">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="section-label mb-1">{marketSentiment.date}</p>
                <h1 className="text-2xl md:text-3xl font-bold text-[#101828] mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  Today in the Market
                </h1>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold sentiment-${marketSentiment.type}`}>
                  <SentimentIcon type={marketSentiment.type} />
                  {marketSentiment.label} — {marketSentiment.description}
                </div>
              </div>
              <div className="flex gap-3">
                <Link href="/intelligence">
                  <button className="flex items-center gap-2 bg-[#12B76A] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#0EA05E] transition-colors">
                    <TrendingUp size={14} />
                    Open Radar
                  </button>
                </Link>
                <Link href="/newsletter">
                  <button className="flex items-center gap-2 bg-white text-[#475467] text-sm font-semibold px-4 py-2 rounded-lg border border-[#EAECF0] hover:bg-[#F9FAFB] transition-colors">
                    Daily Brief
                    <ArrowRight size={14} />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto py-8 space-y-10">
          {/* Two-column layout: main content + radar sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-10">
              {/* Today's Picks */}
              <section>
                <SectionHeader label="Today's Picks" href="/topics" />
                <div className="scroll-row">
                  {videos.map(v => (
                    <VideoCard key={v.id} {...v} />
                  ))}
                </div>
              </section>

              {/* Hot Themes */}
              <section>
                <SectionHeader label="Hot Themes" href="/themes" />
                <div className="scroll-row">
                  {hotThemes.map(t => (
                    <ThemeCard key={t.id} theme={t} />
                  ))}
                </div>
              </section>

              {/* Podcasts */}
              <section>
                <SectionHeader label="Podcasts Worth Your Time" href="/podcasts" />
                <div className="scroll-row">
                  {podcasts.map(p => (
                    <VideoCard key={p.id} {...p} />
                  ))}
                  {videos.slice(0, 2).map(v => (
                    <VideoCard key={`pod-${v.id}`} {...v} type="podcast" />
                  ))}
                </div>
              </section>

              {/* Explore by Topic */}
              <section>
                <SectionHeader label="Explore by Topic" href="/topics" />
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

            {/* Sidebar: Radar */}
            <div className="space-y-6">
              <RadarRow />

              {/* Top Creators */}
              <div className="bg-white rounded-xl border border-[#EAECF0] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#EAECF0]">
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
                    <span className="text-xs text-[#12B76A] font-semibold flex items-center gap-1">
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
