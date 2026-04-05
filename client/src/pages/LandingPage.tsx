// CheatCode OS — Landing Page
// Design: Bold editorial typography, asymmetric layout, strong color blocks.
// Fully theme-aware via semantic Tailwind tokens + useTheme for inline styles.
// Target: convert cold visitors who don't know what CheatCode OS is.

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight, TrendingUp, TrendingDown, Zap, Users, BarChart2,
  BookOpen, Play, Star, ChevronRight, Check, Flame
} from "lucide-react";
import { fetchRadar, fetchCreators } from "@/lib/api";
import { getCreatorAvatar, getCreatorColor } from "@/lib/creatorRegistry";
import { useTheme } from "@/contexts/ThemeContext";

// ─── Ticker Marquee ───────────────────────────────────────────────────────────

function TickerMarquee({ tickers, isDark }: { tickers: { symbol: string; score: number; direction: string }[]; isDark: boolean }) {
  if (!tickers.length) return null;
  const items = [...tickers, ...tickers];
  return (
    <div className="overflow-hidden border-y border-border py-2.5 bg-card">
      <motion.div
        className="flex gap-6 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        {items.map((t, i) => {
          const isBull = t.direction?.toLowerCase() === "bullish";
          const isBear = t.direction?.toLowerCase() === "bearish";
          const color = isBull ? "#4DC820" : isBear ? "#E8193C" : "#F79009";
          return (
            <Link key={i} href={`/intelligence?ticker=${t.symbol}`}>
              <span className="inline-flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-opacity">
                <span className="ticker-mono text-sm font-bold text-foreground">{t.symbol}</span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: `${color}18`, color }}>
                  {t.score}
                </span>
                <span className="text-xs font-bold" style={{ color }}>
                  {isBull ? "↑" : isBear ? "↓" : "→"}
                </span>
              </span>
            </Link>
          );
        })}
      </motion.div>
    </div>
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────

function FeatureCard({ icon, title, desc, accent, isDark }: { icon: React.ReactNode; title: string; desc: string; accent: string; isDark: boolean }) {
  return (
    <div className="group relative bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: accent }} />
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 flex-shrink-0"
           style={{ background: `${accent}15` }}>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <h3 className="font-bold text-foreground mb-2 text-base" style={{ fontFamily: "var(--font-display)" }}>{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

// ─── Mock Swipe Card ──────────────────────────────────────────────────────────

function MockSwipeCard({ offset = 0, rotate = 0, zIndex = 0 }: { offset?: number; rotate?: number; zIndex?: number }) {
  return (
    <div className="absolute w-72 rounded-2xl overflow-hidden shadow-xl border border-border"
         style={{ transform: `translateX(${offset}px) rotate(${rotate}deg)`, zIndex, top: 0, left: "50%", marginLeft: -144 }}>
      <div className="relative bg-[#101828] h-80">
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#4DC820] flex items-center justify-center text-white text-xs font-bold">JD</div>
            <div>
              <p className="text-white text-xs font-bold">@jdtrader</p>
              <p className="text-[#98A2B3] text-[10px]">Swing Trader · Level 12</p>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="ticker-mono text-white font-bold text-lg">PLTR</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#4DC820]/20 text-[#4DC820]">↑ Bullish</span>
            </div>
            <p className="text-[#98A2B3] text-xs">Breaking out of 6-week consolidation. Target $32, stop $24.50.</p>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-[#4DC820] rounded-full" style={{ width: "70%" }} />
            </div>
            <span className="text-[10px] text-[#98A2B3]">70 score</span>
          </div>
        </div>
      </div>
      <div className="bg-card px-5 py-3 flex items-center justify-between border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#E8193C] flex items-center justify-center">
            <TrendingDown size={16} className="text-[#E8193C]" />
          </div>
          <span className="text-xs text-muted-foreground">Swipe left to pass</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Swipe right to like</span>
          <div className="w-10 h-10 rounded-full border-2 border-[#4DC820] flex items-center justify-center">
            <TrendingUp size={16} className="text-[#4DC820]" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Creator Avatar ───────────────────────────────────────────────────────────

function CreatorAvatar({ creator }: { creator: any }) {
  const avatar = getCreatorAvatar(creator.slug || creator.name);
  const color = getCreatorColor(creator.slug || creator.name);
  const initials = (creator.name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <Link href={`/creators/${creator.slug || creator.id}`}>
      <div className="flex flex-col items-center gap-2 group cursor-pointer">
        <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-border group-hover:border-[#4DC820] transition-colors shadow-sm">
          {avatar ? (
            <img src={avatar} alt={creator.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold"
                 style={{ background: color }}>
              {initials}
            </div>
          )}
        </div>
        <p className="text-xs font-semibold text-muted-foreground text-center leading-tight max-w-[72px] group-hover:text-[#4DC820] transition-colors">
          {creator.name?.replace(" Finance", "").replace(" Trading", "")}
        </p>
      </div>
    </Link>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────

export default function LandingPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [radarTickers, setRadarTickers] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);

  useEffect(() => {
    fetchRadar().then(r => {
      const all = [...(r.critical || []), ...(r.high_conviction || []), ...(r.watch || [])];
      setRadarTickers(all.map(t => ({ symbol: t.symbol, score: t.score, direction: t.direction || "neutral" })));
    }).catch(() => {});
    fetchCreators().then(data => setCreators(data || [])).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans">

      {/* ── Minimal Landing Nav ── */}
      <nav className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                {[
                  { cx: 14, cy: 8.8, color: "#E8193C" },
                  { cx: 7.8, cy: 14, color: "#00AEEF" },
                  { cx: 20.2, cy: 14, color: "#4DC820" },
                  { cx: 14, cy: 19.2, color: "#7B2FBE" },
                ].map((c, i) => (
                  <g key={i}>
                    <circle cx={c.cx} cy={c.cy} r="2.5" stroke={c.color} strokeWidth="1.5" fill="none" />
                    <rect x={c.cx - 1.26} y={c.cy - 1.26} width="2.52" height="2.52"
                          fill={c.color} transform={`rotate(45 ${c.cx} ${c.cy})`} />
                  </g>
                ))}
              </svg>
              <span className="font-bold text-foreground text-base tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                cheat<span style={{ background: "linear-gradient(90deg, #4DC820, #BEFF00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>code</span>
                <span className="text-xs font-bold text-muted-foreground ml-1 tracking-widest">OS</span>
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/home">
              <button className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">
                Sign In
              </button>
            </Link>
            <Link href="/onboarding">
              <button className="text-sm font-bold px-4 py-2 rounded-xl cc-gradient-bg text-[#101828] hover:opacity-90 transition-opacity flex items-center gap-1.5">
                Join Free <ArrowRight size={13} />
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-card">
        <div className="absolute inset-0 opacity-[0.03]"
             style={{ backgroundImage: "radial-gradient(circle, #4DC820 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-16 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
                 style={{ background: isDark ? "rgba(77,200,32,0.12)" : "#F0FDE8", border: "1px solid #B6F08A" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-[#4DC820] animate-pulse" />
              <span className="text-[11px] font-bold tracking-wide" style={{ color: isDark ? "#4DC820" : "#2E7A10" }}>
                THE SOCIAL PLATFORM FOR TRADERS
              </span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-black text-foreground leading-[1.05] mb-5"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
              Where traders<br />
              <span style={{ background: "linear-gradient(135deg, #4DC820 0%, #00AEEF 50%, #7B2FBE 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                learn, share,
              </span><br />
              and get the signal.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl">
              CheatCode OS combines curated trading education from 13 top educators, Kai's AI-powered ticker intelligence, and a community of traders who share real trade ideas — all in one platform.
            </p>
            <div className="flex flex-wrap gap-3 mb-10">
              <Link href="/onboarding">
                <button className="inline-flex items-center gap-2 text-base font-bold px-6 py-3.5 rounded-xl cc-gradient-bg text-[#101828] hover:opacity-90 transition-opacity shadow-sm">
                  <Zap size={16} /> Join Free — No Credit Card
                </button>
              </Link>
              <Link href="/intelligence">
                <button className="inline-flex items-center gap-2 text-base font-semibold px-6 py-3.5 rounded-xl bg-background border border-border text-muted-foreground hover:border-[#4DC820] hover:text-foreground transition-all">
                  <BarChart2 size={16} /> Try Intelligence
                </button>
              </Link>
            </div>
            <div className="flex flex-wrap gap-6">
              {[
                { value: "13", label: "Top Educators" },
                { value: "500+", label: "Curated Videos" },
                { value: "Live", label: "AI Signals Daily" },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-2xl font-black text-foreground" style={{ fontFamily: "var(--font-display)" }}>{s.value}</p>
                  <p className="text-xs font-semibold text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Ticker Marquee ── */}
      <TickerMarquee tickers={radarTickers} isDark={isDark} />

      {/* ── What is CheatCode OS ── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">THE PLATFORM</p>
          <h2 className="text-3xl font-black text-foreground" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}>
            Everything a trader needs in one place
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard icon={<Play size={18} />} title="Swipe Feed" desc="A TikTok-style horizontal swipe feed for short-form trade ideas and video clips. Swipe right to like and give the creator XP. Swipe left to pass." accent="#E8193C" isDark={isDark} />
          <FeatureCard icon={<BarChart2 size={18} />} title="Kai Intelligence" desc="AI that cross-references news, options flow, macro, insider activity, earnings, and curated content into one convergence score for any ticker." accent="#00AEEF" isDark={isDark} />
          <FeatureCard icon={<BookOpen size={18} />} title="Curated Education" desc="Handpicked content from 13 of the best trading and investing educators on YouTube — organized by topic, style, and experience level." accent="#7B2FBE" isDark={isDark} />
          <FeatureCard icon={<Users size={18} />} title="Trader Community" desc="Post trade ideas, share P&L, discuss setups, and follow traders whose style matches yours. Trader badges make it easy to find your people." accent="#4DC820" isDark={isDark} />
          <FeatureCard icon={<Star size={18} />} title="XP & Levels" desc="Earn XP for posting, sharing, and being right. Level up from Rookie to Legend. Your track record is your reputation." accent="#F79009" isDark={isDark} />
          <FeatureCard icon={<BookOpen size={18} />} title="Coaches Corner" desc="Book 1-on-1 sessions and buy courses from verified trader coaches. Coaches earn 80% of revenue and get their own dashboard." accent="#E8193C" isDark={isDark} />
        </div>
      </section>

      {/* ── Swipe Feed Preview ── */}
      <section className="py-16 overflow-hidden" style={{ background: isDark ? "#0D1117" : "#101828" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#4DC820] mb-3">SWIPE FEED</p>
              <h2 className="text-3xl font-black text-white mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}>
                Trade ideas, swiped like Tinder
              </h2>
              <p className="text-[#98A2B3] leading-relaxed mb-6">
                Traders post short-form video clips and trade idea cards. You swipe right to like and give them XP, or left to pass. Toggle between video content and trade ideas.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Swipe right = 🔥 Bullish — gives poster +XP",
                  "Swipe left = pass — no penalty",
                  "Toggle: All / Videos / Trade Ideas",
                  "Post your own ideas and earn XP when others like them",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check size={14} className="text-[#4DC820] flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#98A2B3]">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/feed">
                <button className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl cc-gradient-bg text-[#101828] hover:opacity-90 transition-opacity">
                  Open Swipe Feed <ArrowRight size={13} />
                </button>
              </Link>
            </div>
            <div className="relative h-96 flex items-start justify-center">
              <MockSwipeCard offset={16} rotate={6} zIndex={1} />
              <MockSwipeCard offset={-8} rotate={-3} zIndex={2} />
              <MockSwipeCard offset={0} rotate={0} zIndex={3} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Creator Roster ── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">THE EDUCATORS</p>
          <h2 className="text-3xl font-black text-foreground mb-3" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}>
            13 of the best trading educators, curated for you
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            We handpick content from educators who actually teach — not just hype. Every video is tagged by topic, style, and experience level.
          </p>
        </div>
        {creators.length > 0 ? (
          <div className="flex flex-wrap gap-6 justify-center">
            {creators.map((c: any) => <CreatorAvatar key={c.id || c.slug} creator={c} />)}
          </div>
        ) : (
          <div className="flex flex-wrap gap-6 justify-center">
            {[
              "Mark Minervini", "Earn Your Leisure", "Real Vision", "SMB Capital",
              "TJR Trades", "tastytrade", "Humbled Trader", "Investors Podcast",
              "Chris Sain", "Rayner Teo", "Adam Khoo", "Warrior Trading", "Ziptrader"
            ].map(name => (
              <div key={name} className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-muted border border-border flex items-center justify-center">
                  <span className="text-sm font-bold text-muted-foreground">
                    {name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                  </span>
                </div>
                <p className="text-xs font-semibold text-muted-foreground text-center max-w-[72px] leading-tight">
                  {name.replace(" Finance", "").replace(" Trading", "")}
                </p>
              </div>
            ))}
          </div>
        )}
        <div className="text-center mt-8">
          <Link href="/topics">
            <button className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              Browse all content <ChevronRight size={14} />
            </button>
          </Link>
        </div>
      </section>

      {/* ── Trader Identity ── */}
      <section className="bg-card border-y border-border py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">YOUR TRADER IDENTITY</p>
              <h2 className="text-3xl font-black text-foreground mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}>
                Your style. Your level. Your reputation.
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                When you join, you set your trading style, assets, and experience level. These become visible badges on every post you make — so the community knows exactly who they're talking to.
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {[
                  { label: "Day Trader", color: "#E8193C" },
                  { label: "Swing Trader", color: "#00AEEF" },
                  { label: "Options", color: "#7B2FBE" },
                  { label: "Long-Term", color: "#4DC820" },
                  { label: "Crypto", color: "#F79009" },
                  { label: "Futures", color: "#101828" },
                ].map(b => (
                  <span key={b.label} className="text-xs font-bold px-3 py-1.5 rounded-full text-white"
                        style={{ background: b.color }}>
                    {b.label}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-4">
                {[
                  { level: "Rookie", xp: "0 XP", color: "#667085" },
                  { level: "Analyst", xp: "500 XP", color: "#00AEEF" },
                  { level: "Trader", xp: "2K XP", color: "#4DC820" },
                  { level: "Expert", xp: "10K XP", color: "#F79009" },
                  { level: "Legend", xp: "50K XP", color: "#E8193C" },
                ].map(l => (
                  <div key={l.level} className="text-center">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1 text-white text-[10px] font-black"
                         style={{ background: l.color }}>
                      {l.level[0]}
                    </div>
                    <p className="text-[10px] font-bold text-foreground">{l.level}</p>
                    <p className="text-[9px] text-muted-foreground">{l.xp}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Mock profile card */}
            <div className="bg-background rounded-2xl border border-border p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#4DC820] flex items-center justify-center text-white font-black text-base">JD</div>
                <div>
                  <p className="font-bold text-foreground text-sm">@jdtrader</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-[#4DC820]">Swing Trader</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-[#00AEEF]">Options</span>
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs font-bold text-[#F79009]">Expert</p>
                  <p className="text-[10px] text-muted-foreground">12,450 XP</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Trade Ideas", value: "47" },
                  { label: "Win Rate", value: "68%" },
                  { label: "Followers", value: "312" },
                ].map(s => (
                  <div key={s.label} className="bg-card rounded-xl p-3 text-center border border-border">
                    <p className="text-base font-black text-foreground">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Recent Ideas</p>
                {[
                  { ticker: "PLTR", dir: "↑", sentiment: "Bullish", xp: "+45 XP" },
                  { ticker: "NVDA", dir: "↓", sentiment: "Bearish", xp: "+32 XP" },
                ].map(idea => (
                  <div key={idea.ticker} className="flex items-center justify-between bg-card rounded-xl px-3 py-2.5 border border-border">
                    <div className="flex items-center gap-2">
                      <span className="ticker-mono text-sm font-bold text-foreground">{idea.ticker}</span>
                      <span className="text-xs font-bold" style={{ color: idea.sentiment === "Bullish" ? "#4DC820" : "#E8193C" }}>
                        {idea.dir} {idea.sentiment}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-[#F79009]">{idea.xp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
             style={{ background: isDark ? "rgba(77,200,32,0.12)" : "#F0FDE8", border: "1px solid #B6F08A" }}>
          <Flame size={12} style={{ color: isDark ? "#4DC820" : "#2E7A10" }} />
          <span className="text-[11px] font-bold tracking-wide" style={{ color: isDark ? "#4DC820" : "#2E7A10" }}>
            JOIN THE COMMUNITY
          </span>
        </div>
        <h2 className="text-4xl font-black text-foreground mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
          Ready to trade smarter?
        </h2>
        <p className="text-base text-muted-foreground mb-8 max-w-md mx-auto">
          Free to join. No credit card. Start with the swipe feed, explore the intelligence, and find your trading community.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/onboarding">
            <button className="inline-flex items-center gap-2 text-base font-bold px-8 py-4 rounded-xl cc-gradient-bg text-[#101828] hover:opacity-90 transition-opacity shadow-md">
              <Zap size={16} /> Get Started Free
            </button>
          </Link>
          <Link href="/home">
            <button className="inline-flex items-center gap-2 text-base font-semibold px-8 py-4 rounded-xl bg-card border border-border text-muted-foreground hover:border-[#4DC820] transition-all">
              Explore the platform
            </button>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© 2026 CheatCode OS. For educational purposes only. Not financial advice.</p>
          <div className="flex gap-6">
            {[
              { label: "Intelligence", href: "/intelligence" },
              { label: "Browse", href: "/topics" },
              { label: "Pricing", href: "/pricing" },
              { label: "Coaches", href: "/coaches-corner" },
            ].map(l => (
              <Link key={l.href} href={l.href}>
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">{l.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
