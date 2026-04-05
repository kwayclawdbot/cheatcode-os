// CheatCode OS — Newsletter Archive
// Design: Clean editorial list. SEO-friendly archive.
// Daily auto-generated email previews with market regime, top videos, theme changes.

import { Link } from "wouter";
import { Mail, TrendingUp, TrendingDown, Minus, ArrowRight, Zap, ChevronRight } from "lucide-react";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { newsletterArchive } from "@/lib/mockData";
import { useState } from "react";

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const styles: Record<string, string> = {
    Bullish: "sentiment-bullish",
    Bearish: "sentiment-bearish",
    Choppy: "sentiment-choppy",
  };
  const icons: Record<string, React.ReactNode> = {
    Bullish: <TrendingUp size={12} />,
    Bearish: <TrendingDown size={12} />,
    Choppy: <Minus size={12} />,
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${styles[sentiment] || styles.Choppy}`}>
      {icons[sentiment]}
      {sentiment}
    </span>
  );
}

export default function NewsletterPage() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="page-enter">
        {/* Header — dark gradient */}
        <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #2B3245 0%, #1a2035 100%)" }}>
          <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #E8193C 0%, #00AEEF 33%, #7B2FBE 66%, #4DC820 100%)" }} />
          <div className="container mx-auto py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="section-label mb-1" style={{ color: "#98A2B3" }}>Daily Brief</p>
                <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  The CheatCode Daily
                </h1>
                <p className="text-sm max-w-md" style={{ color: "#98A2B3" }}>
                  Every morning: market regime, top 3 curated videos, theme changes, and Kai's intelligence tool CTA. Auto-generated. Always relevant.
                </p>
              </div>

              {/* Subscribe form */}
              {!subscribed ? (
                <div className="flex-shrink-0">
                  <p className="text-xs font-semibold text-white/70 mb-2">Get it in your inbox</p>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="pl-9 pr-4 py-2.5 text-sm bg-white/10 border border-white/20 rounded-xl outline-none text-white placeholder-white/40 focus:border-[#4DC820] transition-all w-56"
                      />
                    </div>
                    <button
                      onClick={() => setSubscribed(true)}
                      className="text-[#101828] text-sm font-bold px-4 py-2.5 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                      Subscribe
                      <ArrowRight size={13} />
                    </button>
                  </div>
                  <p className="text-[10px] text-white/50 mt-1.5">Free. Unsubscribe anytime.</p>
                </div>
              ) : (
                <div className="flex-shrink-0 rounded-xl px-5 py-3 text-center" style={{ background: "#F0FDE8", border: "1px solid #B6F08A" }}>
                  <p className="text-sm font-semibold" style={{ color: "#2E7A10" }}>You're subscribed!</p>
                  <p className="text-xs mt-0.5" style={{ color: "#4DC820" }}>First brief arrives tomorrow morning.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Archive list */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                Archive
              </h2>
              {newsletterArchive.map(issue => (
                <div key={issue.id} className="content-card bg-card rounded-2xl border border-border p-5 cursor-pointer">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">{issue.date}</span>
                        <SentimentBadge sentiment={issue.sentiment} />
                      </div>
                      <h3 className="font-bold text-foreground text-base leading-snug"
                          style={{ fontFamily: "var(--font-display)" }}>
                        {issue.subject}
                      </h3>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground flex-shrink-0 mt-1" />
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{issue.previewText}</p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="section-label mb-1.5">Top Videos</p>
                      <ul className="space-y-1">
                        {issue.topVideos.map((v, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#4DC820" }} />
                            {v}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="section-label mb-1.5">Theme Changes</p>
                      <ul className="space-y-1">
                        {issue.themeChanges.map((t, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#C8D400" }} />
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}

              {/* Load more placeholder */}
              <div className="text-center py-4">
                <button className="text-sm text-muted-foreground border border-border px-5 py-2 rounded-xl hover:bg-muted transition-colors">
                  Load more issues
                </button>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* What's in every brief */}
              <div className="bg-card rounded-xl border border-border p-5">
                <h3 className="font-bold text-sm text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
                  What's in every brief
                </h3>
                <div className="space-y-3">
                  {[
                    { icon: "📊", label: "Market regime one-liner", desc: "Bullish / Bearish / Choppy + why" },
                    { icon: "🎬", label: "Top 3 curated videos", desc: "AI-summarized, most relevant today" },
                    { icon: "🔥", label: "Theme changes", desc: "Escalations, new themes, invalidations" },
                    { icon: "🎯", label: "Intelligence tool CTA", desc: "Today's highest-conviction ticker" },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-lg">{item.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pro upgrade */}
              <div className="rounded-xl p-5 text-white" style={{ background: "linear-gradient(135deg, #2B3245 0%, #1a2035 100%)" }}>
                <h3 className="font-bold text-sm mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  Get real-time alerts
                </h3>
                <p className="text-xs text-white/60 mb-4 leading-relaxed">
                  Pro members get push alerts when a ticker hits 90+ convergence. Don't wait for the morning brief.
                </p>
                <Link href="/pricing">
                  <button className="w-full flex items-center justify-center gap-2 text-[#101828] text-sm font-bold py-2.5 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity">
                    <Zap size={13} fill="white" />
                    Upgrade to Pro
                  </button>
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
