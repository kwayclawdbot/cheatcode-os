// CheatCode OS — Ticker Analysis Page (/tickers/:symbol/analyze)
// Full Kai analysis with visual components — zero paragraphs, all structured data.
// Triggers on-demand generation if no cached analysis, otherwise shows cached.

import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft, TrendingUp, TrendingDown, Zap, Shield, AlertTriangle,
  Play, Calendar, Brain, Flame, BarChart2, Activity, ArrowUpRight,
  Target, ChevronDown,
} from "lucide-react";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { TickerLogo } from "@/components/intelligence/TickerLogo";
import { triggerTickerAnalysis } from "@/lib/api";

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
      .catch((e: any) => setError(e?.message || "Analysis unavailable"))
      .finally(() => setLoading(false));
  }, [symbol]);

  const chg = data?.price_change_pct || 0;
  const isBull = (data?.direction || "").toLowerCase() === "bullish";
  const isBear = (data?.direction || "").toLowerCase() === "bearish";
  const dirColor = isBull ? "#4DC820" : isBear ? "#E8193C" : "#F79009";

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Nav />
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back */}
        <Link href={`/tickers/${symbol}`}>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5">
            <ArrowLeft size={14} /> Back to ${symbol}
          </button>
        </Link>

        {/* Loading state */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="inline-flex items-center gap-3 bg-card rounded-2xl border border-border px-8 py-6">
              <div className="w-8 h-8 border-3 border-[#4DC820]/30 border-t-[#4DC820] rounded-full animate-spin" />
              <div className="text-left">
                <p className="text-sm font-bold text-foreground">Kai is analyzing ${symbol}</p>
                <p className="text-xs text-muted-foreground">Pulling market data, news, and earning signals...</p>
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
            <p className="font-bold text-foreground mb-1">Analysis unavailable</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Link href={`/tickers/${symbol}`}>
              <button className="text-sm font-bold px-4 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-colors">
                Back to ${symbol}
              </button>
            </Link>
          </div>
        )}

        {/* Analysis content */}
        {data && !loading && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

            {/* Hero header */}
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
                  </div>
                  {data.last_price != null && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                        ${data.last_price?.toFixed(2)}
                      </span>
                      <span className="text-sm font-bold flex items-center gap-0.5" style={{ color: chg >= 0 ? "#4DC820" : "#E8193C" }}>
                        {chg >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {chg >= 0 ? "+" : ""}{chg.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-bold" style={{ background: "#4DC820" }}>K</div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Kai Analysis</span>
                    {data.sector && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{data.sector}</span>}
                  </div>
                </div>
                {data.convergence_score != null && (
                  <div className="text-center flex-shrink-0">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Score</p>
                    <p className="text-3xl font-black" style={{ color: dirColor, fontFamily: "var(--font-mono)" }}>{data.convergence_score}</p>
                  </div>
                )}
              </div>
            </div>

            {/* TLDR */}
            {data.catalyst && (
              <div className="bg-card rounded-xl border border-border p-4 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ background: "#4DC820" }}>K</div>
                <p className="text-sm font-bold text-foreground leading-relaxed">{data.catalyst}</p>
              </div>
            )}

            {/* Key levels — visual price ladder */}
            {data.key_levels && (
              <div className="bg-card rounded-xl border border-border p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-3">Key Levels</p>
                <div className="space-y-2">
                  {(() => {
                    const levels: { label: string; value: any; color: string; icon: any }[] = [];
                    const res = data.key_levels.resistance;
                    const sup = data.key_levels.support;
                    const inv = data.key_levels.invalidation;
                    // Resistance levels
                    (Array.isArray(res) ? res : res != null ? [res] : []).forEach((v: number, i: number) =>
                      levels.push({ label: i === 0 ? "Resistance" : `R${i+1}`, value: v, color: "#E8193C", icon: <TrendingUp size={12} /> })
                    );
                    // Support levels
                    (Array.isArray(sup) ? sup : sup != null ? [sup] : []).forEach((v: number, i: number) =>
                      levels.push({ label: i === 0 ? "Support" : `S${i+1}`, value: v, color: "#4DC820", icon: <TrendingDown size={12} /> })
                    );
                    // Invalidation
                    if (inv) levels.push({ label: "Invalidation", value: inv, color: "#F79009", icon: <AlertTriangle size={12} /> });
                    return levels.map((l, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: l.color + "18", color: l.color }}>
                          {l.icon}
                        </div>
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

            {/* Catalysts + Risks — side by side cards */}
            {((data.catalysts?.length > 0) || (data.risks?.length > 0)) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.catalysts?.length > 0 && (
                  <div className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap size={14} style={{ color: "#4DC820" }} />
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Catalysts</p>
                    </div>
                    <div className="space-y-1.5">
                      {data.catalysts.map((c: string, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#4DC820" }} />
                          <span className="text-xs text-foreground">{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {data.risks?.length > 0 && (
                  <div className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield size={14} style={{ color: "#E8193C" }} />
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Risks</p>
                    </div>
                    <div className="space-y-1.5">
                      {data.risks.map((r: string, i: number) => (
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

            {/* Earnings */}
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
                          style={{ background: data.earnings.last_signal === "BUY" ? "#4DC820" : data.earnings.last_signal === "SELL" ? "#E8193C" : "#F79009" }}>
                      {data.earnings.last_signal}
                    </span>
                  )}
                  {data.earnings.tone && (
                    <span className="text-[10px] text-muted-foreground">
                      Tone: {data.earnings.tone}{data.earnings.tone_score ? ` (${data.earnings.tone_score})` : ""}
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

            {/* Track record */}
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
                {data.track_record.best_gain_pct != null && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Best gain: <span className="font-bold" style={{ color: "#4DC820" }}>+{data.track_record.best_gain_pct}%</span>
                    {" · "}{data.track_record.total_alerts} total alerts
                  </p>
                )}
              </div>
            )}

            {/* Related videos — horizontal scroll */}
            {data.videos?.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Play size={14} style={{ color: "#E8193C" }} />
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Videos mentioning ${symbol}</p>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
                  {data.videos.map((v: any) => (
                    <Link key={v.id} href={`/video/${v.id}`}>
                      <div className="flex-shrink-0 w-52 bg-muted rounded-xl overflow-hidden border border-border hover:border-border/60 transition-all cursor-pointer group">
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
                        </div>
                        <div className="p-2">
                          <p className="text-[10px] font-bold text-foreground line-clamp-2 leading-tight">{v.title}</p>
                          {v.creator_name && <p className="text-[9px] text-muted-foreground mt-0.5">{v.creator_name}</p>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Themes */}
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

            {/* Back to ticker */}
            <Link href={`/tickers/${symbol}`}>
              <button className="w-full text-xs font-bold py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors flex items-center justify-center gap-1">
                Back to ${symbol} <ArrowUpRight size={11} />
              </button>
            </Link>
          </motion.div>
        )}
      </div>
      <KaiChat />
    </div>
  );
}
