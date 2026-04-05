// CheatCode OS — Learn Page
// Design: Education funnel. Free paths from curated videos, paid advanced courses.
// Hero image from learn-hero.png. Card grid with skill level badges.

import { Link } from "wouter";
import { Lock, Play, CheckCircle, ChevronRight, Zap, BookOpen, Clock, BarChart2 } from "lucide-react";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { learningPaths } from "@/lib/mockData";

const LEARN_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663185570724/QgiApnmXYRXSMA2KNkFFkL/learn-hero-mfUmm5nf8TSU9SwnnR5ZY7.webp";

const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Beginner: { bg: "#ECFDF3", text: "#027A48", border: "#A9EFC5" },
  Intermediate: { bg: "#EFF8FF", text: "#1570EF", border: "#B2DDFF" },
  Advanced: { bg: "#FFFAEB", text: "#B54708", border: "#FEDF89" },
};

function PathCard({ path }: { path: typeof learningPaths[0] }) {
  const colors = LEVEL_COLORS[path.level];
  return (
    <div className="content-card bg-white rounded-2xl border border-[#EAECF0] overflow-hidden cursor-pointer">
      {/* Top accent bar */}
      <div className="h-1" style={{ backgroundColor: colors.text }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text}`}
                  style={{ borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }}>
              {path.level}
            </span>
            {!path.free && (
              <span className="ml-2 text-xs font-semibold text-[#B54708] bg-[#FFFAEB] px-2 py-0.5 rounded-full border border-[#FEDF89]">
                Pro
              </span>
            )}
          </div>
          {!path.free && <Lock size={14} className="text-[#98A2B3] flex-shrink-0 mt-0.5" />}
        </div>

        <h3 className="font-bold text-[#101828] text-base mb-2 leading-snug"
            style={{ fontFamily: "var(--font-display)" }}>
          {path.title}
        </h3>
        <p className="text-sm text-[#667085] leading-relaxed mb-4">{path.description}</p>

        <div className="flex items-center gap-4 text-xs text-[#98A2B3] mb-4">
          <span className="flex items-center gap-1"><BookOpen size={11} />{path.lessonCount} lessons</span>
          <span className="flex items-center gap-1"><Clock size={11} />{path.duration}</span>
        </div>

        <div className="space-y-1.5 mb-4">
          {path.topics.map((topic, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-[#475467]">
              <CheckCircle size={12} className="text-[#EAECF0] flex-shrink-0" />
              {topic}
            </div>
          ))}
        </div>

        {path.free ? (
          <button className="w-full flex items-center justify-center gap-2 bg-[#101828] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#1D2939] transition-colors">
            <Play size={13} fill="white" />
            Start Learning
          </button>
        ) : (
          <Link href="/pricing">
            <button className="w-full flex items-center justify-center gap-2 bg-[#12B76A] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#0EA05E] transition-colors">
              <Zap size={13} fill="white" />
              Unlock with Pro
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}

export default function LearnPage() {
  const freePaths = learningPaths.filter(p => p.free);
  const paidPaths = learningPaths.filter(p => !p.free);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Nav />

      <main className="page-enter">
        {/* Hero */}
        <div className="relative bg-white border-b border-[#EAECF0] overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 hidden lg:block">
            <img src={LEARN_HERO} alt="" className="w-full h-full object-cover object-left" />
          </div>
          <div className="container mx-auto py-10 relative">
            <div className="max-w-xl">
              <p className="section-label mb-2">Learn</p>
              <h1 className="text-3xl font-bold text-[#101828] mb-3" style={{ fontFamily: "var(--font-display)" }}>
                From beginner to institutional-grade trader
              </h1>
              <p className="text-[#667085] text-sm leading-relaxed mb-5">
                Structured learning paths built from the best curated videos on the platform. Every lesson is tied to live market examples from Kai's brain.
              </p>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 bg-[#101828] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#1D2939] transition-colors">
                  <Play size={13} fill="white" />
                  Start Free Path
                </button>
                <Link href="/pricing">
                  <button className="flex items-center gap-2 bg-white text-[#475467] text-sm font-semibold px-5 py-2.5 rounded-xl border border-[#EAECF0] hover:bg-[#F9FAFB] transition-colors">
                    <Zap size={13} className="text-[#12B76A]" />
                    View Pro Courses
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto py-8 space-y-10">
          {/* Free paths */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-[#101828]" style={{ fontFamily: "var(--font-display)" }}>
                  Free Learning Paths
                </h2>
                <p className="text-sm text-[#667085] mt-0.5">Available to all users. No account required.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {freePaths.map(p => <PathCard key={p.id} path={p} />)}
            </div>
          </section>

          {/* Pro paths */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-[#101828]" style={{ fontFamily: "var(--font-display)" }}>
                  Pro & Elite Courses
                </h2>
                <p className="text-sm text-[#667085] mt-0.5">Advanced content from FTA, Teen Trading Academy, and expert workshops.</p>
              </div>
              <span className="text-xs font-semibold text-[#B54708] bg-[#FFFAEB] px-3 py-1 rounded-full border border-[#FEDF89]">
                Pro Required
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {paidPaths.map(p => <PathCard key={p.id} path={p} />)}
            </div>
          </section>

          {/* Pro upsell banner */}
          <section className="bg-gradient-to-r from-[#101828] to-[#1D2939] rounded-2xl p-8 text-white">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div>
                <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  Unlock everything with Pro
                </h3>
                <p className="text-[#98A2B3] text-sm leading-relaxed max-w-md">
                  Advanced courses, unlimited Kai chat, full intelligence breakdowns, real-time convergence alerts, and ad-free experience.
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="text-center mb-3">
                  <span className="text-3xl font-bold">$29</span>
                  <span className="text-[#98A2B3] text-sm">/mo</span>
                </div>
                <Link href="/pricing">
                  <button className="flex items-center gap-2 bg-[#12B76A] text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-[#0EA05E] transition-colors">
                    <Zap size={14} fill="white" />
                    Start Pro Free Trial
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
