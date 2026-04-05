// CheatCode OS — Intelligence Tool v2
// Brand: CC Cyan for Kai/AI elements, CC Green for bullish, CC Red for bearish,
// CC Yellow for watch, dark gradient hero, spectrum top bar

import { useState, useEffect } from "react";
import { Search, Lock, ChevronDown, ChevronUp, Zap, ArrowRight } from "lucide-react";
import { ScoreRing } from "@/components/shared/ScoreRing";
import { VideoCard } from "@/components/shared/VideoCard";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { tickerData as mockTickerData, radarTickers as mockRadar } from "@/lib/mockData";
import { fetchTicker, fetchRadar, type TickerData, type RadarData } from "@/lib/api";

// Use live API data with mock fallback
const tickerData = mockTickerData;

function useRadarTickers() {
  const [tickers, setTickers] = useState(mockRadar);
  useEffect(() => {
    fetchRadar()
      .then((r) => {
        const all = [...(r.critical || []), ...(r.high_conviction || []), ...(r.watch || [])];
        if (all.length) {
          setTickers(all.map((t) => ({
            ticker: t.symbol,
            score: t.score,
            direction: t.direction ? t.direction.charAt(0).toUpperCase() + t.direction.slice(1) : "Neutral",
            timeframe: t.timeframe ? t.timeframe.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) : "Swing",
            confidence: t.confidence ? t.confidence.charAt(0).toUpperCase() + t.confidence.slice(1).replace(/_/g, " ") : "Watch",
            change: "",
          })));
        }
      })
      .catch(() => {});
  }, []);
  return tickers;
}
const radarTickers = mockRadar; // will be overridden in component

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
    <div className={`p-4 rounded-xl border border-border ${isPaid ? "bg-card" : "bg-muted"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{SOURCE_ICONS[item.source] || "📌"}</span>
          <div>
            <span className="text-xs font-semibold text-muted-foreground">{item.source}</span>
            <span className="mx-2 text-border">·</span>
            <span className="text-xs text-muted-foreground">{item.date}</span>
          </div>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: "#E8F8FF", color: "#005F8A" }}>
          {item.signal}
        </span>
      </div>
      {isPaid ? (
        <p className="text-sm text-foreground leading-relaxed mt-2">{item.detail}</p>
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
        <p className="text-muted-foreground font-medium">No data found for <span className="ticker-mono font-bold text-foreground">{ticker.toUpperCase()}</span></p>
        <p className="text-sm text-muted-foreground mt-1">Try NVDA, KKR, or check the Radar for active tickers.</p>
      </div>
    );
  }

  const isBullish = data.direction === "Bullish";
  const directionColor = isBullish ? "#4DC820" : "#E8193C";
  const directionBg = isBullish ? "#F0FDE8" : "#FFF0F3";

  return (
    <div className="space-y-5">
      {/* Hero score card */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {/* Spectrum top bar */}
        <div className="h-0.5" style={{ background: "linear-gradient(90deg, #E8193C 0%, #00AEEF 33%, #7B2FBE 66%, #4DC820 100%)" }} />
        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <ScoreRing score={data.score} size="xl" />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className="ticker-mono text-3xl font-bold text-foreground">{data.ticker}</span>
                <span className="text-sm font-bold px-3 py-1 rounded-full"
                      style={{ background: directionBg, color: directionColor }}>
                  {isBullish ? "↑" : "↓"} {data.direction}
                </span>
              </div>
              <p className="text-lg font-semibold text-foreground mb-1">
                {data.direction} setup. {data.timeframe}. {data.confidence} confidence.
              </p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="ticker-mono font-semibold text-foreground">{data.price}</span>
                <span className="font-semibold" style={{ color: data.changePercent.startsWith("+") ? "#4DC820" : "#E8193C" }}>
                  {data.change} ({data.changePercent})
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                  {data.theme}
                </span>
              </div>
            </div>
            {!isPro && (
              <div className="text-center sm:text-right">
                <p className="text-xs text-muted-foreground mb-2">Full breakdown</p>
                <a href="/pricing">
                  <button className="flex items-center gap-2 text-[#101828] text-sm font-bold px-4 py-2 rounded-lg cc-gradient-bg hover:opacity-90 transition-opacity">
                    <Zap size={13} />
                    Unlock Pro
                  </button>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Catalysts + Invalidation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border p-4" style={{ background: "#F0FDE8", borderColor: "#B6F08A" }}>
          <p className="section-label mb-2" style={{ color: "#2E7A10" }}>Catalysts</p>
          <ul className="space-y-1">
            {data.catalysts.map((c, i) => (
              <li key={i} className="text-sm flex items-center gap-2" style={{ color: "#2E7A10" }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#4DC820" }} />
                {c}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border p-4" style={{ background: "#FFF0F3", borderColor: "#F8A3B1" }}>
          <p className="section-label mb-2" style={{ color: "#A8001F" }}>Invalidation Level</p>
          <p className="text-sm font-medium" style={{ color: "#A8001F" }}>{data.invalidationLevel}</p>
          <p className="text-xs mt-1" style={{ color: "#E8193C" }}>Monitor this level closely.</p>
        </div>
      </div>

      {/* Evidence Chain */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <button
          onClick={() => setEvidenceOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Why? — Evidence Chain
            </span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {data.evidenceChain.length} signals
            </span>
            {!isPro && <Lock size={12} className="text-[#98A2B3]" />}
          </div>
          {evidenceOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </button>
        {evidenceOpen && (
          <div className="border-t border-border p-4 space-y-3">
            {data.evidenceChain.map((item, i) => (
              <EvidenceCard key={i} item={item} isPaid={isPro || i === 0} />
            ))}
            {!isPro && (
              <div className="text-center py-3">
                <p className="text-sm text-muted-foreground mb-3">
                  {data.evidenceChain.length - 1} more signals locked.
                </p>
                <a href="/pricing">
                  <button className="flex items-center gap-2 text-[#101828] text-sm font-bold px-5 py-2 rounded-lg cc-gradient-bg hover:opacity-90 transition-opacity mx-auto">
                    <Zap size={13} />
                    Unlock Full Evidence Chain
                  </button>
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Who's talking */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <button
          onClick={() => setWhoOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted transition-colors"
        >
          <span className="font-bold text-sm text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Who's talking about this?
          </span>
          {whoOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </button>
        {whoOpen && (
          <div className="border-t border-border p-4">
            <div className="scroll-row">
              {data.videosMentioning.map(v => (
                <VideoCard key={v.id} {...v} compact />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Related tickers */}
      <div className="bg-card rounded-xl border border-border p-4">
        <p className="font-bold text-sm text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
          Related Tickers
        </p>
        <div className="flex gap-2 flex-wrap">
          {data.relatedTickers.map(t => (
            <button key={t}
              className="ticker-mono text-sm bg-muted border border-border px-3 py-1.5 rounded-lg text-muted-foreground transition-colors"
              style={{ transition: "border-color 0.15s, color 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#4DC820"; (e.currentTarget as HTMLButtonElement).style.color = "#4DC820"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#EAECF0"; (e.currentTarget as HTMLButtonElement).style.color = "#475467"; }}
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
  const radarTickers = useRadarTickers();

  const handleSearch = () => {
    if (query.trim()) setSearched(query.trim());
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="page-enter">
        {/* Hero — dark gradient with spectrum bar */}
        <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #2B3245 0%, #1a2035 100%)" }}>
          <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #E8193C 0%, #00AEEF 33%, #7B2FBE 66%, #4DC820 100%)" }} />
          <div className="container mx-auto py-10 relative">
            <div className="max-w-xl mx-auto text-center">
              <p className="section-label mb-2" style={{ color: "#98A2B3" }}>Intelligence Tool</p>
              <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>
                What's the signal on any ticker?
              </h1>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: "#98A2B3" }}>
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
                    className="w-full pl-9 pr-4 py-3 text-sm rounded-xl outline-none ticker-mono border border-white/20 bg-white/10 text-white placeholder-white/40 focus:bg-white/15 focus:border-[#4DC820] transition-all"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="text-[#101828] text-sm font-bold px-5 py-3 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  Analyze
                  <ArrowRight size={14} />
                </button>
              </div>
              <p className="text-xs mt-2" style={{ color: "#667085" }}>
                Try: NVDA, KKR, CCJ, AMD, NFLX
              </p>
            </div>
          </div>
        </div>

        <div className="container mx-auto py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {searched ? (
                <TickerResult ticker={searched} isPro={false} />
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search size={32} className="text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">Enter a ticker above to see the full intelligence breakdown.</p>
                </div>
              )}
            </div>

            {/* Sidebar: Radar */}
            <div>
              <h3 className="font-bold text-sm text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
                Today's Radar
              </h3>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                {/* Dark header */}
                <div className="h-0.5" style={{ background: "linear-gradient(90deg, #4DC820 0%, #C8D400 100%)" }} />
                <div className="divide-y divide-border">
                  {radarTickers.map(t => (
                    <button
                      key={t.ticker}
                      onClick={() => { setQuery(t.ticker); setSearched(t.ticker); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                    >
                      <ScoreRing score={t.score} size="sm" showLabel={false} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="ticker-mono text-sm font-bold text-foreground">{t.ticker}</span>
                          <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
                                style={{
                                  color: t.direction === "Bullish" ? "#2E7A10" : "#A8001F",
                                  background: t.direction === "Bullish" ? "#F0FDE8" : "#FFF0F3",
                                }}>
                            {t.direction}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">{t.confidence}</div>
                      </div>
                      <span className="text-sm font-semibold"
                            style={{ color: t.change.startsWith("+") ? "#4DC820" : "#E8193C" }}>
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
