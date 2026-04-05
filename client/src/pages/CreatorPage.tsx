// CreatorPage — /creators/:id
// Design: Spotify artist page x YouTube channel page
// Large hero banner with creator avatar, bio, stats, Kai's take, and video shelf
// Color: dark gradient hero using creator's brand color, white/dark body

import { useParams, useLocation } from "wouter";
import { ArrowLeft, ExternalLink, CheckCircle2, Play, Flame } from "lucide-react";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { VideoCard } from "@/components/shared/VideoCard";
import { ScoreRing } from "@/components/shared/ScoreRing";
import { creators, todaysPicks } from "@/lib/mockData";

export default function CreatorPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const creator = creators.find(c => c.id === id);

  if (!creator) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground mb-2">Creator not found</p>
          <button onClick={() => setLocation("/topics")}
            className="text-sm text-[#00AEEF] hover:underline">← Back to Browse</button>
        </div>
      </div>
    );
  }

  // Filter videos by this creator
  const creatorVideos = todaysPicks.filter(v => v.creator.name === creator.name);
  // If no exact match, show a few sample videos
  const displayVideos = creatorVideos.length > 0 ? creatorVideos : todaysPicks.slice(0, 3);

  // Compute a mock "signal accuracy" from convergence scores
  const avgScore = displayVideos.reduce((sum, v) => sum + v.convergenceScore, 0) / (displayVideos.length || 1);

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden"
           style={{ background: `linear-gradient(135deg, ${creator.color}22 0%, #1a2035 60%, #0d1117 100%)` }}>
        {/* Spectrum top bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5"
             style={{ background: "linear-gradient(90deg, #E8193C 0%, #00AEEF 33%, #7B2FBE 66%, #4DC820 100%)" }} />

        {/* Blurred color blob behind avatar */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
             style={{ background: creator.color }} />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          {/* Back button */}
          <button onClick={() => setLocation("/topics")}
            className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors mb-8">
            <ArrowLeft size={15} />
            Browse Creators
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden shadow-2xl"
                   style={{ outline: `4px solid ${creator.color}66`, outlineOffset: "2px" }}>
                {creator.avatarUrl ? (
                  <img src={creator.avatarUrl} alt={creator.name}
                       className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-4xl font-black"
                       style={{ background: creator.color }}>
                    {creator.avatar}
                  </div>
                )}
              </div>
              {creator.verified && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                     style={{ background: "#4DC820" }}>
                  <CheckCircle2 size={16} color="#101828" />
                </div>
              )}
            </div>

            {/* Name + meta */}
            <div className="text-center sm:text-left flex-1">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white/80 border border-white/20"
                      style={{ background: creator.color + "33" }}>
                  Creator
                </span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-1"
                  style={{ fontFamily: "var(--font-display)" }}>
                {creator.name}
              </h1>
              <p className="text-white/60 text-sm mb-4">{creator.handle} · {creator.specialty}</p>

              {/* Stats row */}
              <div className="flex items-center justify-center sm:justify-start gap-6 text-sm">
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
                    {creator.tags?.length ?? 4}
                  </p>
                  <p className="text-white/50 text-xs">Topics</p>
                </div>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              <a href={creator.youtubeUrl} target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl text-white border border-white/20 hover:bg-white/10 transition-colors">
                <ExternalLink size={14} />
                YouTube Channel
              </a>
              <button className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity"
                      style={{ color: "#101828" }}>
                <Flame size={14} />
                Follow Creator
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left: main content */}
        <div className="lg:col-span-2 space-y-10">

          {/* About */}
          <section>
            <h2 className="text-lg font-black text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
              About
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {creator.bio}
            </p>
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-4">
              {creator.tags?.map(tag => (
                <span key={tag}
                      className="text-xs font-semibold px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                  {tag}
                </span>
              ))}
            </div>
          </section>

          {/* Videos */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                Latest Videos
              </h2>
              <button className="text-xs font-semibold text-[#00AEEF] hover:underline">
                See all {creator.videoCount} →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {displayVideos.map(video => (
                <VideoCard key={video.id} {...video} />
              ))}
            </div>
          </section>

          {/* Top Tickers */}
          <section>
            <h2 className="text-lg font-black text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Most Covered Tickers
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(creator.topTickers ?? []).map((ticker, i) => {
                const scores = [95, 88, 78, 71, 65];
                const score = scores[i] ?? 60;
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
        </div>

        {/* Right: sidebar */}
        <div className="space-y-6">

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
          <div className="bg-card border border-border rounded-2xl p-4">
            <h3 className="text-sm font-bold text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Similar Creators
            </h3>
            <div className="space-y-3">
              {creators
                .filter(c => c.id !== creator.id)
                .slice(0, 4)
                .map(c => (
                  <a key={c.id} href={`/creators/${c.id}`}
                     className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
                             style={{ background: c.color }}>
                          {c.avatar}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{c.specialty.split(",")[0]}</p>
                    </div>
                    <Play size={12} className="ml-auto text-muted-foreground flex-shrink-0" />
                  </a>
                ))}
            </div>
          </div>
        </div>
      </div>

      <KaiChat />
    </div>
  );
}
