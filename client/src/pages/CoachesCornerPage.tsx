// CheatCode OS — Coaches Corner Directory
// Design: Editorial, Spotify-meets-Robinhood. Light bg, bold typography, asymmetric layout.
// Each coach card links to /coaches-corner/:id (dedicated profile page)
// No modals on this page — clean browsing experience

import { useState } from "react";
import { Link } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Award, Star, Users, BookOpen, Calendar, Zap, ArrowRight,
  CheckCircle, Search, ChevronRight, Shield, TrendingUp, Play,
  DollarSign, BarChart2
} from "lucide-react";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { COACHES, PRODUCT_TYPE_CONFIG, type Coach } from "@/lib/coachesData";

// ─── Coach Card ───────────────────────────────────────────────────────────────

function CoachCard({ coach }: { coach: Coach }) {
  const totalProducts = coach.products.length;
  const lowestPrice = Math.min(...coach.products.map(p => p.price));

  return (
    <Link href={`/coaches-corner/${coach.id}`}>
      <article className="group bg-card rounded-2xl border border-border overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-[#4DC820]/40">
        {/* Color bar */}
        <div className="h-1.5 w-full" style={{ background: coach.avatarColor }} />

        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start gap-4 mb-4">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0 shadow-sm"
              style={{ background: coach.avatarColor }}
            >
              {coach.initials}
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                <h3 className="font-bold text-foreground text-base leading-tight" style={{ fontFamily: "var(--font-display)" }}>
                  {coach.name}
                </h3>
                {coach.verified && (
                  <CheckCircle size={14} style={{ color: "#4DC820" }} className="flex-shrink-0" />
                )}
                {coach.featured && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: "#FAFDE8", color: "#7A6800", border: "1px solid #E8F08A" }}>
                    ⭐ Featured
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-1.5">{coach.handle} · {coach.experience}</p>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Star size={11} fill="#F79009" style={{ color: "#F79009" }} />
                  {coach.rating}
                  <span className="text-muted-foreground font-normal">({coach.reviews})</span>
                </span>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Users size={10} />
                  {coach.students} students
                </span>
              </div>
            </div>
          </div>

          {/* Tagline */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">
            {coach.tagline}
          </p>

          {/* Specialty tags */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {coach.specialty.map(s => (
              <span key={s}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-full border"
                    style={{ background: "#F9FAFB", borderColor: "#EAECF0", color: "#475467" }}>
                {s}
              </span>
            ))}
          </div>

          {/* Products row */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {coach.products.map(p => {
              const cfg = PRODUCT_TYPE_CONFIG[p.type];
              return (
                <span key={p.id}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border"
                      style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                  {cfg.icon} {cfg.label}
                </span>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div>
              <span className="text-xs text-muted-foreground">From </span>
              <span className="text-sm font-bold text-foreground">${lowestPrice}</span>
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold text-[#4DC820] group-hover:gap-2 transition-all">
              View Profile <ArrowRight size={12} />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

// ─── Featured Coach Banner ────────────────────────────────────────────────────

function FeaturedCoachBanner({ coach }: { coach: Coach }) {
  return (
    <Link href={`/coaches-corner/${coach.id}`}>
      <div className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-xl"
           style={{ background: "linear-gradient(135deg, #2B3245 0%, #1a2035 100%)" }}>
        {/* Top accent */}
        <div className="h-1 w-full" style={{ background: coach.avatarColor }} />

        <div className="p-7 grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
          {/* Left: avatar + name */}
          <div className="md:col-span-2 flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0 shadow-lg"
                 style={{ background: coach.avatarColor }}>
              {coach.initials}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(77,200,32,0.2)", color: "#4DC820", border: "1px solid rgba(77,200,32,0.3)" }}>
                  ⭐ Featured Coach
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-0.5" style={{ fontFamily: "var(--font-display)" }}>
                {coach.name}
              </h3>
              <p className="text-sm" style={{ color: "#98A2B3" }}>{coach.handle}</p>
              <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: "#98A2B3" }}>
                <span className="flex items-center gap-1 text-white font-medium">
                  <Star size={12} fill="#F79009" style={{ color: "#F79009" }} />
                  {coach.rating}
                </span>
                <span>{coach.students} students</span>
                <span>{coach.experience} exp.</span>
              </div>
            </div>
          </div>

          {/* Center: bio */}
          <div className="md:col-span-2">
            <p className="text-sm leading-relaxed mb-3" style={{ color: "#D0D5DD" }}>
              {coach.longBio.substring(0, 180)}...
            </p>
            <div className="flex flex-wrap gap-2">
              {coach.tags.slice(0, 4).map(tag => (
                <span key={tag} className="text-[11px] px-2.5 py-1 rounded-full"
                      style={{ background: "rgba(255,255,255,0.08)", color: "#98A2B3", border: "1px solid rgba(255,255,255,0.1)" }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Right: CTA */}
          <div className="md:col-span-1 flex flex-col gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                {coach.products.length}
              </p>
              <p className="text-xs" style={{ color: "#98A2B3" }}>products available</p>
            </div>
            <button className="w-full flex items-center justify-center gap-2 text-[#101828] text-sm font-bold py-2.5 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity group-hover:scale-105 transition-transform">
              View Profile <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar() {
  const totalStudents = COACHES.reduce((s, c) => s + c.students, 0);
  const totalProducts = COACHES.reduce((s, c) => s + c.products.length, 0);
  const avgRating = (COACHES.reduce((s, c) => s + c.rating, 0) / COACHES.length).toFixed(1);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[
        { icon: <Users size={16} />, value: `${totalStudents.toLocaleString()}+`, label: "Students enrolled", color: "#4DC820" },
        { icon: <Award size={16} />, value: COACHES.length.toString(), label: "Verified coaches", color: "#7B2FBE" },
        { icon: <BookOpen size={16} />, value: totalProducts.toString(), label: "Products available", color: "#00AEEF" },
        { icon: <Star size={16} />, value: `${avgRating}★`, label: "Average rating", color: "#F79009" },
      ].map((s, i) => (
        <div key={i} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: `${s.color}18`, color: s.color }}>
            {s.icon}
          </div>
          <div>
            <p className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display)", color: s.color }}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const STYLE_FILTERS = ["All", "Day Trading", "Swing Trading", "Position Trading"];

export default function CoachesCornerPage() {
  const [search, setSearch] = useState("");
  const [styleFilter, setStyleFilter] = useState("All");
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const filtered = COACHES.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) ||
                        c.specialty.some(s => s.toLowerCase().includes(q)) ||
                        c.tags.some(t => t.toLowerCase().includes(q));
    const matchStyle = styleFilter === "All" || c.style === styleFilter;
    return matchSearch && matchStyle;
  });

  const featured = COACHES.find(c => c.featured);

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="page-enter">
        {/* ── Hero ── */}
        <div className="border-b border-border" style={{ background: isDark ? "linear-gradient(180deg, #1a2035 0%, #2B3245 100%)" : "linear-gradient(180deg, #F9FAFB 0%, #FFFFFF 100%)" }}>
          <div className="container mx-auto py-10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                     style={{ background: "linear-gradient(135deg, #4DC820, #C8D400)" }}>
                  <Award size={16} className="text-white" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Coaches Corner
                </span>
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-3 leading-tight" style={{ fontFamily: "var(--font-display)" }}>
                Learn from traders who{" "}
                <span className="cc-gradient-text">actually trade</span>
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed max-w-xl mb-6">
                Every CheatCode Coach is vetted, verified, and holds a real track record. No theory — just the systems, setups, and strategies that work in live markets.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/coach/apply">
                  <button className="flex items-center gap-2 text-[#101828] text-sm font-bold px-5 py-2.5 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity">
                    <Award size={14} /> Become a Coach — Keep 80%
                  </button>
                </Link>
                <button className="flex items-center gap-2 text-foreground text-sm font-medium px-5 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors">
                  <Play size={13} /> How it works
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto py-8 space-y-10">

          {/* ── Stats ── */}
          <StatsBar />

          {/* ── Featured ── */}
          {featured && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Star size={14} fill="#F79009" style={{ color: "#F79009" }} />
                <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                  Featured Coach
                </h2>
              </div>
              <FeaturedCoachBanner coach={featured} />
            </section>
          )}

          {/* ── Directory ── */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                  All Coaches
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {filtered.length} of {COACHES.length} coaches
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search coaches..."
                    className="pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-xl outline-none focus:border-[#4DC820] transition-colors w-48"
                  />
                </div>
                <div className="flex gap-1.5 bg-muted p-1 rounded-xl">
                  {STYLE_FILTERS.map(f => (
                    <button key={f}
                            onClick={() => setStyleFilter(f)}
                            className="text-xs px-3 py-1.5 rounded-lg transition-all font-medium"
                            style={{
                              background: styleFilter === f ? "white" : "transparent",
                              color: styleFilter === f ? "#101828" : "#667085",
                              boxShadow: styleFilter === f ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                            }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map(coach => (
                  <CoachCard key={coach.id} coach={coach} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <Award size={32} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No coaches match your search</p>
                <p className="text-sm mt-1">Try a different keyword or filter</p>
              </div>
            )}
          </section>

          {/* ── Become a Coach CTA ── */}
          <section className="rounded-2xl overflow-hidden border border-border">
            <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #4DC820 0%, #C8D400 100%)" }} />
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Award size={18} style={{ color: "#4DC820" }} />
                  <span className="text-sm font-bold cc-gradient-text">Apply to Coach</span>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
                  Share your edge.<br />
                  Keep <span className="cc-gradient-text">80%</span> of revenue.
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Host courses, 1-on-1 sessions, communities, and trade alerts directly on CheatCode OS. We handle payments, hosting, and distribution — you focus on teaching.
                </p>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: <DollarSign size={16} />, title: "80% Revenue Share", desc: "On every product you sell" },
                    { icon: <Shield size={16} />, title: "Verified Coach Badge", desc: "Displayed on your profile" },
                    { icon: <Users size={16} />, title: "Built-in Audience", desc: "4,800+ active members" },
                    { icon: <BarChart2 size={16} />, title: "Coach Dashboard", desc: "Revenue, students, sessions" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                           style={{ background: "#F0FDE8", color: "#4DC820" }}>
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/coach/apply">
                  <button className="w-full flex items-center justify-center gap-2 text-[#101828] text-sm font-bold py-3 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity">
                    <Award size={14} /> Apply to Become a Coach
                  </button>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      <KaiChat />
    </div>
  );
}
