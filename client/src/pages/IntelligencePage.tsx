// CheatCode OS — Intelligence Page v4
// Design: Hero search front-and-center. Horizontal radar pill strip.
// Ticker detail: data-visual-first — score donut, signal bar chart derived from
// score+direction, key levels horizontal range chart, catalysts/risks cards,
// Kai analysis in conversational tone with paragraph breaks.
// API shape: { convergence_score, direction, timeframe, confidence, last_price,
//   price_change_pct, daily_analysis, key_levels:{support,resistance,invalidation},
//   catalysts, risks }

import { useState, useEffect, useRef } from "react";
import {
  Search, Lock, Zap, ArrowRight, TrendingUp, TrendingDown,
  Minus, ChevronDown, ChevronUp, BarChart2, Activity,
  AlertTriangle, Users
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import { VideoCard } from "@/components/shared/VideoCard";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { fetchTicker, fetchRadar } from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "";
}

// Derive signal counts from score + direction since API doesn't return them
function deriveSignals(score: number, direction: string) {
  const total = 20; // normalised total
  const bull = direction === "Bullish"
    ? Math.round((score / 100) * total)
    : direction === "Bearish"
    ? Math.round(((100 - score) / 100) * total * 0.3)
    : Math.round(total * 0.4);
  const bear = direction === "Bearish"
    ? Math.round((score / 100) * total)
    : direction === "Bullish"
    ? Math.round(((100 - score) / 100) * total * 0.3)
    : Math.round(total * 0.35);
  const neutral = Math.max(total - bull - bear, 0);
  return { bull, bear, neutral };
}

// Reformat Kai's analyst-speak into conversational paragraphs
function formatKaiAnalysis(text: string): string[] {
  if (!text) return [];

  // Split on sentence boundaries that look like new topics
  // Then group into 2-3 sentence paragraphs
  const cleaned = text
    .replace(/\. ([A-Z])/g, ".\n$1") // split on sentence starts
    .replace(/([a-z])\. ([A-Z])/g, "$1.\n$2");

  const sentences = cleaned.split("\n").map(s => s.trim()).filter(Boolean);

  // Group into paragraphs of ~2-3 sentences
  const paragraphs: string[] = [];
  let current: string[] = [];

  sentences.forEach((s, i) => {
    current.push(s);
    if (current.length >= 2 || i === sentences.length - 1) {
      paragraphs.push(current.join(" "));
      current = [];
    }
  });

  // Rewrite analytical phrases to conversational ones
  return paragraphs.map(p =>
    p
      .replace(/The technical setup shows/gi, "Technically,")
      .replace(/The fundamental narrative centers on/gi, "The story here is")
      .replace(/This suggests/gi, "So basically,")
      .replace(/Key risk remains/gi, "The main thing to watch out for is")
      .replace(/Watch for/gi, "Keep an eye on")
      .replace(/indicates institutional participation/gi, "tells me institutions are involved")
      .replace(/according to creator mentions/gi, "based on what the educators are saying")
      .replace(/typical of stocks transitioning between sentiment regimes/gi, "which is pretty normal when a stock is shifting gears")
      .replace(/scores (\d+)\/100 on convergence with/gi, "is scoring $1 out of 100 right now, with")
      .replace(/Multiple expert mentions highlight/gi, "A bunch of the educators are calling this")
      .replace(/The \$(\S+) intraday range/gi, "The intraday range of \$$1")
      .replace(/rather than a dead cat bounce/gi, "and not just a temporary bounce")
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
  const invalidation = d.key_levels?.invalidation ?? null;

  return {
    ...d,
    ticker: d.symbol || d.ticker,
    score,
    direction,
    timeframe: cap(d.timeframe || "swing"),
    confidence: cap(d.confidence || "medium"),
    price: d.last_price ? d.last_price : null,
    priceFormatted: d.last_price ? `$${Number(d.last_price).toFixed(2)}` : "N/A",
    change: pct >= 0 ? `+${pct.toFixed(2)}` : pct.toFixed(2),
    changePercent: pct >= 0 ? `+${pct.toFixed(2)}%` : `${pct.toFixed(2)}%`,
    theme: (d.themes || [])[0] || "",
    evidenceChain: (d.evidence_chain || []).map((e: any) => ({
      source: e.source || "Unknown",
      signal: e.signal || "",
      detail: e.signal || e.detail || "",
      date: e.timestamp ? new Date(e.timestamp).toLocaleDateString() : "Recent",
    })),
    bullishSignals: signals.bull,
    bearishSignals: signals.bear,
    neutralSignals: signals.neutral,
    supportLevels,
    resistanceLevels,
    invalidation,
    catalysts: d.catalysts || [],
    risks: d.risks || [],
    videosMentioning: d.related_content || [],
    relatedTickers: d.related_tickers || [],
    daily_analysis: d.daily_analysis,
    kaiParagraphs: formatKaiAnalysis(d.daily_analysis || ""),
  };
}

// ─── Score Donut ──────────────────────────────────────────────────────────────

function ScoreDonut({ score, direction }: { score: number; direction: string }) {
  const isBull = direction === "Bullish";
  const isBear = direction === "Bearish";
  const color = isBull ? "#4DC820" : isBear ? "#E8193C" : "#F79009";
  const data = [
    { value: score },
    { value: 100 - score },
  ];

  return (
    <div className="relative w-28 h-28 flex-shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={38}
            outerRadius={52}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            strokeWidth={0}
          >
            <Cell fill={color} />
            <Cell fill="var(--muted)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold leading-none" style={{ fontFamily: "var(--font-display)", color }}>
          {score}
        </span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">Score</span>
      </div>
    </div>
  );
}

// ─── Signal Breakdown ─────────────────────────────────────────────────────────

function SignalBreakdown({ bull, bear, neutral }: { bull: number; bear: number; neutral: number }) {
  const max = Math.max(bull, bear, neutral, 1);
  const bars = [
    { label: "Bullish", value: bull, color: "#4DC820" },
    { label: "Bearish", value: bear, color: "#E8193C" },
    { label: "Neutral", value: neutral, color: "#F79009" },
  ];
  const total = bull + bear + neutral || 1;

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-5">Signal Breakdown</p>

      {/* Bar chart */}
      <div className="flex items-end gap-4 h-20 mb-4">
        {bars.map(b => (
          <div key={b.label} className="flex-1 flex flex-col items-center gap-1.5">
            <span className="text-sm font-bold text-foreground">{b.value}</span>
            <div
              className="w-full rounded-t-lg"
              style={{
                height: `${Math.max((b.value / max) * 64, 4)}px`,
                background: b.color,
                opacity: 0.85,
                transition: "height 0.5s ease",
              }}
            />
          </div>
        ))}
      </div>

      {/* Labels */}
      <div className="flex gap-4">
        {bars.map(b => (
          <div key={b.label} className="flex-1 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <span className="w-2 h-2 rounded-full" style={{ background: b.color }} />
              <span className="text-[11px] font-semibold text-muted-foreground">{b.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Stacked proportion bar */}
      <div className="mt-4 h-2 rounded-full overflow-hidden flex gap-px">
        <div style={{ width: `${(bull / total) * 100}%`, background: "#4DC820", borderRadius: "4px 0 0 4px" }} />
        <div style={{ width: `${(neutral / total) * 100}%`, background: "#F79009" }} />
        <div style={{ width: `${(bear / total) * 100}%`, background: "#E8193C", borderRadius: "0 4px 4px 0" }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>{Math.round((bull / total) * 100)}% bull</span>
        <span>{Math.round((bear / total) * 100)}% bear</span>
      </div>
    </div>
  );
}

// ─── Key Levels Chart ─────────────────────────────────────────────────────────

function KeyLevelsChart({ price, support, resistance, invalidation }: {
  price: number | null;
  support: number[];
  resistance: number[];
  invalidation: string | null;
}) {
  const allValues = [
    ...support,
    ...resistance,
    ...(price ? [price] : []),
    ...(invalidation && !isNaN(Number(invalidation)) ? [Number(invalidation)] : []),
  ].filter(Boolean);

  if (allValues.length === 0) return null;

  const min = Math.min(...allValues) * 0.96;
  const max = Math.max(...allValues) * 1.04;
  const range = max - min || 1;

  // Build sorted level list for the chart
  const levels = [
    ...resistance.map(v => ({ value: v, type: "resistance" as const, label: "Resistance" })),
    ...(price ? [{ value: price, type: "price" as const, label: "Current" }] : []),
    ...support.map(v => ({ value: v, type: "support" as const, label: "Support" })),
    ...(invalidation && !isNaN(Number(invalidation))
      ? [{ value: Number(invalidation), type: "invalidation" as const, label: "Invalidation" }]
      : []),
  ].sort((a, b) => b.value - a.value); // highest first

  const colorMap = {
    resistance: "#E8193C",
    price: "#00AEEF",
    support: "#4DC820",
    invalidation: "#F79009",
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Key Price Levels</p>

      {/* Horizontal range chart */}
      <div className="relative mb-4" style={{ height: `${Math.max(levels.length * 44, 100)}px` }}>
        {/* Track */}
        <div className="absolute left-24 right-0 top-0 bottom-0">
          {/* Background range bar */}
          <div className="absolute inset-y-0 left-0 right-0 flex items-center">
            <div className="w-full h-2 rounded-full bg-muted" />
          </div>

          {/* Level markers */}
          {levels.map((l, i) => {
            const pct = ((l.value - min) / range) * 100;
            const color = colorMap[l.type];
            const yPct = (i / Math.max(levels.length - 1, 1)) * 100;

            return (
              <div key={`${l.type}-${l.value}`} className="absolute flex items-center"
                   style={{ left: `${pct}%`, top: `${yPct}%`, transform: "translate(-50%, -50%)" }}>
                {/* Dot */}
                <div className="w-3 h-3 rounded-full border-2 border-background shadow-sm z-10"
                     style={{ background: color }} />
              </div>
            );
          })}

          {/* Price range fill */}
          {support.length > 0 && resistance.length > 0 && (
            <div className="absolute inset-y-0 flex items-center pointer-events-none"
                 style={{
                   left: `${((Math.min(...support) - min) / range) * 100}%`,
                   right: `${100 - ((Math.max(...resistance) - min) / range) * 100}%`,
                 }}>
              <div className="w-full h-2 rounded-full opacity-20" style={{ background: "#4DC820" }} />
            </div>
          )}
        </div>
      </div>

      {/* Level list */}
      <div className="space-y-2">
        {levels.map((l, i) => {
          const pct = ((l.value - min) / range) * 100;
          const color = colorMap[l.type];
          return (
            <div key={i} className="flex items-center gap-3">
              {/* Label */}
              <span className="text-[11px] font-semibold w-20 text-right flex-shrink-0" style={{ color }}>
                {l.label}
              </span>
              {/* Bar */}
              <div className="flex-1 h-5 bg-muted rounded-lg overflow-hidden relative">
                <div
                  className="h-full rounded-lg flex items-center justify-end pr-2 transition-all duration-500"
                  style={{ width: `${Math.max(pct, 8)}%`, background: `${color}22`, border: `1px solid ${color}55` }}
                >
                  <span className="text-[10px] font-bold" style={{ color, fontFamily: "var(--font-mono)" }}>
                    ${l.value.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Invalidation callout */}
      {invalidation && (
        <div className="mt-4 flex items-center gap-2 p-2.5 rounded-xl"
             style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
          <AlertTriangle size={12} style={{ color: "#D97706" }} />
          <span className="text-xs font-medium" style={{ color: "#92400E" }}>
            Invalidation below <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>${invalidation}</span> — that's where the thesis breaks down
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Catalysts vs Risks ───────────────────────────────────────────────────────

function CatalystsRisks({ catalysts, risks }: { catalysts: string[]; risks: string[] }) {
  if (catalysts.length === 0 && risks.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {catalysts.length > 0 && (
        <div className="rounded-2xl border p-5" style={{ background: "#F0FDE8", borderColor: "#B6F08A" }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} style={{ color: "#2E7A10" }} />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#2E7A10" }}>What could push it higher</p>
          </div>
          <ul className="space-y-2">
            {catalysts.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#2E7A10" }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: "#4DC820" }} />
                <span className="leading-snug">{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {risks.length > 0 && (
        <div className="rounded-2xl border p-5" style={{ background: "#FFF0F3", borderColor: "#F8A3B1" }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={14} style={{ color: "#A8001F" }} />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#A8001F" }}>What could go wrong</p>
          </div>
          <ul className="space-y-2">
            {risks.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#A8001F" }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: "#E8193C" }} />
                <span className="leading-snug">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Evidence Card ────────────────────────────────────────────────────────────

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

// ─── Ticker Detail ────────────────────────────────────────────────────────────

function TickerDetail({ ticker, isPro = false }: { ticker: string; isPro?: boolean }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [whoOpen, setWhoOpen] = useState(false);

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
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-14 h-14 rounded-full border-2 border-[#4DC820] border-t-transparent animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">
          Analyzing <span className="ticker-mono font-bold text-foreground">{ticker.toUpperCase()}</span>…
        </p>
        <p className="text-xs text-muted-foreground">Cross-referencing 6 data agents</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
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
  const DirectionIcon = isBull ? TrendingUp : isBear ? TrendingDown : Minus;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* ── Hero Card ── */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${dirColor}, ${dirColor}55)` }} />
        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <ScoreDonut score={data.score} direction={data.direction} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="ticker-mono text-4xl font-bold text-foreground">{data.ticker}</span>
                <span className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full"
                      style={{ background: dirBg, color: dirColor }}>
                  <DirectionIcon size={13} />
                  {data.direction}
                </span>
              </div>
              <div className="flex items-baseline gap-3 mb-3">
                <span className="ticker-mono text-2xl font-bold text-foreground">{data.priceFormatted}</span>
                <span className="text-base font-semibold"
                      style={{ color: data.changePercent.startsWith("+") ? "#4DC820" : "#E8193C" }}>
                  {data.change} ({data.changePercent})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Timeframe", value: data.timeframe },
                  { label: "Confidence", value: data.confidence },
                ].map(s => (
                  <div key={s.label} className="text-center px-3 py-2 rounded-xl bg-muted border border-border">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
                    <p className="text-sm font-bold text-foreground">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
            {!isPro && (
              <div className="text-center flex-shrink-0">
                <p className="text-xs text-muted-foreground mb-2">Full evidence chain</p>
                <a href="/pricing">
                  <button className="flex items-center gap-2 text-[#101828] text-sm font-bold px-4 py-2 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity">
                    <Zap size={13} /> Unlock Pro
                  </button>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Signal Breakdown + Key Levels ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <SignalBreakdown
          bull={data.bullishSignals}
          bear={data.bearishSignals}
          neutral={data.neutralSignals}
        />
        <KeyLevelsChart
          price={data.price}
          support={data.supportLevels}
          resistance={data.resistanceLevels}
          invalidation={data.invalidation}
        />
      </div>

      {/* ── Catalysts vs Risks ── */}
      <CatalystsRisks catalysts={data.catalysts} risks={data.risks} />

      {/* ── Kai's Analysis ── */}
      {data.kaiParagraphs && data.kaiParagraphs.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                 style={{ background: "linear-gradient(135deg, #00AEEF, #0080B0)" }}>
              <span className="text-white text-xs font-bold">K</span>
            </div>
            <div>
              <p className="font-bold text-sm text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                Kai's Take on {data.ticker}
              </p>
              <p className="text-[11px] text-muted-foreground">Updated daily · Plain English breakdown</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {data.kaiParagraphs.map((para: string, i: number) => (
              <p key={i} className="text-sm text-foreground leading-relaxed">{para}</p>
            ))}
          </div>

          {/* Key levels mini grid */}
          {(data.supportLevels.length > 0 || data.resistanceLevels.length > 0 || data.invalidation) && (
            <div className="border-t border-border px-5 py-4 grid grid-cols-3 gap-3">
              {[
                { label: "Support", values: data.supportLevels.map((v: number) => `$${v}`), color: "#4DC820" },
                { label: "Resistance", values: data.resistanceLevels.map((v: number) => `$${v}`), color: "#E8193C" },
                { label: "Invalidation", values: data.invalidation ? [`$${data.invalidation}`] : [], color: "#F79009" },
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
      )}

      {/* ── Evidence Chain ── */}
      {data.evidenceChain && data.evidenceChain.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <button
            onClick={() => setEvidenceOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-muted-foreground" />
              <span className="font-bold text-sm text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                Evidence Chain
              </span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                {data.evidenceChain.length} signals
              </span>
              {!isPro && <Lock size={12} className="text-[#98A2B3]" />}
            </div>
            {evidenceOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
          </button>
          {evidenceOpen && (
            <div className="border-t border-border p-4 space-y-3">
              {data.evidenceChain.map((item: any, i: number) => (
                <EvidenceCard key={i} item={item} isPaid={isPro || i === 0} />
              ))}
              {!isPro && data.evidenceChain.length > 1 && (
                <div className="text-center py-3">
                  <p className="text-sm text-muted-foreground mb-3">{data.evidenceChain.length - 1} more signals locked.</p>
                  <a href="/pricing">
                    <button className="flex items-center gap-2 text-[#101828] text-sm font-bold px-5 py-2 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity mx-auto">
                      <Zap size={13} /> Unlock Full Evidence Chain
                    </button>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Who's talking ── */}
      {data.videosMentioning && data.videosMentioning.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <button
            onClick={() => setWhoOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-2">
              <Users size={14} className="text-muted-foreground" />
              <span className="font-bold text-sm text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                Who's talking about this?
              </span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                {data.videosMentioning.length} videos
              </span>
            </div>
            {whoOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
          </button>
          {whoOpen && (
            <div className="border-t border-border p-4">
              <div className="scroll-row">
                {data.videosMentioning.map((v: any) => (
                  <VideoCard key={v.id} {...v} compact />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Related Tickers ── */}
      {data.relatedTickers && data.relatedTickers.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold text-sm text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
            Related Tickers
          </p>
          <div className="flex gap-2 flex-wrap">
            {data.relatedTickers.map((t: string) => (
              <button key={t}
                className="ticker-mono text-sm bg-muted border border-border px-3 py-1.5 rounded-lg text-muted-foreground hover:border-[#4DC820] hover:text-[#4DC820] transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Radar Pill ───────────────────────────────────────────────────────────────

function RadarPill({ t, onClick }: { t: any; onClick: () => void }) {
  const isBull = t.direction === "Bullish";
  const isBear = t.direction === "Bearish";
  const scoreColor = t.score >= 70 ? "#4DC820" : t.score >= 50 ? "#F79009" : "#E8193C";

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-full border border-border bg-card hover:border-[#4DC820]/60 hover:shadow-sm transition-all group"
    >
      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
            style={{ background: scoreColor }}>
        {t.score}
      </span>
      <span className="ticker-mono text-sm font-bold text-foreground group-hover:text-[#4DC820] transition-colors">
        {t.ticker}
      </span>
      <span className="text-[11px] font-semibold"
            style={{ color: isBull ? "#4DC820" : isBear ? "#E8193C" : "#F79009" }}>
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

          <div className="container mx-auto py-14 relative">
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
                   style={{ background: "rgba(0,174,239,0.12)", border: "1px solid rgba(0,174,239,0.25)" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-[#00AEEF] animate-pulse" />
                <span className="text-[11px] font-semibold tracking-wide" style={{ color: "#00AEEF" }}>
                  LIVE · 6 AGENTS ACTIVE
                </span>
              </div>

              <h1 className="text-4xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-display)" }}>
                What's the signal on any ticker?
              </h1>
              <p className="text-sm mb-8 leading-relaxed" style={{ color: "#98A2B3" }}>
                Kai cross-references news, options flow, macro, insider activity, earnings, and curated content into a single convergence score.
              </p>

              <div className="flex gap-2 max-w-md mx-auto mb-4">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#98A2B3" }} />
                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    placeholder="Enter ticker symbol (e.g. PLTR)"
                    className="w-full pl-11 pr-4 py-3.5 text-sm rounded-xl outline-none ticker-mono border bg-white/95 text-[#101828] placeholder-[#98A2B3] focus:ring-2 focus:ring-[#4DC820]/40 transition-all font-semibold"
                    style={{ borderColor: "#EAECF0" }}
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="text-[#101828] text-sm font-bold px-6 py-3.5 rounded-xl cc-gradient-bg hover:opacity-90 transition-opacity flex items-center gap-2 flex-shrink-0"
                >
                  Analyze <ArrowRight size={14} />
                </button>
              </div>

              <p className="text-xs" style={{ color: "#667085" }}>
                Popular:{" "}
                {["PLTR", "NFLX", "AMZN", "AVGO", "SOXL", "SPY"].map(t => (
                  <button key={t} onClick={() => { setQuery(t); setSearched(t); }}
                          className="hover:text-[#4DC820] transition-colors ticker-mono font-semibold mx-1">
                    {t}
                  </button>
                ))}
              </p>
            </div>
          </div>

          {/* ── Horizontal Radar Strip ── */}
          {radarTickers.length > 0 && (
            <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.2)" }}>
              <div className="container mx-auto py-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-[#4DC820] animate-pulse" />
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#667085" }}>
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

        {/* ── Content Area ── */}
        <div className="container mx-auto py-8">
          {searched ? (
            <TickerDetail ticker={searched} isPro={false} />
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-5 border border-border">
                <BarChart2 size={32} className="text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>
                Enter a ticker to get the full signal
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Score, direction, key levels, catalysts, risks, and Kai's plain-English take — all in one view.
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
