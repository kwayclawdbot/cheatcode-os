// CheatCode OS — Learn Page v2
// Brand: CC Green for free paths, CC Yellow for Pro, CC Dark gradient for upsell banner

import { Link } from "wouter";
import { Lock, Play, CheckCircle, Zap, BookOpen, Clock } from "lucide-react";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { learningPaths } from "@/lib/mockData";

const LEARN_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663185570724/QgiApnmXYRXSMA2KNkFFkL/learn-hero-mfUmm5nf8TSU9SwnnR5ZY7.webp";

const LEVEL_STYLES: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  Beginner:     { bg: "#F0FDE8", text: "#2E7A10", border: "#B6F08A", accent: "#4DC820" },
  Intermediate: { bg: "#E8F8FF", text: "#005F8A", border: "#7FDBF8", accent: "#00AEEF" },
  Advanced:     { bg: "#F5EEFF", text: "#5B1FA0", border: "#C4A0F0", accent: "#7B2FBE" },
};

function PathCard({ path }: { path: typeof learningPaths[0] }) {
  const s = LEVEL_STYLES[path.level];
  return (
    <div className="content-card bg-card rounded-2xl border border-border overflow-hidden">
      <div className="h-1 w-full" style={{ background: s.accent }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full border"
                  style={{ background: s.bg, color: s.text, borderColor: s.border }}>
              {path.level}
            </span>
            {!path.free && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full border"
                    style={{ background: "#FAFDE8", color: "#7A6800", borderColor: "#E8F08A" }}>
                Pro
              </span>
            )}
          </div>
          {!path.free && <Lock size={14} className="text-[#98A2B3] flex-shrink-0 mt-0.5" />}
        </div>

        <h3 className="font-bold text-foreground text-base mb-2 leading-snug" style={{ fontFamily: "var(--font-display)" }}>
          {path.title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">{path.description}</p>

        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          <span className="flex items-center gap-1"><BookOpen size={11} />{path.lessonCount} lessons</span>
          <span className="flex items-center gap-1"><Clock size={11} />{path.duration}</span>
        </div>

        <div className="space-y-1.5 mb-4">
          {path.topics.map((topic, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle size={12} className="flex-shrink-0" style={{ color: s.accent }} />
              {topic}
            </div>
          ))}
        </div>

        {path.free ? (
          <button className="w-full flex items-center justify-center gap-2 text-white text-sm font-bold py-2.5 rounded-xl hover:opacity-90 transition-opacity"
                  style={{ background: "linear-gradient(135deg, #2B3245 0%, #1a2035 100%)" }}>
            <Play size={13} fill="white" />
            Start Learning
          </button>
        ) : (
          <Link href="/pricing">
            <button className="w-full flex items-center justify-center gap-2 text-[#101828] text-sm font-bold py-2.5 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity">
              <Zap size={13} />
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
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="page-enter">
        {/* Hero — dark gradient */}
        <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #2B3245 0%, #1a2035 100%)" }}>
          <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #E8193C 0%, #00AEEF 33%, #7B2FBE 66%, #4DC820 100%)" }} />
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 hidden lg:block">
            <img src={LEARN_HERO} alt="" className="w-full h-full object-cover object-left" />
          </div>
          <div className="container mx-auto py-10 relative">
            <div className="max-w-xl">
              <p className="section-label mb-2" style={{ color: "#98A2B3" }}>Learn</p>
              <h1 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-display)" }}>
                From beginner to{" "}
                <span className="cc-gradient-text">institutional-grade</span> trader
              </h1>
              <p className="text-sm leading-relaxed mb-5" style={{ color: "#98A2B3" }}>
                Structured learning paths built from the best curated videos on the platform. Every lesson is tied to live market examples from Kai's brain.
              </p>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
                        style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}>
                  <Play size={13} fill="white" />
                  Start Free Path
                </button>
                <Link href="/pricing">
                  <button className="flex items-center gap-2 text-[#101828] text-sm font-bold px-5 py-2.5 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity">
                    <Zap size={13} />
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
                <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                  Free Learning Paths
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">Available to all users. No account required.</p>
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
                <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                  Pro & Elite Courses
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">Advanced content from FTA, Teen Trading Academy, and expert workshops.</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full border"
                    style={{ background: "#FAFDE8", color: "#7A6800", borderColor: "#E8F08A" }}>
                Pro Required
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {paidPaths.map(p => <PathCard key={p.id} path={p} />)}
            </div>
          </section>

          {/* Pro upsell banner */}
          <section className="rounded-2xl p-8 text-white overflow-hidden relative"
                   style={{ background: "linear-gradient(135deg, #2B3245 0%, #1a2035 100%)" }}>
            <div className="absolute top-0 left-0 right-0 h-0.5"
                 style={{ background: "linear-gradient(90deg, #E8193C 0%, #00AEEF 33%, #7B2FBE 66%, #4DC820 100%)" }} />
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div>
                <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  Unlock everything with{" "}
                  <span className="cc-gradient-text">Pro</span>
                </h3>
                <p className="text-sm leading-relaxed max-w-md" style={{ color: "#98A2B3" }}>
                  Advanced courses, unlimited Kai chat, full intelligence breakdowns, real-time convergence alerts, and ad-free experience.
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="text-center mb-3">
                  <span className="text-3xl font-bold">$29</span>
                  <span className="text-sm" style={{ color: "#98A2B3" }}>/mo</span>
                </div>
                <Link href="/pricing">
                  <button className="flex items-center gap-2 text-[#101828] text-sm font-bold px-6 py-3 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity">
                    <Zap size={14} />
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
