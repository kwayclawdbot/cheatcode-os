// CheatCode OS — Video Page
// Design: YouTube embed top, AI context layer below (the product)
// Sections: Quick Take, Key Insights, Tickers Mentioned, Related Videos, Timestamps
// Two-column: wide content left, narrow context panel right

import { Link, useParams } from "wouter";
import { ArrowLeft, ExternalLink, ChevronDown, ChevronUp, Lock, TrendingUp, TrendingDown, Play, Clock, Bookmark, Share2 } from "lucide-react";
import { useState } from "react";
import { ScoreRing } from "@/components/shared/ScoreRing";
import { VideoCard } from "@/components/shared/VideoCard";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { todaysPicks, tickerData } from "@/lib/mockData";

const SAMPLE_VIDEO = todaysPicks[1]; // Real Vision KKR video

const TIMESTAMPS = [
  { time: "0:00", label: "Introduction — Why private credit matters now" },
  { time: "4:22", label: "KKR's balance sheet exposure explained" },
  { time: "11:45", label: "Ares Capital vs. Blackstone — diverging signals" },
  { time: "19:30", label: "Congressional trade cross-reference" },
  { time: "26:15", label: "Key levels and trade setup" },
  { time: "31:00", label: "Invalidation scenarios" },
];

const KEY_INSIGHTS = [
  "Private credit stress is not priced into KKR's current valuation — the market is treating it as a macro story, not a balance-sheet story.",
  "Congressional trades in KKR by a Banking Committee member are the highest-signal insider indicator in this setup.",
  "Ares Capital (ARCC) is showing diverging signals from KKR — potential pair trade opportunity.",
  "The $105 level on KKR is critical support. A close below on volume confirms the bearish thesis.",
  "Theme escalation to Level 3 means Kai has seen 3+ weeks of compounding signals across all 6 data agents.",
  "Related tickers BX and APO are showing similar stress patterns — this is a sector-wide signal, not company-specific.",
];

function TickerMention({ ticker, creatorNote, isPaid }: { ticker: string; creatorNote: string; isPaid?: boolean }) {
  const data = tickerData[ticker];
  return (
    <Link href={`/intelligence?ticker=${ticker}`}>
      <div className="content-card flex items-start gap-3 p-3 bg-white rounded-xl border border-[#EAECF0] cursor-pointer">
        <div className="flex-shrink-0">
          {data ? (
            <ScoreRing score={data.score} size="sm" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-[#F2F4F7] flex items-center justify-center">
              <span className="ticker-mono text-xs text-[#667085]">{ticker}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="ticker-mono text-sm font-bold text-[#101828]">{ticker}</span>
            {data && (
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                data.direction === "Bullish" ? "text-[#2E7A10] bg-[#F0FDE8]" : "text-[#A8001F] bg-[#FFF0F3]"
              }`}>
                {data.direction}
              </span>
            )}
          </div>
          <p className="text-xs text-[#667085] leading-relaxed">{creatorNote}</p>
          {data && (
            <p className={`text-xs font-medium mt-1 ${isPaid ? "text-[#00AEEF]" : "gated-blur text-[#00AEEF]"}`}>
              {isPaid
                ? `Kai: ${data.direction} setup. ${data.timeframe}. Score ${data.score}.`
                : "Kai: Full breakdown available for Pro members."}
            </p>
          )}
        </div>
        {!isPaid && data && (
          <Lock size={12} className="text-[#98A2B3] flex-shrink-0 mt-1" />
        )}
      </div>
    </Link>
  );
}

function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[#EAECF0] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-[#F9FAFB] transition-colors"
      >
        <span className="font-semibold text-sm text-[#101828]" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </span>
        {open ? <ChevronUp size={16} className="text-[#667085]" /> : <ChevronDown size={16} className="text-[#667085]" />}
      </button>
      {open && (
        <div className="border-t border-[#EAECF0] bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

export default function VideoPage() {
  const video = SAMPLE_VIDEO;

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Nav />

      <main className="page-enter container mx-auto py-6">
        {/* Back nav */}
        <Link href="/">
          <button className="flex items-center gap-2 text-sm text-[#667085] hover:text-[#101828] transition-colors mb-4">
            <ArrowLeft size={14} />
            Back to Today's Picks
          </button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Video embed */}
            <div className="relative bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <button className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg">
                  <Play size={24} fill="#101828" className="text-[#101828] ml-1" />
                </button>
              </div>
            </div>

            {/* Title + meta */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-xl font-bold text-[#101828] leading-snug" style={{ fontFamily: "var(--font-display)" }}>
                  {video.title}
                </h1>
                <div className="flex gap-2 flex-shrink-0">
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#EAECF0] text-[#667085] hover:bg-[#F9FAFB] transition-colors">
                    <Bookmark size={14} />
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#EAECF0] text-[#667085] hover:bg-[#F9FAFB] transition-colors">
                    <Share2 size={14} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                       style={{ backgroundColor: video.creator.color }}>
                    {video.creator.avatar}
                  </div>
                  <span className="text-sm font-medium text-[#475467]">{video.creator.name}</span>
                </div>
                <span className="text-[#EAECF0]">·</span>
                <span className="text-sm text-[#98A2B3] flex items-center gap-1"><Clock size={12} />{video.publishedAt}</span>
                <span className="text-[#EAECF0]">·</span>
                <span className="text-sm text-[#98A2B3]">{video.duration}</span>
                <a href="#" className="ml-auto text-xs text-[#00AEEF] flex items-center gap-1 hover:underline">
                  Watch on YouTube <ExternalLink size={10} />
                </a>
              </div>
              <div className="flex gap-2 mt-2">
                {video.tags.map(t => (
                  <span key={t} className="text-xs text-[#667085] bg-[#F2F4F7] px-2.5 py-1 rounded-full border border-[#EAECF0]">
                    {t}
                  </span>
                ))}
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                  video.relevanceBadge === "Critical" ? "bg-[#FFF0F3] text-[#A8001F] border-[#F8A3B1]" :
                  video.relevanceBadge === "High Relevance" ? "bg-[#F0FDE8] text-[#2E7A10] border-[#B6F08A]" :
                  "bg-[#FAFDE8] text-[#7A6800] border-[#E8F08A]"
                }`}>
                  {video.relevanceBadge}
                </span>
              </div>
            </div>

            {/* Quick Take — always visible */}
            <div className="bg-gradient-to-r from-[#E8F8FF] to-[#F0FDE8] rounded-xl p-4 border border-[#7FDBF8]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#00AEEF" }}>
                  <span className="text-white text-[9px] font-bold">K</span>
                </div>
                <span className="text-xs font-semibold" style={{ color: "#005F8A" }}>Kai's Quick Take</span>
              </div>
              <p className="text-sm text-[#101828] leading-relaxed">{video.quickTake}</p>
            </div>

            {/* Key Insights */}
            <CollapsibleSection title="Key Insights" defaultOpen>
              <ul className="divide-y divide-[#F2F4F7]">
                {KEY_INSIGHTS.map((insight, i) => (
                  <li key={i} className="flex gap-3 px-4 py-3">
                    <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "#F0FDE8", color: "#2E7A10" }}>
                      {i + 1}
                    </span>
                    <p className="text-sm text-[#475467] leading-relaxed">{insight}</p>
                  </li>
                ))}
              </ul>
            </CollapsibleSection>

            {/* Tickers Mentioned */}
            <CollapsibleSection title="Tickers Mentioned" defaultOpen>
              <div className="p-4 space-y-3">
                <TickerMention ticker="KKR" creatorNote="Supply zone at $92 based on demand theory. Key level to watch for breakdown confirmation." />
                <TickerMention ticker="NVDA" creatorNote="Mentioned as counterexample — AI infrastructure demand offsetting credit stress concerns." isPaid />
                <div className="flex items-center gap-3 p-3 bg-[#F9FAFB] rounded-xl border border-[#EAECF0]">
                  <div className="w-11 h-11 rounded-full bg-[#F2F4F7] flex items-center justify-center flex-shrink-0">
                    <span className="ticker-mono text-xs text-[#667085]">ARCC</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="ticker-mono text-sm font-bold text-[#101828]">ARCC</span>
                      <Lock size={12} className="text-[#98A2B3]" />
                    </div>
                    <p className="text-xs text-[#667085]">Ares Capital — diverging from KKR. Potential pair trade.</p>
                    <p className="text-xs text-[#98A2B3] mt-1">Kai's analysis available for Pro members.</p>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Timestamps */}
            <CollapsibleSection title="Timestamps">
              <div className="divide-y divide-[#F2F4F7]">
                {TIMESTAMPS.map((ts, i) => (
                  <button key={i} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F9FAFB] transition-colors text-left">
                    <span className="ticker-mono text-xs w-10 flex-shrink-0" style={{ color: "#4DC820" }}>{ts.time}</span>
                    <span className="text-sm text-[#475467]">{ts.label}</span>
                  </button>
                ))}
              </div>
            </CollapsibleSection>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Convergence score callout */}
            <div className="bg-white rounded-xl border border-[#EAECF0] p-5 text-center">
              <p className="section-label mb-3">KKR Convergence Score</p>
              <ScoreRing score={88} size="lg" />
              <p className="text-sm font-semibold mt-3" style={{ color: "#E8193C" }}>Bearish Setup</p>
              <p className="text-xs text-[#667085] mt-1">Swing Trade · High Conviction</p>
              <Link href="/intelligence?ticker=KKR">
                <button className="w-full mt-4 text-[#101828] text-sm font-bold py-2 rounded-lg cc-gradient-bg hover:opacity-90 transition-opacity">
                  Full Intelligence Breakdown
                </button>
              </Link>
            </div>

            {/* Related videos */}
            <div>
              <h3 className="font-bold text-sm text-[#101828] mb-3" style={{ fontFamily: "var(--font-display)" }}>
                Watch Next
              </h3>
              <div className="space-y-3">
                {todaysPicks.slice(0, 3).map(v => (
                  <Link key={v.id} href={`/video/${v.id}`}>
                    <div className="content-card flex gap-3 bg-white rounded-xl border border-[#EAECF0] p-3 cursor-pointer">
                      <div className="w-24 h-16 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#101828] line-clamp-2 leading-snug"
                           style={{ fontFamily: "var(--font-display)" }}>
                          {v.title}
                        </p>
                        <p className="text-[10px] text-[#98A2B3] mt-1">{v.creator.name} · {v.duration}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <KaiChat />
    </div>
  );
}
