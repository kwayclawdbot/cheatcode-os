// CheatCode OS — Coaches Corner
// Design: Light editorial layout, coach cards with avatar + specialty + products
// Sections: Hero, Featured Coach, All Coaches grid, Coach Profile modal/detail

import { useState } from "react";
import { Link } from "wouter";
import {
  Award, Star, Users, BookOpen, Calendar, Zap, ArrowRight,
  CheckCircle, Play, DollarSign, Clock, MessageSquare, Filter,
  Search, ChevronRight, X, Video, Shield, BarChart2
} from "lucide-react";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CoachProduct {
  id: string;
  type: "course" | "1on1" | "community" | "alerts";
  title: string;
  price: number;
  students?: number;
  duration?: string;
  rating: number;
  reviews: number;
  description: string;
}

interface Coach {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  initials: string;
  avatarColor: string;
  specialty: string[];
  style: string;
  bio: string;
  longBio: string;
  rating: number;
  reviews: number;
  students: number;
  experience: string;
  verified: boolean;
  featured: boolean;
  products: CoachProduct[];
  tags: string[];
  youtubeUrl?: string;
  twitterUrl?: string;
  topTickers: string[];
}

// ─── Coach Data ───────────────────────────────────────────────────────────────

const COACHES: Coach[] = [
  {
    id: "james-okafor",
    name: "James Okafor",
    handle: "@jamesokafor",
    avatar: "",
    initials: "JO",
    avatarColor: "linear-gradient(135deg, #4DC820, #C8D400)",
    specialty: ["Day Trading", "Options Flow", "Momentum"],
    style: "Day Trading",
    bio: "Prop trader with 8+ years experience. Former SMB Capital trader. Specializing in momentum setups and options flow.",
    longBio: "James Okafor spent 5 years as a prop trader at SMB Capital before going independent. He now runs a full-time trading education business focused on momentum day trading and options flow analysis. His students have gone on to trade professionally at prop firms across the US.",
    rating: 4.9,
    reviews: 284,
    students: 445,
    experience: "8+ years",
    verified: true,
    featured: true,
    tags: ["Momentum", "Options", "Prop Trading", "Day Trading"],
    topTickers: ["NVDA", "AMD", "TSLA", "SPY"],
    products: [
      { id: "p1", type: "course", title: "Momentum Day Trading Masterclass", price: 197, students: 84, duration: "12h 30m", rating: 4.9, reviews: 156, description: "Complete A-to-Z system for momentum day trading. From scanner setup to execution to risk management." },
      { id: "p2", type: "1on1", title: "1-on-1 Coaching Session", price: 149, rating: 5.0, reviews: 62, description: "60-minute live coaching call. Bring your charts, your questions, and your trade journal." },
      { id: "p3", type: "community", title: "Elite Traders Inner Circle", price: 49, students: 127, rating: 4.8, reviews: 66, description: "Private Discord with daily watchlists, live trade alerts, and weekly group coaching calls." },
    ],
  },
  {
    id: "carlos-rivera",
    name: "Carlos Rivera",
    handle: "@carlosrivera",
    avatar: "",
    initials: "CR",
    avatarColor: "linear-gradient(135deg, #7B2FBE, #00AEEF)",
    specialty: ["Crypto", "Macro", "On-Chain Analysis"],
    style: "Position Trading",
    bio: "Macro and crypto analyst with 45K Twitter followers. Former institutional research analyst covering digital assets.",
    longBio: "Carlos Rivera spent 6 years as a digital assets research analyst at a multi-billion dollar family office before building his independent research platform. He covers the intersection of macro economics and crypto markets, with a focus on on-chain data and institutional flow.",
    rating: 4.8,
    reviews: 198,
    students: 312,
    experience: "6+ years",
    verified: true,
    featured: false,
    tags: ["Crypto", "Macro", "On-Chain", "Bitcoin", "DeFi"],
    topTickers: ["BTC", "ETH", "SOL", "MSTR"],
    products: [
      { id: "p4", type: "course", title: "Crypto Macro Framework", price: 147, students: 203, duration: "8h 45m", rating: 4.8, reviews: 134, description: "Learn to analyze crypto markets through a macro lens. Interest rates, dollar cycles, and institutional positioning." },
      { id: "p5", type: "alerts", title: "Crypto Intelligence Alerts", price: 29, students: 109, rating: 4.7, reviews: 64, description: "Daily on-chain alerts, macro signals, and high-conviction trade setups delivered to your inbox." },
    ],
  },
  {
    id: "jordan-mills",
    name: "Jordan Mills",
    handle: "@jordanmills",
    avatar: "",
    initials: "JM",
    avatarColor: "linear-gradient(135deg, #F79009, #E8193C)",
    specialty: ["Options Flow", "Day Trading", "Unusual Activity"],
    style: "Day Trading",
    bio: "7-year prop trader turned educator. 12K YouTube subscribers. Known for reading unusual options activity before big moves.",
    longBio: "Jordan Mills spent 7 years trading at a proprietary options firm in Chicago before launching his education platform. He's known for his ability to read unusual options activity and dark pool prints to front-run institutional moves.",
    rating: 4.7,
    reviews: 142,
    students: 287,
    experience: "7+ years",
    verified: true,
    featured: false,
    tags: ["Options Flow", "Dark Pool", "Unusual Activity", "Day Trading"],
    topTickers: ["SPY", "QQQ", "NVDA", "AAPL"],
    products: [
      { id: "p6", type: "course", title: "Options Flow Mastery", price: 127, students: 178, duration: "9h 15m", rating: 4.7, reviews: 98, description: "Learn to read options flow, dark pool prints, and unusual activity to identify institutional positioning." },
      { id: "p7", type: "1on1", title: "Flow Analysis Session", price: 99, rating: 4.9, reviews: 44, description: "45-minute session focused on reading the options tape and building your flow-based trading system." },
    ],
  },
  {
    id: "nia-thompson",
    name: "Nia Thompson",
    handle: "@niathompson",
    avatar: "",
    initials: "NT",
    avatarColor: "linear-gradient(135deg, #2E90FA, #7B2FBE)",
    specialty: ["Swing Trading", "VCP", "Fundamental + Technical"],
    style: "Swing Trading",
    bio: "Former hedge fund analyst turned swing trader. Combines fundamental research with Minervini-style VCP setups.",
    longBio: "Nia Thompson spent 5 years as an equity research analyst at a long/short hedge fund before transitioning to independent swing trading. She combines deep fundamental research with technical VCP setups to find high-conviction multi-week trades.",
    rating: 4.8,
    reviews: 89,
    students: 156,
    experience: "5+ years",
    verified: true,
    featured: false,
    tags: ["Swing Trading", "VCP", "Fundamental Analysis", "Growth Stocks"],
    topTickers: ["NVDA", "META", "GOOGL", "SMCI"],
    products: [
      { id: "p8", type: "course", title: "Fundamental + Technical Swing Trading", price: 167, students: 89, duration: "10h 00m", rating: 4.8, reviews: 67, description: "Combine earnings quality analysis with VCP chart setups to find the highest-conviction swing trades." },
      { id: "p9", type: "community", title: "Swing Trader's Circle", price: 39, students: 67, rating: 4.7, reviews: 22, description: "Weekly watchlist, trade alerts, and group analysis calls every Sunday evening." },
    ],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProductCard({ product, coachName }: { product: CoachProduct; coachName: string }) {
  const typeMap: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string; border: string }> = {
    course:    { icon: <BookOpen size={14} />, label: "Course", color: "#005F8A", bg: "#E8F8FF", border: "#7FDBF8" },
    "1on1":    { icon: <Calendar size={14} />, label: "1-on-1", color: "#5B1FA0", bg: "#F5EEFF", border: "#C4A0F0" },
    community: { icon: <Users size={14} />, label: "Community", color: "#7A6800", bg: "#FAFDE8", border: "#E8F08A" },
    alerts:    { icon: <Zap size={14} />, label: "Alerts", color: "#A8001F", bg: "#FFF0F3", border: "#F8A3B1" },
  };
  const t = typeMap[product.type] || typeMap.course;

  return (
    <div className="bg-background rounded-xl border border-border p-4 hover:border-[#4DC820] transition-colors group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border"
              style={{ background: t.bg, color: t.color, borderColor: t.border }}>
          {t.icon} {t.label}
        </span>
        <div className="flex items-center gap-1 text-xs">
          <Star size={11} fill="#F79009" style={{ color: "#F79009" }} />
          <span className="font-semibold text-foreground">{product.rating}</span>
          <span className="text-muted-foreground">({product.reviews})</span>
        </div>
      </div>

      <h4 className="font-bold text-foreground text-sm mb-1.5 leading-snug group-hover:text-[#4DC820] transition-colors"
          style={{ fontFamily: "var(--font-display)" }}>
        {product.title}
      </h4>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{product.description}</p>

      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
        {product.students && <span className="flex items-center gap-1"><Users size={10} />{product.students} students</span>}
        {product.duration && <span className="flex items-center gap-1"><Clock size={10} />{product.duration}</span>}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <span className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            ${product.price}
          </span>
          {product.type === "community" || product.type === "alerts" ? (
            <span className="text-xs text-muted-foreground">/mo</span>
          ) : null}
        </div>
        <button className="flex items-center gap-1.5 text-[#101828] text-xs font-bold px-3 py-1.5 rounded-lg cc-gradient-bg hover:opacity-90 transition-opacity">
          Enroll <ArrowRight size={11} />
        </button>
      </div>
    </div>
  );
}

function CoachCard({ coach, onSelect }: { coach: Coach; onSelect: (c: Coach) => void }) {
  return (
    <div
      className="bg-card rounded-2xl border border-border overflow-hidden cursor-pointer hover:border-[#4DC820] transition-all group"
      onClick={() => onSelect(coach)}
    >
      {/* Top accent */}
      <div className="h-1 w-full" style={{ background: coach.avatarColor }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
               style={{ background: coach.avatarColor }}>
            {coach.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{coach.name}</h3>
              {coach.verified && (
                <CheckCircle size={14} style={{ color: "#4DC820" }} />
              )}
            </div>
            <p className="text-xs text-muted-foreground">{coach.handle}</p>
            <div className="flex items-center gap-1 mt-1">
              <Star size={11} fill="#F79009" style={{ color: "#F79009" }} />
              <span className="text-xs font-semibold text-foreground">{coach.rating}</span>
              <span className="text-xs text-muted-foreground">({coach.reviews} reviews)</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-foreground">{coach.students}</p>
            <p className="text-[10px] text-muted-foreground">students</p>
          </div>
        </div>

        {/* Bio */}
        <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">{coach.bio}</p>

        {/* Specialties */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {coach.specialty.slice(0, 3).map(s => (
            <span key={s} className="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
              {s}
            </span>
          ))}
        </div>

        {/* Products summary */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <BookOpen size={11} />
              {coach.products.filter(p => p.type === "course").length} course{coach.products.filter(p => p.type === "course").length !== 1 ? "s" : ""}
            </span>
            {coach.products.some(p => p.type === "1on1") && (
              <span className="flex items-center gap-1"><Calendar size={11} />1-on-1s</span>
            )}
            {coach.products.some(p => p.type === "community") && (
              <span className="flex items-center gap-1"><Users size={11} />Community</span>
            )}
          </div>
          <button className="text-xs font-semibold flex items-center gap-1 group-hover:text-[#4DC820] transition-colors text-muted-foreground">
            View Profile <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function CoachProfileModal({ coach, onClose }: { coach: Coach; onClose: () => void }) {
  const [tab, setTab] = useState<"products" | "about">("products");

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
         style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div className="bg-background rounded-t-2xl sm:rounded-2xl border border-border w-full sm:max-w-2xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                 style={{ background: coach.avatarColor }}>
              {coach.initials}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{coach.name}</p>
                {coach.verified && <CheckCircle size={13} style={{ color: "#4DC820" }} />}
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: "#F0FDE8", color: "#2E7A10", border: "1px solid #B6F08A" }}>
                  <Award size={9} className="inline mr-0.5" />Coach
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{coach.handle} · {coach.experience} experience</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Rating", value: `${coach.rating} ★`, color: "#F79009" },
              { label: "Students", value: coach.students.toString(), color: "#4DC820" },
              { label: "Reviews", value: coach.reviews.toString(), color: "#00AEEF" },
            ].map((s, i) => (
              <div key={i} className="text-center py-3 rounded-xl border border-border">
                <p className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: s.color }}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Specialties */}
          <div className="flex flex-wrap gap-2">
            {coach.tags.map(tag => (
              <span key={tag} className="text-xs px-3 py-1 rounded-full border border-border text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>

          {/* Top tickers */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Frequently covers</p>
            <div className="flex gap-2">
              {coach.topTickers.map(t => (
                <span key={t} className="ticker-mono text-xs px-3 py-1 rounded-lg border border-border text-muted-foreground">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-border">
            {(["products", "about"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                      className="text-sm font-medium pb-3 px-1 border-b-2 transition-colors capitalize"
                      style={{
                        borderColor: tab === t ? "#4DC820" : "transparent",
                        color: tab === t ? "#4DC820" : "#98A2B3",
                      }}>
                {t}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === "products" && (
            <div className="space-y-4">
              {coach.products.map(product => (
                <ProductCard key={product.id} product={product} coachName={coach.name} />
              ))}
            </div>
          )}

          {tab === "about" && (
            <div className="space-y-4">
              <p className="text-sm text-foreground leading-relaxed">{coach.longBio}</p>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Trading Style</p>
                <p className="text-sm font-semibold text-foreground">{coach.style}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CoachesCornerPage() {
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [search, setSearch] = useState("");
  const [styleFilter, setStyleFilter] = useState("all");

  const filtered = COACHES.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                        c.specialty.some(s => s.toLowerCase().includes(search.toLowerCase())) ||
                        c.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchStyle = styleFilter === "all" || c.style === styleFilter;
    return matchSearch && matchStyle;
  });

  const featured = COACHES.find(c => c.featured);

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="page-enter">
        {/* Hero */}
        <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #2B3245 0%, #1a2035 100%)" }}>
          <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #4DC820 0%, #C8D400 50%, #4DC820 100%)" }} />
          <div className="container mx-auto py-10">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                     style={{ background: "linear-gradient(135deg, #4DC820, #C8D400)" }}>
                  <Award size={14} className="text-white" />
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-full"
                      style={{ background: "rgba(77,200,32,0.15)", color: "#4DC820", border: "1px solid rgba(77,200,32,0.3)" }}>
                  Coaches Corner
                </span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-display)" }}>
                Learn from verified{" "}
                <span className="cc-gradient-text">expert traders</span>
              </h1>
              <p className="text-sm leading-relaxed mb-6" style={{ color: "#98A2B3" }}>
                Every CheatCode Coach is vetted, verified, and holds a real track record. Browse courses, book 1-on-1 sessions, and join elite trading communities.
              </p>
              <div className="flex gap-3">
                <Link href="/coach/apply">
                  <button className="flex items-center gap-2 text-[#101828] text-sm font-bold px-5 py-2.5 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity">
                    <Award size={14} /> Become a Coach
                  </button>
                </Link>
                <button className="flex items-center gap-2 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-white/10 transition-colors"
                        style={{ border: "1px solid rgba(255,255,255,0.2)" }}>
                  <Play size={13} fill="white" /> Watch Intro
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto py-8 space-y-10">

          {/* Featured coach */}
          {featured && (
            <section>
              <div className="flex items-center gap-2 mb-5">
                <Star size={14} style={{ color: "#F79009" }} fill="#F79009" />
                <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Featured Coach</h2>
              </div>
              <div className="bg-card rounded-2xl border border-border overflow-hidden cursor-pointer hover:border-[#4DC820] transition-all"
                   onClick={() => setSelectedCoach(featured)}>
                <div className="h-1 w-full" style={{ background: featured.avatarColor }} />
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white"
                           style={{ background: featured.avatarColor }}>
                        {featured.initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{featured.name}</h3>
                          <CheckCircle size={16} style={{ color: "#4DC820" }} />
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ background: "#F0FDE8", color: "#2E7A10", border: "1px solid #B6F08A" }}>
                            <Award size={9} className="inline mr-0.5" />Coach
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{featured.handle}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className="flex items-center gap-1">
                            <Star size={11} fill="#F79009" style={{ color: "#F79009" }} />
                            {featured.rating} ({featured.reviews} reviews)
                          </span>
                          <span className="text-muted-foreground">{featured.students} students</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{featured.longBio}</p>
                    <div className="flex flex-wrap gap-2">
                      {featured.tags.map(tag => (
                        <span key={tag} className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Products</p>
                    {featured.products.map(product => (
                      <div key={product.id} className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-[#4DC820] transition-colors">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{product.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <Star size={10} fill="#F79009" style={{ color: "#F79009" }} />
                            {product.rating} · {product.reviews} reviews
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">${product.price}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{product.type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* All coaches */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                All Coaches
              </h2>
              <span className="text-sm text-muted-foreground">{filtered.length} coaches</span>
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-5 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search coaches, specialties..."
                  className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-xl outline-none focus:border-[#4DC820] transition-colors"
                />
              </div>
              <div className="flex gap-2">
                {["all", "Day Trading", "Swing Trading", "Position Trading"].map(s => (
                  <button key={s}
                          onClick={() => setStyleFilter(s)}
                          className="text-xs px-3 py-2 rounded-xl border capitalize transition-colors"
                          style={{
                            borderColor: styleFilter === s ? "#4DC820" : "#EAECF0",
                            color: styleFilter === s ? "#4DC820" : "#475467",
                            background: styleFilter === s ? "#F0FDE8" : "transparent",
                          }}>
                    {s === "all" ? "All Styles" : s}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
              {filtered.map(coach => (
                <CoachCard key={coach.id} coach={coach} onSelect={setSelectedCoach} />
              ))}
            </div>
          </section>

          {/* Become a coach CTA */}
          <section className="rounded-2xl p-8 text-white overflow-hidden relative"
                   style={{ background: "linear-gradient(135deg, #2B3245 0%, #1a2035 100%)" }}>
            <div className="absolute top-0 left-0 right-0 h-0.5"
                 style={{ background: "linear-gradient(90deg, #4DC820 0%, #C8D400 50%, #4DC820 100%)" }} />
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Award size={18} style={{ color: "#4DC820" }} />
                  <span className="text-sm font-bold cc-gradient-text">Become a Coach</span>
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  Share your edge. Keep <span className="cc-gradient-text">80%</span> of revenue.
                </h3>
                <p className="text-sm leading-relaxed max-w-md" style={{ color: "#98A2B3" }}>
                  Host courses, 1-on-1 sessions, communities, and trade alerts directly on CheatCode OS. We handle payments, hosting, and distribution.
                </p>
              </div>
              <div className="flex-shrink-0 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: <DollarSign size={14} />, label: "80% Revenue", desc: "You keep" },
                    { icon: <Shield size={14} />, label: "Verified Badge", desc: "On your profile" },
                    { icon: <Users size={14} />, label: "Built-in Audience", desc: "4,800+ members" },
                    { icon: <BarChart2 size={14} />, label: "Coach Dashboard", desc: "Track everything" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs" style={{ color: "#98A2B3" }}>
                      <span style={{ color: "#4DC820" }}>{item.icon}</span>
                      <div>
                        <p className="font-semibold text-white">{item.label}</p>
                        <p>{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/coach/apply">
                  <button className="w-full flex items-center justify-center gap-2 text-[#101828] text-sm font-bold px-6 py-3 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity">
                    <Award size={14} /> Apply Now
                  </button>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Coach profile modal */}
      {selectedCoach && (
        <CoachProfileModal coach={selectedCoach} onClose={() => setSelectedCoach(null)} />
      )}

      <KaiChat />
    </div>
  );
}
