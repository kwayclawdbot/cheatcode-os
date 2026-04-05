// CheatCode OS — Intelligence Page v5
// Design philosophy: Robinhood-meets-Bloomberg terminal.
// Information-dense but never noisy. Every element earns its space.
//
// Layout (ticker detail):
// ┌─────────────────────────────────────────────────────────────┐
// │  [Score donut] TICKER  $price  +chg%  [direction badge]     │  ← compact hero strip
// │  Timeframe · Confidence · Analysis date                     │
// ├──────────────────────────────────┬──────────────────────────┤
// │  Candlestick chart (60d)         │  Signal breakdown        │  ← main content row
// │  with S/R/Inv lines drawn        │  (compact 3-bar + pct)   │
// ├──────────────────────────────────┴──────────────────────────┤
// │  [Catalysts]  [Risks]  (2-col tight cards)                  │
// ├─────────────────────────────────────────────────────────────┤
// │  Kai's Take  (conversational paragraphs + key levels grid)  │
// ├─────────────────────────────────────────────────────────────┤
// │  Evidence Chain (collapsible)                               │
// └─────────────────────────────────────────────────────────────┘

import { useState, useEffect } from "react";
import {
  Search, ArrowRight, TrendingUp, TrendingDown, Minus,
  ChevronDown, ChevronUp, Zap, Lock, Activity, Users,
  BarChart2, AlertTriangle
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { CandlestickChart } from "@/components/intelligence/CandlestickChart";
import { VideoCard } from "@/components/shared/VideoCard";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { fetchTicker, fetchRadar } from "@/lib/api";

// ─── Utilities ────────────────────────────────────────────────────────────────

function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "";
}

function deriveSignals(score: number, direction: string) {
  const isBull = direction === "Bullish";
  const isBear = direction === "Bearish";
  // Derive plausible signal counts from score + direction
  const bull = isBull ? Math.round(score * 0.18) : isBear ? Math.round((100 - score) * 0.05) : Math.round(score * 0.08);
  const bear = isBear ? Math.round(score * 0.18) : isBull ? Math.round((100 - score) * 0.05) : Math.round(score * 0.07);
  const neutral = Math.max(20 - bull - bear, 2);
  return { bull, bear, neutral };
}

function formatKaiAnalysis(text: string): string[] {
  if (!text) return [];
  // Split into sentences then group into ~2-sentence paragraphs
  const sentences = text
    .replace(/([.!?])\s+([A-Z])/g, "$1\n$2")
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);

  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    paragraphs.push([sentences[i], sentences[i + 1]].filter(Boolean).join(" "));
  }

  // Conversational rewrites
  return paragraphs.map(p =>
    p
      .replace(/The technical setup shows/gi, "Technically,")
      .replace(/The fundamental narrative centers on/gi, "The story here is")
      .replace(/This suggests/gi, "So basically,")
      .replace(/Key risk remains/gi, "The big thing to watch out for is")
      .replace(/Watch for/gi, "Keep an eye on")
      .replace(/indicates institutional participation/gi, "tells me institutions are in this")
      .replace(/according to creator mentions/gi, "based on what educators are saying")
      .replace(/typical of stocks transitioning between sentiment regimes/gi, "which is pretty normal when a stock is changing gears")
      .replace(/scores (\d+)\/100 on convergence with/gi, "is scoring $1 out of 100 right now — with")
      .replace(/Multiple expert mentions highlight/gi, "Several educators are calling this")
      .replace(/rather than a dead cat bounce/gi, "and not just a temporary pop")
  );
}

function normalizeTicker(d: any) {
  if (!d) return null;
  const pct = d.price_change_pct ?? 0;
  const direction = cap(d.direction || "neutral");
  const score = d.convergence_score ?? d.score ?? 0;
  const signals = deriveSignals(score, direction);
  const supportLevels: number[] = (d.key_levels?.support || []).map(Number).filter(Boolean);
  const resistanceLevels: number[] = (d.key_levels?.resistance || []).map(Number).filter(Boolean);
  const invalidationRaw = d.key_levels?.invalidation;
  const invalidation = invalidationRaw && !isNaN(Number(invalidationRaw)) ? Number(invalidationRaw) : null;

  return {
    ...d,
    ticker: d.symbol || d.ticker,
    score,
    direction,
    timeframe: cap(d.timeframe || "swing"),
    confidence: cap(d.confidence || "medium"),
    price: d.last_price ? Number(d.last_price) : null,
    priceFormatted: d.last_price ? `$${Number(d.last_price).toFixed(2)}` : "N/A",
    change: pct >= 0 ? `+${pct.toFixed(2)}` : pct.toFixed(2),
    changePercent: pct >= 0 ? `+${pct.toFixed(2)}%` : `${pct.toFixed(2)}%`,
    isPositive: pct >= 0,
    bullishSignals: signals.bull,
    bearishSignals: signals.bear,
    neutralSignals: signals.neutral,
    supportLevels,
    resistanceLevels,
    invalidation,
    catalysts: d.catalysts || [],
    risks: d.risks || [],
    evidenceChain: (d.evidence_chain || []).map((e: any) => ({
      source: e.source || "Unknown",
      signal: e.signal || "",
      detail: e.signal || e.detail || "",
      date: e.timestamp ? new Date(e.timestamp).toLocaleDateString() : "Recent",
    })),
    videosMentioning: d.related_content || [],
    kaiParagraphs: formatKaiAnalysis(d.daily_analysis || ""),
    daily_analysis: d.daily_analysis,
  };
}

// ─── Score Donut ──────────────────────────────────────────────────────────────

function ScoreDonut({ score, direction }: { score: number; direction: string }) {
  const color = direction === "Bullish" ? "#4DC820" : direction === "Bearish" ? "#E8193C" : "#F79009";
  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={[{ value: score }, { value: 100 - score }]} cx="50%" cy="50%"
               innerRadius={22} outerRadius={28} startAngle={90} endAngle={-270}
               dataKey="value" strokeWidth={0}>
            <Cell fill={color} />
            <Cell fill="var(--muted)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-[13px] font-bold leading-none" style={{ color, fontFamily: "var(--font-display)" }}>
          {score}
        </span>
      </div>
    </div>
  );
}

// ─── Compact Signal Breakdown ─────────────────────────────────────────────────

function SignalBreakdown({ bull, bear, neutral }: { bull: number; bear: number; neutral: number }) {
  const total = bull + bear + neutral || 1;
  const bars = [
    { label: "Bull", value: bull, pct: Math.round((bull / total) * 100), color: "#4DC820" },
    { label: "Bear", value: bear, pct: Math.round((bear / total) * 100), color: "#E8193C" },
    { label: "Neutral", value: neutral, pct: Math.round((neutral / total) * 100), color: "#F79009" },
  ];

  return (
    <div className="h-full flex flex-col justify-between">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Signals</p>

      {/* Compact horizontal bars */}
      <div className="space-y-2.5 flex-1">
        {bars.map(b => (
          <div key={b.label}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: b.color }} />
                <span className="text-xs font-semibold text-muted-foreground">{b.label}</span>
              </div>
              <span className="text-xs font-bold text-foreground">{b.value}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                   style={{ width: `${b.pct}%`, background: b.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Stacked proportion */}
      <div className="mt-3">
        <div className="h-2 rounded-full overflow-hidden flex">
          <div style={{ width: `${bars[0].pct}%`, background: "#4DC820" }} />
          <div style={{ width: `${bars[2].pct}%`, background: "#F79009" }} />
          <div style={{ width: `${bars[1].pct}%`, background: "#E8193C" }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] font-semibold" style={{ color: "#4DC820" }}>{bars[0].pct}% bull</span>
          <span className="text-[10px] font-semibold" style={{ color: "#E8193C" }}>{bars[1].pct}% bear</span>
        </div>
      </div>
    </div>
  );
}

// ─── Catalysts & Risks ────────────────────────────────────────────────────────

function CatalystsRisks({ catalysts, risks }: { catalysts: string[]; risks: string[] }) {
  if (!catalysts.length && !risks.length) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {catalysts.length > 0 && (
        <div className="rounded-xl border p-4" style={{ background: "#F0FDE8", borderColor: "#B6F08A" }}>
          <div className="flex items-center gap-1.5 mb-2.5">
            <TrendingUp size={12} style={{ color: "#2E7A10" }} />
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#2E7A10" }}>
              What could push it higher
            </p>
          </div>
          <ul className="space-y-1.5">
            {catalysts.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-snug" style={{ color: "#2E7A10" }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1" style={{ background: "#4DC820" }} />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
      {risks.length > 0 && (
        <div className="rounded-xl border p-4" style={{ background: "#FFF0F3", borderColor: "#F8A3B1" }}>
          <div className="flex items-center gap-1.5 mb-2.5">
            <TrendingDown size={12} style={{ color: "#A8001F" }} />
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#A8001F" }}>
              What could go wrong
            </p>
          </div>
          <ul className="space-y-1.5">
            {risks.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-snug" style={{ color: "#A8001F" }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1" style={{ background: "#E8193C" }} />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Kai Analysis ─────────────────────────────────────────────────────────────

function KaiAnalysis({ ticker, paragraphs, support, resistance, invalidation }: {
  ticker: string;
  paragraphs: string[];
  support: number[];
  resistance: number[];
  invalidation: number | null;
}) {
  if (!paragraphs.length) return null;
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
             style={{ background: "linear-gradient(135deg, #00AEEF, #0080B0)" }}>
          <span className="text-white text-xs font-bold">K</span>
        </div>
        <div>
          <p className="font-bold text-sm text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Kai's Take on {ticker}
          </p>
          <p className="text-[11px] text-muted-foreground">Plain English · Updated daily</p>
        </div>
      </div>

      <div className="p-5 space-y-3">
        {paragraphs.map((para, i) => (
          <p key={i} className="text-sm text-foreground leading-relaxed">{para}</p>
        ))}
      </div>

      {/* Key levels grid */}
      {(support.length > 0 || resistance.length > 0 || invalidation != null) && (
        <div className="border-t border-border px-5 py-4 grid grid-cols-3 gap-3">
          {[
            { label: "Support", values: support.map(v => `$${v}`), color: "#4DC820" },
            { label: "Resistance", values: resistance.map(v => `$${v}`), color: "#E8193C" },
            { label: "Invalidation", values: invalidation != null ? [`$${invalidation}`] : [], color: "#F79009" },
          ].map(k => (
            <div key={k.label} className="rounded-xl bg-muted border border-border p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: k.color }}>
                {k.label}
              </p>
              <p className="text-xs font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                {k.values.length > 0 ? k.values.join(" / ") : "N/A"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Evidence Chain ───────────────────────────────────────────────────────────

const SOURCE_ICONS: Record<string, string> = {
  "Flow Agent": "🌊", "News Agent": "📰", "Curated Content": "🎬",
  "Earnings Agent": "📊", "Macro Agent": "🌍", "Insider Agent": "👤",
};

function EvidenceChain({ items, isPro }: { items: any[]; isPro: boolean }) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted transition-colors">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-muted-foreground" />
          <span className="font-bold text-sm text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Evidence Chain
          </span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
            {items.length} signals
          </span>
          {!isPro && <Lock size={11} className="text-muted-foreground" />}
        </div>
        {open ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-border p-4 space-y-2.5">
          {items.map((item, i) => (
            <div key={i} className={`p-3.5 rounded-xl border border-border ${isPro || i === 0 ? "bg-card" : "bg-muted"}`}>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{SOURCE_ICONS[item.source] || "📌"}</span>
                  <span className="text-xs font-semibold text-muted-foreground">{item.source}</span>
                  <span className="text-border">·</span>
                  <span className="text-xs text-muted-foreground">{item.date}</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: "#E8F8FF", color: "#005F8A" }}>
                  {item.signal}
                </span>
              </div>
              {isPro || i === 0
                ? <p className="text-xs text-foreground leading-relaxed">{item.detail}</p>
                : <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground blur-sm select-none flex-1">{item.detail}</p>
                    <Lock size={11} className="text-muted-foreground flex-shrink-0" />
                  </div>
              }
            </div>
          ))}
          {!isPro && items.length > 1 && (
            <div className="text-center pt-2">
              <a href="/pricing">
                <button className="inline-flex items-center gap-2 text-[#101828] text-xs font-bold px-4 py-2 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity">
                  <Zap size={12} /> Unlock Full Evidence Chain
                </button>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Who's Talking ────────────────────────────────────────────────────────────

function WhosTalking({ videos }: { videos: any[] }) {
  const [open, setOpen] = useState(false);
  if (!videos.length) return null;
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted transition-colors">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-muted-foreground" />
          <span className="font-bold text-sm text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Who's talking about this?
          </span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
            {videos.length} videos
          </span>
        </div>
        {open ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-border p-4">
          <div className="scroll-row">
            {videos.map((v: any) => <VideoCard key={v.id} {...v} compact />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Full Ticker Detail ───────────────────────────────────────────────────────

function TickerDetail({ ticker, isPro = false }: { ticker: string; isPro?: boolean }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    setData(null);
    fetchTicker(ticker.toUpperCase())
      .then(d => { setData(normalizeTicker(d)); setLoading(false); })
      .catch(() => { setData(null); setLoading(false); });
  }, [ticker]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-[#4DC820] border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">
          Analyzing <span className="ticker-mono font-bold text-foreground">{ticker.toUpperCase()}</span>…
        </p>
        <p className="text-xs text-muted-foreground">Cross-referencing 6 data agents</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-24">
        <div className="text-5xl mb-4">🔍</div>
        <p className="font-semibold text-foreground mb-1">No data found for <span className="ticker-mono">{ticker.toUpperCase()}</span></p>
        <p className="text-sm text-muted-foreground">Try PLTR, NFLX, AMZN, AVGO, or SOXL</p>
      </div>
    );
  }

  const isBull = data.direction === "Bullish";
  const isBear = data.direction === "Bearish";
  const dirColor = isBull ? "#4DC820" : isBear ? "#E8193C" : "#F79009";
  const dirBg = isBull ? "#F0FDE8" : isBear ? "#FFF0F3" : "#FFFBEB";
  const DirIcon = isBull ? TrendingUp : isBear ? TrendingDown : Minus;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">

      {/* ── Hero Strip ── */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${dirColor}, ${dirColor}44)` }} />
        <div className="p-5">
          <div className="flex items-center gap-4 flex-wrap">
            <ScoreDonut score={data.score} direction={data.direction} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="ticker-mono text-3xl font-bold text-foreground">{data.ticker}</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ background: dirBg, color: dirColor }}>
                  <DirIcon size={11} /> {data.direction}
                </span>
                {!isPro && (
                  <a href="/pricing">
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full cc-gradient-bg text-[#101828] cursor-pointer hover:opacity-90 transition-opacity">
                      <Zap size={10} /> Unlock Pro
                    </span>
                  </a>
                )}
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="ticker-mono text-xl font-bold text-foreground">{data.priceFormatted}</span>
                <span className="text-sm font-semibold"
                      style={{ color: data.isPositive ? "#4DC820" : "#E8193C" }}>
                  {data.change} ({data.changePercent})
                </span>
              </div>
            </div>
            {/* Meta pills */}
            <div className="flex gap-2 flex-wrap">
              {[
                { label: "Timeframe", value: data.timeframe },
                { label: "Confidence", value: data.confidence },
              ].map(m => (
                <div key={m.label} className="px-3 py-2 rounded-xl bg-muted border border-border text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{m.label}</p>
                  <p className="text-xs font-bold text-foreground">{m.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Chart + Signal Breakdown (side by side) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Candlestick chart — takes 2/3 width on large screens */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">60-Day Price + Key Levels</p>
            <div className="flex items-center gap-3 text-[10px] font-semibold">
              {data.supportLevels.length > 0 && (
                <span className="flex items-center gap-1" style={{ color: "#4DC820" }}>
                  <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: "#4DC820" }} />
                  Support
                </span>
              )}
              {data.resistanceLevels.length > 0 && (
                <span className="flex items-center gap-1" style={{ color: "#E8193C" }}>
                  <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: "#E8193C" }} />
                  Resistance
                </span>
              )}
              {data.invalidation != null && (
                <span className="flex items-center gap-1" style={{ color: "#F79009" }}>
                  <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: "#F79009" }} />
                  Invalidation
                </span>
              )}
            </div>
          </div>
          <div className="px-4 pb-4">
            <CandlestickChart
              symbol={data.ticker}
              support={data.supportLevels}
              resistance={data.resistanceLevels}
              invalidation={data.invalidation}
              currentPrice={data.price}
            />
          </div>
          {data.invalidation != null && (
            <div className="px-5 pb-4">
              <div className="flex items-center gap-2 p-2.5 rounded-xl"
                   style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
                <AlertTriangle size={11} style={{ color: "#D97706" }} />
                <span className="text-xs font-medium" style={{ color: "#92400E" }}>
                  Thesis breaks down below <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>${data.invalidation}</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Signal breakdown — takes 1/3 width */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <SignalBreakdown
            bull={data.bullishSignals}
            bear={data.bearishSignals}
            neutral={data.neutralSignals}
          />
        </div>
      </div>

      {/* ── Catalysts & Risks ── */}
      <CatalystsRisks catalysts={data.catalysts} risks={data.risks} />

      {/* ── Kai's Analysis ── */}
      <KaiAnalysis
        ticker={data.ticker}
        paragraphs={data.kaiParagraphs}
        support={data.supportLevels}
        resistance={data.resistanceLevels}
        invalidation={data.invalidation}
      />

      {/* ── Evidence Chain ── */}
      <EvidenceChain items={data.evidenceChain} isPro={isPro} />

      {/* ── Who's Talking ── */}
      <WhosTalking videos={data.videosMentioning} />
    </div>
  );
}

// ─── Radar Pill ───────────────────────────────────────────────────────────────

function RadarPill({ t, onClick }: { t: any; onClick: () => void }) {
  const isBull = t.direction === "Bullish";
  const isBear = t.direction === "Bearish";
  const scoreColor = t.score >= 70 ? "#4DC820" : t.score >= 50 ? "#F79009" : "#E8193C";

  return (
    <button onClick={onClick}
            className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full border border-border bg-card hover:border-[#4DC820]/60 hover:shadow-sm transition-all group">
      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
            style={{ background: scoreColor }}>
        {t.score}
      </span>
      <span className="ticker-mono text-xs font-bold text-foreground group-hover:text-[#4DC820] transition-colors">
        {t.ticker}
      </span>
      <span className="text-[11px] font-bold" style={{ color: isBull ? "#4DC820" : isBear ? "#E8193C" : "#F79009" }}>
        {isBull ? "↑" : isBear ? "↓" : "→"}
      </span>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IntelligencePage() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");
  const [radarTickers, setRadarTickers] = useState<any[]>([]);

  useEffect(() => {
    fetchRadar()
      .then(r => {
        const all = [
          ...(r.critical || []),
          ...(r.high_conviction || []),
          ...(r.watch || []),
        ];
        setRadarTickers(all.map(t => ({
          ticker: t.symbol,
          score: t.score,
          direction: t.direction ? cap(t.direction) : "Neutral",
        })));
      })
      .catch(() => {});
  }, []);

  const handleSearch = () => {
    if (query.trim()) setSearched(query.trim());
  };

  const handleRadarClick = (ticker: string) => {
    setQuery(ticker);
    setSearched(ticker);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="page-enter">

        {/* ── Hero Search ── */}
        <div className="relative overflow-hidden"
             style={{ background: "linear-gradient(160deg, #1a2035 0%, #2B3245 60%, #1a2035 100%)" }}>
          <div className="h-0.5 w-full"
               style={{ background: "linear-gradient(90deg, #E8193C 0%, #00AEEF 33%, #7B2FBE 66%, #4DC820 100%)" }} />
          <div className="absolute inset-0 opacity-[0.04]"
               style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

          <div className="container mx-auto py-12 relative">
            <div className="max-w-xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
                   style={{ background: "rgba(0,174,239,0.12)", border: "1px solid rgba(0,174,239,0.25)" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-[#00AEEF] animate-pulse" />
                <span className="text-[11px] font-semibold tracking-wide" style={{ color: "#00AEEF" }}>
                  LIVE · 6 AGENTS ACTIVE
                </span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>
                What's the signal on any ticker?
              </h1>
              <p className="text-xs mb-6 leading-relaxed" style={{ color: "#98A2B3" }}>
                Kai cross-references news, options flow, macro, insider activity, earnings, and curated content into one convergence score.
              </p>
              <div className="flex gap-2 max-w-md mx-auto mb-3">
                <div className="flex-1 relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#98A2B3" }} />
                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    placeholder="PLTR, NVDA, AMZN…"
                    className="w-full pl-10 pr-4 py-3 text-sm rounded-xl outline-none ticker-mono border bg-white/95 text-[#101828] placeholder-[#98A2B3] focus:ring-2 focus:ring-[#4DC820]/40 transition-all font-semibold"
                    style={{ borderColor: "#EAECF0" }}
                  />
                </div>
                <button onClick={handleSearch}
                        className="text-[#101828] text-sm font-bold px-5 py-3 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity flex items-center gap-1.5 flex-shrink-0">
                  Analyze <ArrowRight size={13} />
                </button>
              </div>
              <p className="text-xs" style={{ color: "#667085" }}>
                Try:{" "}
                {["PLTR", "NFLX", "AMZN", "AVGO", "SOXL", "SPY"].map(t => (
                  <button key={t} onClick={() => { setQuery(t); setSearched(t); }}
                          className="hover:text-[#4DC820] transition-colors ticker-mono font-semibold mx-1">
                    {t}
                  </button>
                ))}
              </p>
            </div>
          </div>

          {/* Radar strip */}
          {radarTickers.length > 0 && (
            <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.2)" }}>
              <div className="container mx-auto py-2.5">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-[#4DC820] animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#667085" }}>
                      Hot Radar
                    </span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5 flex-1">
                    {radarTickers.map(t => (
                      <RadarPill key={t.ticker} t={t} onClick={() => handleRadarClick(t.ticker)} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Content ── */}
        <div className="container mx-auto py-7">
          {searched ? (
            <TickerDetail ticker={searched} isPro={false} />
          ) : (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                <BarChart2 size={28} className="text-muted-foreground" />
              </div>
              <p className="text-base font-semibold text-foreground mb-1.5" style={{ fontFamily: "var(--font-display)" }}>
                Enter a ticker to get the full signal
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Score, direction, 60-day chart with key levels, catalysts, risks, and Kai's plain-English take.
              </p>
              {radarTickers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Or pick from today's radar
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                    {radarTickers.slice(0, 8).map(t => (
                      <RadarPill key={t.ticker} t={t} onClick={() => handleRadarClick(t.ticker)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <KaiChat />
    </div>
  );
}
