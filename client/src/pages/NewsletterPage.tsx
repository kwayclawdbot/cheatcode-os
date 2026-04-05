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
    <div className="min-h-screen bg-[#F9FAFB]">
      <Nav />

      <main className="page-enter">
        {/* Header */}
        <div className="bg-white border-b border-[#EAECF0]">
          <div className="container mx-auto py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="section-label mb-1">Daily Brief</p>
                <h1 className="text-2xl font-bold text-[#101828] mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  The CheatCode Daily
                </h1>
                <p className="text-sm text-[#667085] max-w-md">
                  Every morning: market regime, top 3 curated videos, theme changes, and Kai's intelligence tool CTA. Auto-generated. Always relevant.
                </p>
              </div>

              {/* Subscribe form */}
              {!subscribed ? (
                <div className="flex-shrink-0">
                  <p className="text-xs font-semibold text-[#475467] mb-2">Get it in your inbox</p>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="pl-9 pr-4 py-2.5 text-sm bg-[#F9FAFB] border border-[#EAECF0] rounded-xl outline-none focus:border-[#12B76A] focus:ring-2 focus:ring-[#12B76A]/20 transition-all w-56"
                      />
                    </div>
                    <button
                      onClick={() => setSubscribed(true)}
                      className="bg-[#12B76A] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#0EA05E] transition-colors flex items-center gap-2"
                    >
                      Subscribe
                      <ArrowRight size={13} />
                    </button>
                  </div>
                  <p className="text-[10px] text-[#98A2B3] mt-1.5">Free. Unsubscribe anytime.</p>
                </div>
              ) : (
                <div className="flex-shrink-0 bg-[#ECFDF3] border border-[#A9EFC5] rounded-xl px-5 py-3 text-center">
                  <p className="text-sm font-semibold text-[#027A48]">You're subscribed!</p>
                  <p className="text-xs text-[#12B76A] mt-0.5">First brief arrives tomorrow morning.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Archive list */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-bold text-[#101828]" style={{ fontFamily: "var(--font-display)" }}>
                Archive
              </h2>
              {newsletterArchive.map(issue => (
                <div key={issue.id} className="content-card bg-white rounded-2xl border border-[#EAECF0] p-5 cursor-pointer">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-[#98A2B3]">{issue.date}</span>
                        <SentimentBadge sentiment={issue.sentiment} />
                      </div>
                      <h3 className="font-bold text-[#101828] text-base leading-snug"
                          style={{ fontFamily: "var(--font-display)" }}>
                        {issue.subject}
                      </h3>
                    </div>
                    <ChevronRight size={16} className="text-[#98A2B3] flex-shrink-0 mt-1" />
                  </div>

                  <p className="text-sm text-[#667085] leading-relaxed mb-4">{issue.previewText}</p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="section-label mb-1.5">Top Videos</p>
                      <ul className="space-y-1">
                        {issue.topVideos.map((v, i) => (
                          <li key={i} className="text-xs text-[#475467] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A] flex-shrink-0" />
                            {v}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="section-label mb-1.5">Theme Changes</p>
                      <ul className="space-y-1">
                        {issue.themeChanges.map((t, i) => (
                          <li key={i} className="text-xs text-[#475467] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F79009] flex-shrink-0" />
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
                <button className="text-sm text-[#667085] border border-[#EAECF0] px-5 py-2 rounded-xl hover:bg-[#F9FAFB] transition-colors">
                  Load more issues
                </button>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* What's in every brief */}
              <div className="bg-white rounded-xl border border-[#EAECF0] p-5">
                <h3 className="font-bold text-sm text-[#101828] mb-4" style={{ fontFamily: "var(--font-display)" }}>
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
                        <p className="text-sm font-semibold text-[#101828]">{item.label}</p>
                        <p className="text-xs text-[#667085]">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pro upgrade */}
              <div className="bg-[#101828] rounded-xl p-5 text-white">
                <h3 className="font-bold text-sm mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  Get real-time alerts
                </h3>
                <p className="text-xs text-[#98A2B3] mb-4 leading-relaxed">
                  Pro members get push alerts when a ticker hits 90+ convergence. Don't wait for the morning brief.
                </p>
                <Link href="/pricing">
                  <button className="w-full flex items-center justify-center gap-2 bg-[#12B76A] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#0EA05E] transition-colors">
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
