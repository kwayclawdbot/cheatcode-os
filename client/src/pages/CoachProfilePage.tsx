// CheatCode OS — Coach Profile Page
// Route: /coaches-corner/:id
// Design: Full-page editorial layout. Light bg, bold type, dark hero header.
// Each product card opens a ProductSalesModal (mini sales page, not a full navigation)
// Robinhood-meets-Spotify aesthetic: clean, data-rich, premium.

import { useState } from "react";
import { Link, useParams } from "wouter";
import {
  ArrowLeft, Star, Users, BookOpen, Clock, CheckCircle, Award,
  Twitter, Youtube, ChevronRight, X, Play, Zap, DollarSign,
  Shield, Calendar, BarChart2, ChevronDown, ChevronUp, Lock
} from "lucide-react";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { getCoachById, PRODUCT_TYPE_CONFIG, type Coach, type CoachProduct } from "@/lib/coachesData";

// ─── Product Sales Modal ───────────────────────────────────────────────────────

function ProductSalesModal({ product, coach, onClose }: { product: CoachProduct; coach: Coach; onClose: () => void }) {
  const [openSection, setOpenSection] = useState<number | null>(0);
  const cfg = PRODUCT_TYPE_CONFIG[product.type];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Modal header */}
        <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
                 style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
              {cfg.icon}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: cfg.color }}>
                {cfg.label}
              </p>
              <p className="text-sm font-bold text-foreground leading-tight" style={{ fontFamily: "var(--font-display)" }}>
                {product.title}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Hero section */}
          <div className="rounded-2xl overflow-hidden border border-border"
               style={{ background: "linear-gradient(135deg, #2B3245 0%, #1a2035 100%)" }}>
            <div className="h-1 w-full" style={{ background: coach.avatarColor }} />
            <div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  {product.badge && (
                    <span className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-full mb-2"
                          style={{ background: "rgba(77,200,32,0.2)", color: "#4DC820", border: "1px solid rgba(77,200,32,0.3)" }}>
                      {product.badge}
                    </span>
                  )}
                  <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-display)" }}>
                    {product.title}
                  </h2>
                  <p className="text-sm" style={{ color: "#98A2B3" }}>{product.tagline}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {product.originalPrice && (
                    <p className="text-sm line-through" style={{ color: "#667085" }}>${product.originalPrice}</p>
                  )}
                  <p className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                    ${product.price}
                    {product.type === "community" || product.type === "alerts" ? (
                      <span className="text-sm font-normal" style={{ color: "#98A2B3" }}>/mo</span>
                    ) : null}
                  </p>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-4 text-xs" style={{ color: "#98A2B3" }}>
                <span className="flex items-center gap-1 text-white font-medium">
                  <Star size={12} fill="#F79009" style={{ color: "#F79009" }} />
                  {product.rating} ({product.reviews} reviews)
                </span>
                {product.students && (
                  <span className="flex items-center gap-1">
                    <Users size={11} /> {product.students} students
                  </span>
                )}
                {product.lessonCount && (
                  <span className="flex items-center gap-1">
                    <BookOpen size={11} /> {product.lessonCount} lessons
                  </span>
                )}
                {product.duration && (
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> {product.duration}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <BarChart2 size={11} /> {product.level}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>About this {cfg.label}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{product.longDescription}</p>
          </div>

          {/* What you'll learn */}
          <div>
            <h3 className="font-bold text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>What you'll learn</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {product.whatYouLearn.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                  <CheckCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: "#4DC820" }} />
                  <span className="leading-snug">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Curriculum (courses only) */}
          {product.curriculum && product.curriculum.length > 0 && (
            <div>
              <h3 className="font-bold text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>Course Curriculum</h3>
              <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                {product.curriculum.map((section, i) => (
                  <div key={i}>
                    <button
                      onClick={() => setOpenSection(openSection === i ? null : i)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors text-left"
                    >
                      <span className="text-sm font-semibold text-foreground">{section.section}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{section.lessons.length} lessons</span>
                        {openSection === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </button>
                    {openSection === i && (
                      <div className="bg-muted/40 px-4 py-2 space-y-1">
                        {section.lessons.map((lesson, j) => (
                          <div key={j} className="flex items-center gap-2.5 py-1.5 text-sm text-muted-foreground">
                            <Play size={11} className="flex-shrink-0" style={{ color: "#4DC820" }} />
                            {lesson}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What's included */}
          <div>
            <h3 className="font-bold text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>What's included</h3>
            <div className="flex flex-wrap gap-2">
              {product.includes.map((item, i) => (
                <span key={i} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border"
                      style={{ background: "#F9FAFB", borderColor: "#EAECF0", color: "#475467" }}>
                  <CheckCircle size={11} style={{ color: "#4DC820" }} />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Coach mini card */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/30">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold text-white flex-shrink-0"
                 style={{ background: coach.avatarColor }}>
              {coach.initials}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="font-bold text-foreground text-sm">{coach.name}</p>
                {coach.verified && <CheckCircle size={13} style={{ color: "#4DC820" }} />}
              </div>
              <p className="text-xs text-muted-foreground">{coach.tagline}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-foreground">{coach.rating}★</p>
              <p className="text-[11px] text-muted-foreground">{coach.students} students</p>
            </div>
          </div>
        </div>

        {/* Sticky enroll footer */}
        <div className="sticky bottom-0 bg-background border-t border-border px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                ${product.price}
                {(product.type === "community" || product.type === "alerts") && (
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                )}
              </p>
              {product.originalPrice && (
                <p className="text-xs text-muted-foreground line-through">${product.originalPrice}</p>
              )}
            </div>
            <div className="flex gap-2 flex-1 max-w-xs">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[#101828] text-sm font-bold cc-gradient-bg hover:opacity-90 transition-opacity">
                <Zap size={13} />
                {product.type === "1on1" ? "Book Session" : product.type === "community" || product.type === "alerts" ? "Subscribe" : "Enroll Now"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ product, coach, onOpen }: { product: CoachProduct; coach: Coach; onOpen: (p: CoachProduct) => void }) {
  const cfg = PRODUCT_TYPE_CONFIG[product.type];

  return (
    <div
      className="group bg-card rounded-2xl border border-border overflow-hidden cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-[#4DC820]/40"
      onClick={() => onOpen(product)}
    >
      <div className="h-1 w-full" style={{ background: coach.avatarColor }} />
      <div className="p-5">
        {/* Type + badge row */}
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border"
                style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
            {cfg.icon} {cfg.label}
          </span>
          {product.badge && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "#F0FDE8", color: "#2E7A10", border: "1px solid #B6F08A" }}>
              {product.badge}
            </span>
          )}
        </div>

        {/* Title + tagline */}
        <h3 className="font-bold text-foreground text-base mb-1 leading-snug group-hover:text-[#4DC820] transition-colors"
            style={{ fontFamily: "var(--font-display)" }}>
          {product.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{product.description}</p>

        {/* Meta row */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
          <span className="flex items-center gap-1 font-medium text-foreground">
            <Star size={11} fill="#F79009" style={{ color: "#F79009" }} />
            {product.rating}
            <span className="font-normal text-muted-foreground">({product.reviews})</span>
          </span>
          {product.students && <span className="flex items-center gap-1"><Users size={10} />{product.students} students</span>}
          {product.lessonCount && <span className="flex items-center gap-1"><BookOpen size={10} />{product.lessonCount} lessons</span>}
          {product.duration && <span className="flex items-center gap-1"><Clock size={10} />{product.duration}</span>}
        </div>

        {/* Level badge */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <span className="text-xs font-medium text-muted-foreground">{product.level}</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              ${product.price}
              {(product.type === "community" || product.type === "alerts") && (
                <span className="text-xs font-normal text-muted-foreground">/mo</span>
              )}
            </span>
            <ChevronRight size={14} className="text-muted-foreground group-hover:text-[#4DC820] transition-colors" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Review Card ──────────────────────────────────────────────────────────────

function ReviewCard({ review }: { review: Coach["reviews_list"][0] }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
               style={{ background: "linear-gradient(135deg, #2B3245, #475467)" }}>
            {review.initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{review.author}</p>
            <p className="text-xs text-muted-foreground">{review.product}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-0.5 justify-end mb-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={11} fill={i < review.rating ? "#F79009" : "none"} style={{ color: "#F79009" }} />
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">{review.date}</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{review.text}</p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CoachProfilePage() {
  const params = useParams<{ id: string }>();
  const coach = getCoachById(params.id);
  const [selectedProduct, setSelectedProduct] = useState<CoachProduct | null>(null);
  const [activeTab, setActiveTab] = useState<"products" | "about" | "reviews">("about");

  if (!coach) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <div className="container mx-auto py-20 text-center">
          <Award size={48} className="mx-auto mb-4 text-muted-foreground opacity-30" />
          <h2 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Coach not found
          </h2>
          <p className="text-muted-foreground mb-6">This coach profile doesn't exist or has been removed.</p>
          <Link href="/coaches-corner">
            <button className="flex items-center gap-2 mx-auto text-sm font-medium px-5 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors">
              <ArrowLeft size={14} /> Back to Coaches Corner
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const totalRevenue = coach.products.reduce((s, p) => s + (p.students || 0) * p.price, 0);

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* Product Sales Modal */}
      {selectedProduct && (
        <ProductSalesModal
          product={selectedProduct}
          coach={coach}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      <main className="page-enter">
        {/* ── Hero Header ── */}
        <div style={{ background: "linear-gradient(135deg, #2B3245 0%, #1a2035 100%)" }}>
          <div className="h-1 w-full" style={{ background: coach.avatarColor }} />
          <div className="container mx-auto py-8">
            {/* Breadcrumb */}
            <Link href="/coaches-corner">
              <button className="flex items-center gap-1.5 text-sm mb-6 transition-colors"
                      style={{ color: "#98A2B3" }}>
                <ArrowLeft size={14} /> Coaches Corner
              </button>
            </Link>

            <div className="flex flex-col md:flex-row items-start gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold text-white flex-shrink-0 shadow-xl"
                   style={{ background: coach.avatarColor }}>
                {coach.initials}
              </div>

              {/* Name + meta */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                    {coach.name}
                  </h1>
                  {coach.verified && (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                         style={{ background: "rgba(77,200,32,0.15)", border: "1px solid rgba(77,200,32,0.3)" }}>
                      <CheckCircle size={12} style={{ color: "#4DC820" }} />
                      <span className="text-xs font-semibold" style={{ color: "#4DC820" }}>Verified Coach</span>
                    </div>
                  )}
                  {coach.featured && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{ background: "rgba(247,144,9,0.15)", color: "#F79009", border: "1px solid rgba(247,144,9,0.3)" }}>
                      ⭐ Featured
                    </span>
                  )}
                </div>
                <p className="text-base mb-3" style={{ color: "#D0D5DD" }}>{coach.tagline}</p>

                {/* Stats row */}
                <div className="flex flex-wrap gap-5 text-sm mb-4">
                  {[
                    { icon: <Star size={13} fill="#F79009" style={{ color: "#F79009" }} />, value: `${coach.rating}`, sub: `(${coach.reviews} reviews)` },
                    { icon: <Users size={13} style={{ color: "#98A2B3" }} />, value: `${coach.students}`, sub: "students" },
                    { icon: <BookOpen size={13} style={{ color: "#98A2B3" }} />, value: `${coach.products.length}`, sub: "products" },
                    { icon: <Award size={13} style={{ color: "#98A2B3" }} />, value: coach.experience, sub: "experience" },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      {s.icon}
                      <span className="font-bold text-white">{s.value}</span>
                      <span style={{ color: "#98A2B3" }}>{s.sub}</span>
                    </div>
                  ))}
                </div>

                {/* Specialty tags */}
                <div className="flex flex-wrap gap-2">
                  {coach.specialty.map(s => (
                    <span key={s} className="text-xs px-3 py-1 rounded-full"
                          style={{ background: "rgba(255,255,255,0.08)", color: "#D0D5DD", border: "1px solid rgba(255,255,255,0.12)" }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Social links */}
              <div className="flex gap-2 flex-shrink-0">
                {coach.youtubeUrl && (
                  <a href={coach.youtubeUrl} target="_blank" rel="noopener noreferrer"
                     className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
                     style={{ background: "rgba(255,255,255,0.08)", color: "#98A2B3" }}>
                    <Youtube size={16} />
                  </a>
                )}
                {coach.twitterUrl && (
                  <a href={coach.twitterUrl} target="_blank" rel="noopener noreferrer"
                     className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
                     style={{ background: "rgba(255,255,255,0.08)", color: "#98A2B3" }}>
                    <Twitter size={16} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="border-b border-border bg-background sticky top-14 z-30">
          <div className="container mx-auto">
            <div className="flex gap-0">
              {(["products", "about", "reviews"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-5 py-3.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px"
                  style={{
                    borderColor: activeTab === tab ? "#4DC820" : "transparent",
                    color: activeTab === tab ? "#4DC820" : "#667085",
                  }}
                >
                  {tab === "products" ? `Products (${coach.products.length})` :
                   tab === "reviews" ? `Reviews (${coach.reviews_list.length})` : "About"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="container mx-auto py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ── Main content ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Products tab */}
              {activeTab === "products" && (
                <>
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>
                      Products & Services
                    </h2>
                    <p className="text-sm text-muted-foreground">Click any product to see the full details and enroll.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {coach.products.map(p => (
                      <ProductCard key={p.id} product={p} coach={coach} onOpen={setSelectedProduct} />
                    ))}
                  </div>
                </>
              )}

              {/* About tab */}
              {activeTab === "about" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
                      About {coach.name}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">{coach.longBio}</p>
                  </div>

                  <div>
                    <h3 className="font-bold text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
                      Achievements
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {coach.achievements.map((a, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                          <CheckCircle size={16} style={{ color: "#4DC820" }} className="flex-shrink-0" />
                          <span className="text-sm font-medium text-foreground">{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
                      Top Tickers Traded
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {coach.topTickers.map(t => (
                        <span key={t} className="text-sm font-bold px-4 py-2 rounded-xl border border-border bg-card text-foreground">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
                      Expertise Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {coach.tags.map(t => (
                        <span key={t} className="text-xs font-medium px-3 py-1.5 rounded-full border"
                              style={{ background: "#F9FAFB", borderColor: "#EAECF0", color: "#475467" }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Reviews tab */}
              {activeTab === "reviews" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-5 rounded-2xl border border-border bg-card">
                    <div className="text-center">
                      <p className="text-5xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                        {coach.rating}
                      </p>
                      <div className="flex items-center gap-0.5 justify-center my-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={14} fill={i < Math.round(coach.rating) ? "#F79009" : "none"} style={{ color: "#F79009" }} />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">{coach.reviews} total reviews</p>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {[5, 4, 3, 2, 1].map(n => {
                        const count = coach.reviews_list.filter(r => r.rating === n).length;
                        const pct = coach.reviews_list.length > 0 ? (count / coach.reviews_list.length) * 100 : (n === 5 ? 80 : n === 4 ? 15 : 5);
                        return (
                          <div key={n} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-4">{n}</span>
                            <Star size={10} fill="#F79009" style={{ color: "#F79009" }} />
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#F79009" }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-6">{Math.round(pct)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {coach.reviews_list.map(r => <ReviewCard key={r.id} review={r} />)}
                </div>
              )}
            </div>

            {/* ── Sidebar ── */}
            <div className="space-y-5">
              {/* Quick enroll card */}
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="h-1 w-full" style={{ background: coach.avatarColor }} />
                <div className="p-5">
                  <h3 className="font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>
                    Start learning today
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    {coach.products.length} products available from ${Math.min(...coach.products.map(p => p.price))}
                  </p>
                  <div className="space-y-2">
                    {coach.products.map(p => {
                      const cfg = PRODUCT_TYPE_CONFIG[p.type];
                      return (
                        <button
                          key={p.id}
                          onClick={() => { setSelectedProduct(p); setActiveTab("products"); }}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-border hover:border-[#4DC820]/40 hover:bg-muted/50 transition-all text-left"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">{cfg.icon}</span>
                            <div>
                              <p className="text-xs font-semibold text-foreground line-clamp-1">{p.title}</p>
                              <p className="text-[11px] text-muted-foreground">{cfg.label}</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-foreground flex-shrink-0">${p.price}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Coach stats */}
              <div className="bg-card rounded-2xl border border-border p-5">
                <h3 className="font-bold text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
                  Coach Stats
                </h3>
                <div className="space-y-3">
                  {[
                    { icon: <Star size={14} fill="#F79009" style={{ color: "#F79009" }} />, label: "Rating", value: `${coach.rating} / 5.0` },
                    { icon: <Users size={14} style={{ color: "#4DC820" }} />, label: "Total Students", value: coach.students.toLocaleString() },
                    { icon: <BookOpen size={14} style={{ color: "#00AEEF" }} />, label: "Products", value: coach.products.length.toString() },
                    { icon: <Award size={14} style={{ color: "#7B2FBE" }} />, label: "Experience", value: coach.experience },
                    { icon: <Shield size={14} style={{ color: "#4DC820" }} />, label: "Status", value: "Verified Coach" },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        {s.icon} {s.label}
                      </span>
                      <span className="font-semibold text-foreground">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Become a coach */}
              <div className="rounded-2xl border border-border overflow-hidden">
                <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #4DC820, #C8D400)" }} />
                <div className="p-5">
                  <p className="text-sm font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>
                    Want to teach on CheatCode?
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Keep 80% of revenue. Build your audience. Apply in 5 minutes.
                  </p>
                  <Link href="/coach/apply">
                    <button className="w-full flex items-center justify-center gap-2 text-[#101828] text-xs font-bold py-2.5 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity">
                      <Award size={12} /> Apply to Coach
                    </button>
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
