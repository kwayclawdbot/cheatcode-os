// CheatCode OS — Intelligence Tool: Ticker Lookup
// Design: One input, clean output. Robinhood-simple.
// Free: score + direction only. Paid: full evidence chain.
// Score ring is the hero element. Evidence chain expandable below.

import { useState } from "react";
import { Search, TrendingUp, TrendingDown, Lock, ChevronDown, ChevronUp, ExternalLink, Zap, ArrowRight } from "lucide-react";
import { ScoreRing } from "@/components/shared/ScoreRing";
import { VideoCard } from "@/components/shared/VideoCard";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { tickerData, radarTickers } from "@/lib/mockData";

const INTEL_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663185570724/QgiApnmXYRXSMA2KNkFFkL/intelligence-tool-bg-oPwz7mFzUjQ4hHCmkQhv9u.webp";

const SOURCE_ICONS: Record<string, string> = {
  "Flow Agent": "🌊",
  "News Agent": "📰",
  "Curated Content": "🎬",
  "Earnings Agent": "📊",
  "Macro Agent": "🌍",
  "Insider Agent": "👤",
};

function EvidenceCard({ item, isPaid }: { item: { source: string; signal: string; detail: string; date: string }; isPaid: boolean }) {
  return (
    <div className={`p-4 rounded-xl border ${isPaid ? "bg-white border-[#EAECF0]" : "bg-[#F9FAFB] border-[#EAECF0]"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{SOURCE_ICONS[item.source] || "📌"}</span>
          <div>
            <span className="text-xs font-semibold text-[#475467]">{item.source}</span>
            <span className="mx-2 text-[#EAECF0]">·</span>
            <span className="text-xs text-[#98A2B3]">{item.date}</span>
          </div>
        </div>
        <span className="text-xs font-semibold text-[#2E90FA] bg-[#EFF8FF] px-2 py-0.5 rounded-full flex-shrink-0">
          {item.signal}
        </span>
      </div>
      {isPaid ? (
        <p className="text-sm text-[#475467] leading-relaxed mt-2">{item.detail}</p>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <p className="text-sm text-[#98A2B3] gated-blur select-none flex-1">{item.detail}</p>
          <Lock size={12} className="text-[#98A2B3] flex-shrink-0" />
        </div>
      )}
    </div>
  );
}

function TickerResult({ ticker, isPro = false }: { ticker: string; isPro?: boolean }) {
  const data = tickerData[ticker.toUpperCase()];
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [whoOpen, setWhoOpen] = useState(false);

  if (!data) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">🔍</div>
        <p className="text-[#667085] font-medium">No data found for <span className="ticker-mono font-bold text-[#101828]">{ticker.toUpperCase()}</span></p>
        <p className="text-sm text-[#98A2B3] mt-1">Try NVDA, KKR, or check the Radar for active tickers.</p>
      </div>
    );
  }

  const isBullish = data.direction === "Bullish";

  return (
    <div className="space-y-5">
      {/* Hero score card */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Score ring */}
          <ScoreRing score={data.score} size="xl" />

          {/* Main info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <span className="ticker-mono text-3xl font-bold text-[#101828]">{data.ticker}</span>
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                isBullish ? "bg-[#ECFDF3] text-[#027A48]" : "bg-[#FEF3F2] text-[#B42318]"
              }`}>
                {isBullish ? "↑" : "↓"} {data.direction}
              </span>
            </div>
            <p className="text-lg font-semibold text-[#101828] mb-1">
              {data.direction} setup. {data.timeframe}. {data.confidence} confidence.
            </p>
            <div className="flex items-center gap-3 text-sm text-[#667085]">
              <span className="ticker-mono font-semibold text-[#101828]">{data.price}</span>
              <span className={`font-semibold ${data.changePercent.startsWith("+") ? "text-[#12B76A]" : "text-[#F04438]"}`}>
                {data.change} ({data.changePercent})
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-[#667085] bg-[#F2F4F7] px-2 py-0.5 rounded-full border border-[#EAECF0]">
                {data.theme}
              </span>
            </div>
          </div>

          {/* CTA */}
          {!isPro && (
            <div className="text-center sm:text-right">
              <p className="text-xs text-[#667085] mb-2">Full breakdown</p>
              <a href="/pricing">
                <button className="flex items-center gap-2 bg-[#12B76A] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#0EA05E] transition-colors">
                  <Zap size={13} fill="white" />
                  Unlock Pro
                </button>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Catalysts + Invalidation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#ECFDF3] rounded-xl border border-[#A9EFC5] p-4">
          <p className="section-label text-[#027A48] mb-2">Catalysts</p>
          <ul className="space-y-1">
            {data.catalysts.map((c, i) => (
              <li key={i} className="text-sm text-[#027A48] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A] flex-shrink-0" />
                {c}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-[#FEF3F2] rounded-xl border border-[#FECDCA] p-4">
          <p className="section-label text-[#B42318] mb-2">Invalidation Level</p>
          <p className="text-sm text-[#B42318] font-medium">{data.invalidationLevel}</p>
          <p className="text-xs text-[#F04438] mt-1">Monitor this level closely.</p>
        </div>
      </div>

      {/* Evidence Chain */}
      <div className="bg-white rounded-xl border border-[#EAECF0] overflow-hidden">
        <button
          onClick={() => setEvidenceOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F9FAFB] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-[#101828]" style={{ fontFamily: "var(--font-display)" }}>
              Why? — Evidence Chain
            </span>
            <span className="text-xs text-[#667085] bg-[#F2F4F7] px-2 py-0.5 rounded-full">
              {data.evidenceChain.length} signals
            </span>
            {!isPro && <Lock size={12} className="text-[#98A2B3]" />}
          </div>
          {evidenceOpen ? <ChevronUp size={16} className="text-[#667085]" /> : <ChevronDown size={16} className="text-[#667085]" />}
        </button>
        {evidenceOpen && (
          <div className="border-t border-[#EAECF0] p-4 space-y-3">
            {data.evidenceChain.map((item, i) => (
              <EvidenceCard key={i} item={item} isPaid={isPro || i === 0} />
            ))}
            {!isPro && (
              <div className="text-center py-3">
                <p className="text-sm text-[#667085] mb-3">
                  {data.evidenceChain.length - 1} more signals locked. Upgrade to see the full picture.
                </p>
                <a href="/pricing">
                  <button className="flex items-center gap-2 bg-[#12B76A] text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-[#0EA05E] transition-colors mx-auto">
                    <Zap size={13} fill="white" />
                    Unlock Full Evidence Chain
                  </button>
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Who's talking about this */}
      <div className="bg-white rounded-xl border border-[#EAECF0] overflow-hidden">
        <button
          onClick={() => setWhoOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F9FAFB] transition-colors"
        >
          <span className="font-bold text-sm text-[#101828]" style={{ fontFamily: "var(--font-display)" }}>
            Who's talking about this?
          </span>
          {whoOpen ? <ChevronUp size={16} className="text-[#667085]" /> : <ChevronDown size={16} className="text-[#667085]" />}
        </button>
        {whoOpen && (
          <div className="border-t border-[#EAECF0] p-4">
            <div className="scroll-row">
              {data.videosMentioning.map(v => (
                <VideoCard key={v.id} {...v} compact />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Related tickers */}
      <div className="bg-white rounded-xl border border-[#EAECF0] p-4">
        <p className="font-bold text-sm text-[#101828] mb-3" style={{ fontFamily: "var(--font-display)" }}>
          Related Tickers
        </p>
        <div className="flex gap-2 flex-wrap">
          {data.relatedTickers.map(t => (
            <button
              key={t}
              className="ticker-mono text-sm bg-[#F9FAFB] border border-[#EAECF0] px-3 py-1.5 rounded-lg text-[#475467] hover:border-[#12B76A] hover:text-[#12B76A] transition-colors"
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function IntelligencePage() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");

  const handleSearch = () => {
    if (query.trim()) setSearched(query.trim());
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Nav />

      <main className="page-enter">
        {/* Hero search section */}
        <div className="relative bg-white border-b border-[#EAECF0] overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <img src={INTEL_IMAGE} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="container mx-auto py-10 relative">
            <div className="max-w-xl mx-auto text-center">
              <p className="section-label mb-2">Intelligence Tool</p>
              <h1 className="text-3xl font-bold text-[#101828] mb-2" style={{ fontFamily: "var(--font-display)" }}>
                What's the signal on any ticker?
              </h1>
              <p className="text-[#667085] text-sm mb-6">
                Kai cross-references 6 data agents — news, flow, macro, insider, earnings, and curated content — into a single convergence score.
              </p>
              <div className="flex gap-2 max-w-sm mx-auto">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    placeholder="Enter ticker (e.g. NVDA)"
                    className="w-full pl-9 pr-4 py-3 text-sm bg-[#F9FAFB] border border-[#EAECF0] rounded-xl outline-none focus:border-[#12B76A] focus:ring-2 focus:ring-[#12B76A]/20 transition-all ticker-mono"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="bg-[#12B76A] text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-[#0EA05E] transition-colors flex items-center gap-2"
                >
                  Analyze
                  <ArrowRight size={14} />
                </button>
              </div>
              <p className="text-xs text-[#98A2B3] mt-2">
                Try: NVDA, KKR, CCJ, AMD, NFLX
              </p>
            </div>
          </div>
        </div>

        <div className="container mx-auto py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main result */}
            <div className="lg:col-span-2">
              {searched ? (
                <TickerResult ticker={searched} isPro={false} />
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-[#F2F4F7] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search size={32} className="text-[#98A2B3]" />
                  </div>
                  <p className="text-[#667085] font-medium">Enter a ticker above to see the full intelligence breakdown.</p>
                </div>
              )}
            </div>

            {/* Sidebar: Radar */}
            <div>
              <h3 className="font-bold text-sm text-[#101828] mb-3" style={{ fontFamily: "var(--font-display)" }}>
                Today's Radar
              </h3>
              <div className="bg-white rounded-xl border border-[#EAECF0] overflow-hidden">
                <div className="divide-y divide-[#F2F4F7]">
                  {radarTickers.map(t => (
                    <button
                      key={t.ticker}
                      onClick={() => { setQuery(t.ticker); setSearched(t.ticker); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F9FAFB] transition-colors text-left"
                    >
                      <ScoreRing score={t.score} size="sm" showLabel={false} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="ticker-mono text-sm font-bold text-[#101828]">{t.ticker}</span>
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                            t.direction === "Bullish" ? "text-[#027A48] bg-[#ECFDF3]" : "text-[#B42318] bg-[#FEF3F2]"
                          }`}>
                            {t.direction}
                          </span>
                        </div>
                        <div className="text-xs text-[#98A2B3]">{t.confidence}</div>
                      </div>
                      <span className={`text-sm font-semibold ${t.change.startsWith("+") ? "text-[#12B76A]" : "text-[#F04438]"}`}>
                        {t.change}
                      </span>
                    </button>
                  ))}
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
