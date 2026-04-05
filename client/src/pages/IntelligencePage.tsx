// CheatCode OS — Intelligence Page v3
// Design: Hero search bar front-and-center. Horizontal radar pill strip below.
// Ticker detail: data-visual-first — donut score, signal bar chart, price chart,
// key levels visual, catalysts vs risks comparison. Comprehensive but clean.
// Robinhood-meets-Bloomberg aesthetic. Dark hero, light content area.

import { useState, useEffect, useRef } from "react";
import {
  Search, Lock, Zap, ArrowRight, TrendingUp, TrendingDown,
  Minus, ChevronDown, ChevronUp, BarChart2, Activity,
  Target, AlertTriangle, BookOpen, Users
} from "lucide-react";
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie, Legend, ReferenceLine,
  AreaChart, Area, CartesianGrid
} from "recharts";
import { ScoreRing } from "@/components/shared/ScoreRing";
import { VideoCard } from "@/components/shared/VideoCard";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { fetchTicker, fetchRadar } from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "";
}

function normalizeTicker(d: any) {
  if (!d) return null;
  const pct = d.price_change_pct ?? 0;
  return {
    ...d,
    ticker: d.symbol || d.ticker,
    score: d.convergence_score ?? d.score ?? 0,
    direction: cap(d.direction || "neutral"),
    timeframe: cap(d.timeframe || "swing"),
    confidence: cap(d.confidence || "medium"),
    price: d.last_price ? d.last_price : null,
    priceFormatted: d.last_price ? `$${d.last_price.toFixed(2)}` : "N/A",
    change: pct >= 0 ? `+${pct.toFixed(2)}` : pct.toFixed(2),
    changePercent: pct >= 0 ? `+${pct.toFixed(2)}%` : `${pct.toFixed(2)}%`,
    theme: (d.themes || [])[0] || "",
    themes: d.themes || [],
    evidenceChain: (d.evidence_chain || []).map((e: any) => ({
      source: e.source || "Unknown",
      signal: e.signal || "",
      detail: e.signal || e.detail || "",
      date: e.timestamp ? new Date(e.timestamp).toLocaleDateString() : "Recent",
    })),
    invalidationLevel: d.key_levels?.invalidation || null,
    supportLevels: d.key_levels?.support || [],
    resistanceLevels: d.key_levels?.resistance || [],
    catalysts: d.catalysts || [],
    risks: d.risks || [],
    videosMentioning: d.related_content || [],
    relatedTickers: d.related_tickers || [],
    daily_analysis: d.daily_analysis,
    key_levels: d.key_levels,
    bullish_signals: d.bullish_signals ?? 0,
    bearish_signals: d.bearish_signals ?? 0,
    neutral_signals: d.neutral_signals ?? 0,
  };
}

// ─── Score Donut ──────────────────────────────────────────────────────────────

function ScoreDonut({ score, direction }: { score: number; direction: string }) {
  const isBull = direction === "Bullish";
  const isBear = direction === "Bearish";
  const color = isBull ? "#4DC820" : isBear ? "#E8193C" : "#F79009";
  const data = [
    { name: "score", value: score, fill: color },
    { name: "rest", value: 100 - score, fill: "transparent" },
  ];

  return (
    <div className="relative w-32 h-32 flex-shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={44}
            outerRadius={56}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)", color }}>
          {score}
        </span>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Score</span>
      </div>
    </div>
  );
}

// ─── Signal Bar Chart ─────────────────────────────────────────────────────────

function SignalBreakdown({ bullish, bearish, neutral }: { bullish: number; bearish: number; neutral: number }) {
  const total = bullish + bearish + neutral || 1;
  const data = [
    { name: "Bullish", value: bullish, color: "#4DC820" },
    { name: "Bearish", value: bearish, color: "#E8193C" },
    { name: "Neutral", value: neutral, color: "#F79009" },
  ];

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Signal Breakdown</p>
      <div className="flex items-end gap-3 h-24 mb-3">
        {data.map(d => (
          <div key={d.name} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs font-bold text-foreground">{d.value}</span>
            <div className="w-full rounded-t-lg transition-all duration-500"
                 style={{ height: `${Math.max((d.value / Math.max(bullish, bearish, neutral, 1)) * 72, 4)}px`, background: d.color, opacity: 0.9 }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        {data.map(d => (
          <span key={d.name} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
            {d.name}
          </span>
        ))}
      </div>
      {/* Stacked bar */}
      <div className="mt-3 h-2 rounded-full overflow-hidden flex">
        <div style={{ width: `${(bullish / total) * 100}%`, background: "#4DC820" }} />
        <div style={{ width: `${(neutral / total) * 100}%`, background: "#F79009" }} />
        <div style={{ width: `${(bearish / total) * 100}%`, background: "#E8193C" }} />
      </div>
    </div>
  );
}

// ─── Key Levels Visual ────────────────────────────────────────────────────────

function KeyLevelsChart({ price, support, resistance, invalidation }: {
  price: number | null;
  support: number[];
  resistance: number[];
  invalidation: string | null;
}) {
  if (!price && support.length === 0 && resistance.length === 0) return null;

  const allLevels = [
    ...support.map(l => ({ level: l, type: "support" })),
    ...resistance.map(l => ({ level: l, type: "resistance" })),
    ...(price ? [{ level: price, type: "price" }] : []),
  ].sort((a, b) => a.level - b.level);

  const min = Math.min(...allLevels.map(l => l.level)) * 0.97;
  const max = Math.max(...allLevels.map(l => l.level)) * 1.03;
  const range = max - min;

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Key Price Levels</p>
      <div className="relative h-48">
        {/* Y-axis line */}
        <div className="absolute left-16 top-0 bottom-0 w-px bg-border" />

        {allLevels.map((l, i) => {
          const pct = range > 0 ? ((l.level - min) / range) * 100 : 50;
          const top = 100 - pct; // invert so higher price = higher on chart
          const color = l.type === "support" ? "#4DC820" : l.type === "resistance" ? "#E8193C" : "#00AEEF";
          const label = l.type === "support" ? "Support" : l.type === "resistance" ? "Resistance" : "Current";

          return (
            <div key={i} className="absolute flex items-center gap-2 w-full"
                 style={{ top: `${Math.min(Math.max(top, 2), 90)}%`, transform: "translateY(-50%)" }}>
              <span className="text-[11px] font-semibold text-right w-14 flex-shrink-0" style={{ color }}>
                {label}
              </span>
              <div className="flex-1 h-px border-t-2 border-dashed" style={{ borderColor: color, opacity: l.type === "price" ? 1 : 0.6 }} />
              <span className="text-[11px] font-bold flex-shrink-0" style={{ color, fontFamily: "var(--font-mono)" }}>
                ${l.level.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
      {invalidation && (
        <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg"
             style={{ background: "#FFF0F3", border: "1px solid #F8A3B1" }}>
          <AlertTriangle size={12} style={{ color: "#E8193C" }} />
          <span className="text-xs font-medium" style={{ color: "#A8001F" }}>
            Invalidation: {invalidation}
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
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#2E7A10" }}>Catalysts</p>
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
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#A8001F" }}>Risks</p>
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
        <p className="text-sm text-muted-foreground">Try NVDA, KKR, CCJ, AMD, or NFLX</p>
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
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${dirColor}, ${dirColor}88)` }} />
        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Score donut */}
            <ScoreDonut score={data.score} direction={data.direction} />

            {/* Main info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="ticker-mono text-4xl font-bold text-foreground">{data.ticker}</span>
                <span className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full"
                      style={{ background: dirBg, color: dirColor }}>
                  <DirectionIcon size={13} />
                  {data.direction}
                </span>
                {data.theme && (
                  <span className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted text-muted-foreground">
                    {data.theme}
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-3 mb-3">
                <span className="ticker-mono text-2xl font-bold text-foreground">{data.priceFormatted}</span>
                <span className="text-base font-semibold" style={{ color: data.changePercent.startsWith("+") ? "#4DC820" : "#E8193C" }}>
                  {data.change} ({data.changePercent})
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                {[
                  { label: "Timeframe", value: data.timeframe },
                  { label: "Confidence", value: data.confidence },
                  { label: "Signals", value: `${data.bullish_signals + data.bearish_signals + data.neutral_signals} total` },
                ].map(s => (
                  <div key={s.label} className="text-center px-3 py-2 rounded-xl bg-muted border border-border">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
                    <p className="text-sm font-bold text-foreground">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pro unlock */}
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
          bullish={data.bullish_signals}
          bearish={data.bearish_signals}
          neutral={data.neutral_signals}
        />
        <KeyLevelsChart
          price={data.price}
          support={data.supportLevels}
          resistance={data.resistanceLevels}
          invalidation={data.invalidationLevel}
        />
      </div>

      {/* ── Catalysts vs Risks ── */}
      <CatalystsRisks catalysts={data.catalysts} risks={data.risks} />

      {/* ── Kai's Daily Analysis ── */}
      {data.daily_analysis && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                 style={{ background: "linear-gradient(135deg, #00AEEF, #0080B0)" }}>
              <span className="text-white text-xs font-bold">K</span>
            </div>
            <div>
              <p className="font-bold text-sm text-foreground" style={{ fontFamily: "var(--font-display)" }}>Kai's Daily Analysis</p>
              <p className="text-[11px] text-muted-foreground">Updated daily · AI-generated synthesis</p>
            </div>
          </div>
          <div className="p-5">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{data.daily_analysis}</p>

            {data.key_levels && (
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  { label: "Support", values: data.key_levels.support || [], color: "#4DC820" },
                  { label: "Resistance", values: data.key_levels.resistance || [], color: "#E8193C" },
                  { label: "Invalidation", values: data.invalidationLevel ? [data.invalidationLevel] : [], color: "#F79009" },
                ].map(k => (
                  <div key={k.label} className="rounded-xl bg-muted border border-border p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: k.color }}>
                      {k.label}
                    </p>
                    <p className="text-sm font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                      {k.values.length > 0
                        ? k.values.map((v: number | string) => typeof v === "number" ? `$${v}` : v).join(" / ")
                        : "N/A"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Evidence Chain ── */}
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
            {(data.evidenceChain || []).map((item: any, i: number) => (
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
      className="flex-shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-border bg-card hover:border-[#4DC820]/60 hover:shadow-sm transition-all group"
    >
      {/* Score badge */}
      <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
            style={{ background: scoreColor }}>
        {t.score}
      </span>
      {/* Ticker */}
      <span className="ticker-mono text-sm font-bold text-foreground group-hover:text-[#4DC820] transition-colors">
        {t.ticker}
      </span>
      {/* Direction arrow */}
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
  const inputRef = useRef<HTMLInputElement>(null);

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
          timeframe: t.timeframe ? cap(t.timeframe) : "Swing",
          confidence: t.confidence ? cap(t.confidence) : "Watch",
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
        <div className="relative overflow-hidden" style={{ background: "linear-gradient(160deg, #1a2035 0%, #2B3245 60%, #1a2035 100%)" }}>
          {/* Spectrum line */}
          <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #E8193C 0%, #00AEEF 33%, #7B2FBE 66%, #4DC820 100%)" }} />

          {/* Subtle grid pattern */}
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

              {/* Search bar */}
              <div className="flex gap-2 max-w-md mx-auto mb-4">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#667085" }} />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    placeholder="Enter ticker symbol (e.g. NVDA)"
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
                Popular: {["NVDA", "KKR", "CCJ", "AMD", "NFLX", "PLTR"].map((t, i) => (
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
                  <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 flex-1">
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
                Score, direction, key levels, catalysts, risks, and evidence chain — all in one view.
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
