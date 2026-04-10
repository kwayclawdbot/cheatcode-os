// CheatCode OS — Ticker Dossier Page (/tickers/:symbol/analyze)
// Comprehensive mini-dashboard: news, fundamentals, earnings, videos, alerts,
// intel connections, community — all visualized, zero paragraphs.

import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft, TrendingUp, TrendingDown, Zap, Shield, AlertTriangle,
  Play, Calendar, Brain, Flame, BarChart2, Activity, Target,
  DollarSign, Newspaper, Users, GitBranch, ArrowUpRight, ExternalLink,
} from "lucide-react";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { TickerLogo } from "@/components/intelligence/TickerLogo";
import { triggerTickerAnalysis } from "@/lib/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function pctStr(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function sentimentColor(s: string | null | undefined): string {
  if (!s) return "#F79009";
  const lower = typeof s === "string" ? s.toLowerCase() : "";
  if (lower === "bullish" || lower === "positive" || (typeof s === "number" && s > 0)) return "#4DC820";
  if (lower === "bearish" || lower === "negative" || (typeof s === "number" && s < 0)) return "#E8193C";
  return "#F79009";
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-muted rounded-xl p-3 text-center">
      <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-black text-foreground" style={{ fontFamily: "var(--font-mono)", color }}>{value}</p>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TickerAnalyzePage() {
  const params = useParams<{ symbol: string }>();
  const symbol = (params.symbol || "").toUpperCase();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    triggerTickerAnalysis(symbol)
      .then(setData)
      .catch((e: any) => setError(e?.message || "Dossier unavailable"))
      .finally(() => setLoading(false));
  }, [symbol]);

  const chg = data?.price_change_pct || 0;
  const isBull = (data?.direction || "").toLowerCase() === "bullish";
  const isBear = (data?.direction || "").toLowerCase() === "bearish";
  const dirColor = isBull ? "#4DC820" : isBear ? "#E8193C" : "#F79009";
  const fund = data?.fundamentals;
  const kai = data?.kai_analysis;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Nav />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link href={`/tickers/${symbol}`}>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5">
            <ArrowLeft size={14} /> Back to ${symbol}
          </button>
        </Link>

        {/* Loading */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="inline-flex items-center gap-3 bg-card rounded-2xl border border-border px-8 py-6">
              <div className="w-8 h-8 border-3 border-[#4DC820]/30 border-t-[#4DC820] rounded-full animate-spin" />
              <div className="text-left">
                <p className="text-sm font-bold text-foreground">Building dossier for ${symbol}</p>
                <p className="text-xs text-muted-foreground">Pulling news, fundamentals, earnings, alerts, community data...</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-full bg-[#E8193C18] flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={20} style={{ color: "#E8193C" }} />
            </div>
            <p className="font-bold text-foreground mb-1">Dossier unavailable</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        {/* Dossier */}
        {data && !loading && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

            {/* ── HERO ── */}
            <div className="rounded-2xl border border-border p-5" style={{ background: dirColor + "06" }}>
              <div className="flex items-start gap-4">
                <TickerLogo symbol={symbol} size={48} className="rounded-xl flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-2xl font-black text-foreground" style={{ fontFamily: "var(--font-mono)" }}>${symbol}</span>
                    {data.name && <span className="text-sm text-muted-foreground">{data.name}</span>}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: dirColor }}>
                      {data.direction || "Neutral"}
                    </span>
                    {data.sector && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{data.sector}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                      ${(data.last_price || 0).toFixed(2)}
                    </span>
                    <span className="text-sm font-bold flex items-center gap-0.5" style={{ color: chg >= 0 ? "#4DC820" : "#E8193C" }}>
                      {chg >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                      {chg >= 0 ? "+" : ""}{chg.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="text-center flex-shrink-0">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Score</p>
                  <p className="text-3xl font-black" style={{ color: dirColor, fontFamily: "var(--font-mono)" }}>{data.convergence_score || 0}</p>
                </div>
              </div>
            </div>

            {/* ── KAI TLDR ── */}
            {kai?.tldr && (
              <div className="bg-card rounded-xl border border-border p-4 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ background: "#4DC820" }}>K</div>
                <p className="text-sm font-bold text-foreground leading-relaxed">{kai.tldr}</p>
              </div>
            )}

            {/* ── TWO COLUMN: Score Breakdown + Fundamentals ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Score breakdown */}
              {data.score_breakdown && Object.values(data.score_breakdown).some((v: any) => v > 0) && (
                <div className="bg-card rounded-xl border border-border p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-3">Score Breakdown</p>
                  <div className="space-y-2">
                    {[
                      { key: "technical", label: "Technical", max: 25, color: "#00AEEF" },
                      { key: "momentum", label: "Momentum", max: 25, color: "#4DC820" },
                      { key: "volume", label: "Volume", max: 25, color: "#7B2FBE" },
                      { key: "sector", label: "Sector", max: 10, color: "#F79009" },
                      { key: "catalyst", label: "Catalyst", max: 25, color: "#E8193C" },
                      { key: "content", label: "Content", max: 25, color: "#00AEEF" },
                      { key: "flow", label: "Flow", max: 25, color: "#7B2FBE" },
                    ].filter(b => (data.score_breakdown[b.key] || 0) > 0).map(b => {
                      const val = data.score_breakdown[b.key] || 0;
                      const pct = Math.min(100, (val / b.max) * 100);
                      return (
                        <div key={b.key} className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-muted-foreground w-16 text-right">{b.label}</span>
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: b.color }} />
                          </div>
                          <span className="text-[10px] font-black text-foreground w-10 text-right" style={{ fontFamily: "var(--font-mono)" }}>{val}/{b.max}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fundamentals grid */}
              {fund && (
                <div className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign size={14} style={{ color: "#00AEEF" }} />
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Fundamentals</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {fund.market_cap && <MetricCard label="Market Cap" value={formatMoney(fund.market_cap)} />}
                    {fund.pe_ratio && <MetricCard label="P/E" value={fund.pe_ratio.toFixed(1)} />}
                    {fund.eps && <MetricCard label="EPS" value={`$${fund.eps.toFixed(2)}`} />}
                    {fund.analyst_target && <MetricCard label="Target" value={`$${fund.analyst_target.toFixed(0)}`} color="#4DC820" />}
                    {fund.high_52w && <MetricCard label="52W High" value={`$${fund.high_52w.toFixed(0)}`} />}
                    {fund.low_52w && <MetricCard label="52W Low" value={`$${fund.low_52w.toFixed(0)}`} />}
                    {fund.beta && <MetricCard label="Beta" value={fund.beta.toFixed(2)} />}
                    {fund.short_ratio && <MetricCard label="Short Ratio" value={fund.short_ratio.toFixed(1)} />}
                    {fund.quarterly_revenue_growth != null && <MetricCard label="Rev Growth" value={pctStr(fund.quarterly_revenue_growth)} color={fund.quarterly_revenue_growth > 0 ? "#4DC820" : "#E8193C"} />}
                    {fund.quarterly_earnings_growth != null && <MetricCard label="EPS Growth" value={pctStr(fund.quarterly_earnings_growth)} color={fund.quarterly_earnings_growth > 0 ? "#4DC820" : "#E8193C"} />}
                    {fund.profit_margin != null && <MetricCard label="Margin" value={pctStr(fund.profit_margin)} />}
                    {fund.roe != null && <MetricCard label="ROE" value={pctStr(fund.roe)} />}
                  </div>
                </div>
              )}
            </div>

            {/* ── DRIVERS ── */}
            {data.drivers?.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-3">What's Driving This</p>
                <div className="space-y-1.5">
                  {data.drivers.map((d: any, i: number) => {
                    const iconColor = d.type === "momentum" ? "#4DC820" : d.type === "volume" ? "#7B2FBE" : d.type === "sector" ? "#F79009" : d.type === "theme" ? "#E8193C" : "#00AEEF";
                    return (
                      <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted">
                        <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: iconColor + "18", color: iconColor }}>
                          {d.type === "momentum" ? (d.icon === "trending-down" ? <TrendingDown size={11} /> : <TrendingUp size={11} />) :
                           d.type === "volume" ? <BarChart2 size={11} /> :
                           d.type === "theme" ? <Flame size={11} /> :
                           <Activity size={11} />}
                        </div>
                        <span className="text-xs text-foreground">{d.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── NEWS ── */}
            {data.news?.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Newspaper size={14} style={{ color: "#00AEEF" }} />
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Recent News</p>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
                  {data.news.map((n: any, i: number) => (
                    <a key={i} href={n.link} target="_blank" rel="noopener noreferrer"
                       className="flex-shrink-0 w-56 bg-muted rounded-xl p-3 border border-transparent hover:border-border transition-all cursor-pointer group">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[9px] text-muted-foreground">{n.date}</span>
                        {n.sentiment != null && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ background: sentimentColor(n.sentiment > 0 ? "bullish" : n.sentiment < 0 ? "bearish" : "neutral") + "18",
                                         color: sentimentColor(n.sentiment > 0 ? "bullish" : n.sentiment < 0 ? "bearish" : "neutral") }}>
                            {n.sentiment > 0 ? "Bullish" : n.sentiment < 0 ? "Bearish" : "Neutral"}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-bold text-foreground line-clamp-3 leading-tight">{n.title}</p>
                      <div className="flex items-center gap-1 mt-1.5 text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink size={9} /> Read
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* ── KAI ANALYSIS: Key Levels + Catalysts/Risks ── */}
            {kai && (
              <>
                {/* Key levels ladder */}
                {kai.key_levels && (
                  <div className="bg-card rounded-xl border border-border p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-3">Key Levels</p>
                    <div className="space-y-2">
                      {(() => {
                        const levels: { label: string; value: any; color: string }[] = [];
                        const res = kai.key_levels.resistance;
                        const sup = kai.key_levels.support;
                        const inv = kai.key_levels.invalidation;
                        (Array.isArray(res) ? res : res != null ? [res] : []).forEach((v: number, i: number) =>
                          levels.push({ label: i === 0 ? "Resistance" : `R${i+1}`, value: v, color: "#E8193C" })
                        );
                        (Array.isArray(sup) ? sup : sup != null ? [sup] : []).forEach((v: number, i: number) =>
                          levels.push({ label: i === 0 ? "Support" : `S${i+1}`, value: v, color: "#4DC820" })
                        );
                        if (inv) levels.push({ label: "Invalidation", value: inv, color: "#F79009" });
                        return levels.map((l, i) => (
                          <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: l.color }} />
                            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground w-20">{l.label}</span>
                            <span className="text-sm font-black text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                              {typeof l.value === "number" ? `$${l.value.toFixed(2)}` : String(l.value)}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {/* Catalysts + Risks side by side */}
                {((kai.catalysts?.length > 0) || (kai.risks?.length > 0)) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {kai.catalysts?.length > 0 && (
                      <div className="bg-card rounded-xl border border-border p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Zap size={14} style={{ color: "#4DC820" }} />
                          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Catalysts</p>
                        </div>
                        <div className="space-y-1.5">
                          {kai.catalysts.map((c: string, i: number) => (
                            <div key={i} className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#4DC820" }} />
                              <span className="text-xs text-foreground">{c}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {kai.risks?.length > 0 && (
                      <div className="bg-card rounded-xl border border-border p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Shield size={14} style={{ color: "#E8193C" }} />
                          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Risks</p>
                        </div>
                        <div className="space-y-1.5">
                          {kai.risks.map((r: string, i: number) => (
                            <div key={i} className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#E8193C" }} />
                              <span className="text-xs text-foreground">{r}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── TRACK RECORD ── */}
            {data.track_record?.alerts?.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target size={14} style={{ color: "#00AEEF" }} />
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Our Track Record</p>
                  </div>
                  {data.track_record.setup_win_rate != null && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                          style={{ background: data.track_record.setup_win_rate >= 60 ? "#4DC820" : "#F79009" }}>
                      {data.track_record.setup_win_rate}% win rate
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {data.track_record.alerts.map((a: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted">
                      <span className="text-[10px] text-muted-foreground w-16 flex-shrink-0">{a.date}</span>
                      <span className="text-xs font-black text-foreground" style={{ fontFamily: "var(--font-mono)" }}>${a.price?.toFixed(2)}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-card text-muted-foreground border border-border">Score {a.score}</span>
                      {a.pattern && <span className="text-[9px] text-muted-foreground">{a.pattern}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── EARNINGS ── */}
            {data.earnings && (data.earnings.next_date || data.earnings.last_signal) && (
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={14} style={{ color: "#7B2FBE" }} />
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Earnings</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  {data.earnings.next_date && (
                    <div className="bg-muted rounded-lg px-3 py-1.5">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Next</p>
                      <p className="text-xs font-bold text-foreground">{data.earnings.next_date}</p>
                    </div>
                  )}
                  {data.earnings.last_signal && (
                    <span className="text-[9px] font-bold px-2 py-1 rounded-full text-white"
                          style={{ background: data.earnings.last_signal === "BUY" ? "#4DC820" : "#E8193C" }}>
                      {data.earnings.last_signal}
                    </span>
                  )}
                </div>
                {data.earnings.flags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {data.earnings.flags.map((f: any, i: number) => (
                      <span key={i} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: f.type === "green" ? "#4DC82018" : "#E8193C18", color: f.type === "green" ? "#4DC820" : "#E8193C" }}>
                        {f.type === "green" ? "+" : "−"} {f.text}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── INTEL CONNECTIONS (cross-ticker graph) ── */}
            {data.intel_connections?.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <GitBranch size={14} style={{ color: "#7B2FBE" }} />
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Intel Connections</p>
                </div>
                <div className="space-y-2">
                  {data.intel_connections.map((c: any, i: number) => (
                    <div key={i} className="px-3 py-2 rounded-lg bg-muted">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: sentimentColor(c.direction) + "18", color: sentimentColor(c.direction) }}>
                          {c.direction}
                        </span>
                        <span className="text-xs font-bold text-foreground">{c.headline}</span>
                      </div>
                      {c.other_tickers?.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] text-muted-foreground">Linked:</span>
                          {c.other_tickers.map((t: string) => (
                            <Link key={t} href={`/tickers/${t}`}>
                              <span className="text-[9px] font-black px-1 py-0.5 rounded bg-background border border-border hover:border-[#4DC820] transition-colors cursor-pointer"
                                    style={{ fontFamily: "var(--font-mono)" }}>${t}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── VIDEOS ── */}
            {data.videos?.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Play size={14} style={{ color: "#E8193C" }} />
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Videos mentioning ${symbol}</p>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
                  {data.videos.map((v: any) => (
                    <Link key={v.id} href={`/video/${v.id}`}>
                      <div className="flex-shrink-0 w-52 bg-muted rounded-xl overflow-hidden border border-transparent hover:border-border transition-all cursor-pointer group">
                        <div className="relative aspect-video bg-background">
                          {v.thumbnail_url && <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" />}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play size={16} className="text-white" />
                          </div>
                          {v.duration_seconds && (
                            <span className="absolute bottom-1 right-1 text-[9px] font-bold bg-black/80 text-white px-1 py-0.5 rounded">
                              {Math.floor(v.duration_seconds / 60)}:{String(v.duration_seconds % 60).padStart(2, "0")}
                            </span>
                          )}
                          {v.sentiment && (
                            <span className="absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                                  style={{ background: sentimentColor(v.sentiment) }}>{v.sentiment}</span>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="text-[10px] font-bold text-foreground line-clamp-2 leading-tight">{v.title}</p>
                          {v.creator_name && <p className="text-[9px] text-muted-foreground mt-0.5">{v.creator_name}</p>}
                          {v.mention_context && (
                            <p className="text-[9px] text-muted-foreground mt-1 line-clamp-2 italic">"{v.mention_context}"</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ── COMMUNITY POSTS ── */}
            {data.community_posts?.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={14} style={{ color: "#4DC820" }} />
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Community on ${symbol}</p>
                </div>
                <div className="space-y-2">
                  {data.community_posts.map((p: any, i: number) => (
                    <div key={i} className="px-3 py-2 rounded-lg bg-muted">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-bold text-foreground">{p.author}</span>
                        {p.is_agent && <span className="text-[8px] font-bold px-1 py-0.5 rounded-full text-white" style={{ background: "#7B2FBE" }}>AI</span>}
                        {p.sentiment && (
                          <span className="text-[9px] font-bold" style={{ color: sentimentColor(p.sentiment) }}>
                            {p.sentiment === "bullish" ? "🔥" : p.sentiment === "bearish" ? "🐻" : "👀"} {p.sentiment}
                          </span>
                        )}
                        <span className="text-[9px] text-muted-foreground ml-auto">{p.likes > 0 ? `${p.likes} likes` : ""}</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{p.body}</p>
                    </div>
                  ))}
                </div>
                <Link href={`/tickers/${symbol}`}>
                  <button className="w-full text-[10px] font-bold py-2 mt-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1">
                    View all posts <ArrowUpRight size={9} />
                  </button>
                </Link>
              </div>
            )}

            {/* ── THEMES ── */}
            {data.themes?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {data.themes.map((t: string, i: number) => (
                  <span key={i} className="text-[9px] font-bold px-2 py-1 rounded-full flex items-center gap-1"
                        style={{ background: "#F7900918", color: "#F79009" }}>
                    <Flame size={10} /> {t}
                  </span>
                ))}
              </div>
            )}

          </motion.div>
        )}
      </div>
      <KaiChat />
    </div>
  );
}
