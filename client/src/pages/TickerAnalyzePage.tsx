// CheatCode OS — Ticker Dossier (/tickers/:symbol/analyze)
// Visual intelligence dashboard — gauges, charts, graphs. Zero paragraphs.

import { useState, useEffect, useMemo } from "react";
import { Link, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, TrendingUp, TrendingDown, Zap, Shield, AlertTriangle,
  Play, Calendar, Brain, Flame, BarChart2, Activity, Target,
  DollarSign, Newspaper, Users, GitBranch, ExternalLink, Layers,
} from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { Nav } from "@/components/layout/Nav";
import { KaiChat } from "@/components/kai/KaiChat";
import { TickerLogo } from "@/components/intelligence/TickerLogo";
import { triggerTickerAnalysis } from "@/lib/api";

// ═══════════════════════════════════════════════════════════════════════════
// VISUAL COMPONENTS — all pure SVG, matching CC design system
// ═══════════════════════════════════════════════════════════════════════════

// ── Radial Score Gauge (speedometer) ─────────────────────────────────────

function ScoreGauge({ score, direction }: { score: number; direction: string }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = direction === "bullish" ? "#4DC820" : direction === "bearish" ? "#E8193C" : "#F79009";
  const radius = 54;
  const stroke = 8;
  const circumference = Math.PI * radius; // semicircle
  const filled = (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="80" viewBox="0 0 140 80">
        {/* Track */}
        <path
          d="M 14 70 A 54 54 0 0 1 126 70"
          fill="none" stroke="var(--muted)" strokeWidth={stroke} strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d="M 14 70 A 54 54 0 0 1 126 70"
          fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
        {/* Score text */}
        <text x="70" y="62" textAnchor="middle" fontSize="28" fontWeight="900" fill="var(--foreground)"
              style={{ fontFamily: "var(--font-mono)" }}>
          {score}
        </text>
        <text x="70" y="76" textAnchor="middle" fontSize="9" fontWeight="700" fill={color}
              style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {direction || "NEUTRAL"}
        </text>
      </svg>
    </div>
  );
}

// ── Momentum Gauge (needle style) ────────────────────────────────────────

function MomentumGauge({ changePct, volRatio }: { changePct: number; volRatio: number }) {
  // Arc goes from left (bearish) to right (bullish)
  // -20% → 0° (far left), 0% → 90° (center), +20% → 180° (far right)
  const normalized = Math.min(1, Math.max(0, (changePct + 20) / 40));
  // SVG semicircle: 0° = 9 o'clock (left), 180° = 3 o'clock (right)
  // Needle rotates from 180° (bear/left) through 90° (top/neutral) to 0° (bull/right)
  const needleAngle = Math.PI * (1 - normalized); // 1.0=left, 0.5=top, 0.0=right
  const nx = 60 + 42 * Math.cos(needleAngle);
  const ny = 65 - 42 * Math.sin(needleAngle);
  const color = changePct >= 2 ? "#4DC820" : changePct <= -2 ? "#E8193C" : "#F79009";

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Momentum</p>
      <svg width="120" height="70" viewBox="0 0 120 70" className="mx-auto">
        {/* Arc zones: left=bear, center=neutral, right=bull */}
        <path d="M 10 65 A 50 50 0 0 1 40 18" fill="none" stroke="#E8193C" strokeWidth={4} strokeLinecap="round" opacity={0.3} />
        <path d="M 40 18 A 50 50 0 0 1 80 18" fill="none" stroke="#F79009" strokeWidth={4} strokeLinecap="round" opacity={0.3} />
        <path d="M 80 18 A 50 50 0 0 1 110 65" fill="none" stroke="#4DC820" strokeWidth={4} strokeLinecap="round" opacity={0.3} />
        {/* Needle */}
        <line x1="60" y1="65" x2={nx} y2={ny} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx="60" cy="65" r="4" fill={color} />
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] font-bold" style={{ color: "#E8193C" }}>Bear</span>
        <span className="text-xs font-black" style={{ color, fontFamily: "var(--font-mono)" }}>
          {changePct >= 0 ? "+" : ""}{changePct.toFixed(1)}%
        </span>
        <span className="text-[9px] font-bold" style={{ color: "#4DC820" }}>Bull</span>
      </div>
      <p className="text-[9px] text-muted-foreground text-center mt-1">Vol {volRatio.toFixed(1)}x avg</p>
    </div>
  );
}

// ── 52-Week Range Slider ─────────────────────────────────────────────────

function RangeSlider({ price, high, low, ma50, ma200 }: {
  price: number; high: number; low: number; ma50?: number; ma200?: number;
}) {
  if (!high || !low || high <= low) return null;
  const range = high - low;
  const pricePct = ((price - low) / range) * 100;
  const ma50Pct = ma50 ? ((ma50 - low) / range) * 100 : null;
  const ma200Pct = ma200 ? ((ma200 - low) / range) * 100 : null;

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-3">52-Week Range</p>
      <div className="relative h-8 mb-2">
        {/* Track */}
        <div className="absolute top-3 left-0 right-0 h-2 rounded-full overflow-hidden" style={{ background: "linear-gradient(90deg, #E8193C33, #F7900933, #4DC82033)" }} />
        {/* MA markers */}
        {ma200Pct != null && ma200Pct >= 0 && ma200Pct <= 100 && (
          <div className="absolute top-1 h-6 w-px" style={{ left: `${ma200Pct}%`, background: "#7B2FBE", opacity: 0.5 }}>
            <span className="absolute -top-3 -translate-x-1/2 text-[7px] font-bold" style={{ color: "#7B2FBE" }}>200d</span>
          </div>
        )}
        {ma50Pct != null && ma50Pct >= 0 && ma50Pct <= 100 && (
          <div className="absolute top-1 h-6 w-px" style={{ left: `${ma50Pct}%`, background: "#00AEEF", opacity: 0.5 }}>
            <span className="absolute -top-3 -translate-x-1/2 text-[7px] font-bold" style={{ color: "#00AEEF" }}>50d</span>
          </div>
        )}
        {/* Current price dot */}
        <div className="absolute top-2 w-4 h-4 rounded-full border-2 border-white -translate-x-1/2"
             style={{ left: `${Math.min(100, Math.max(0, pricePct))}%`, background: pricePct > 70 ? "#4DC820" : pricePct < 30 ? "#E8193C" : "#F79009", boxShadow: "0 0 8px rgba(0,0,0,0.3)" }} />
      </div>
      <div className="flex justify-between text-[9px]">
        <span className="font-black text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>${low.toFixed(0)}</span>
        <span className="font-black text-foreground" style={{ fontFamily: "var(--font-mono)" }}>${price.toFixed(2)}</span>
        <span className="font-black text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>${high.toFixed(0)}</span>
      </div>
    </div>
  );
}

// ── Volume Profile Bar ───────────────────────────────────────────────────

function VolumeBar({ volume, avgVolume }: { volume: number; avgVolume: number }) {
  if (!avgVolume) return null;
  const ratio = volume / avgVolume;
  const maxH = 60;
  const todayH = Math.min(maxH, (ratio / 3) * maxH);
  const avgH = maxH / 3;
  const color = ratio >= 2 ? "#7B2FBE" : ratio >= 1.5 ? "#4DC820" : "#667085";
  const fmt = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : `${(n / 1e3).toFixed(0)}K`;

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Volume</p>
      <div className="flex items-end justify-center gap-4 h-16">
        <div className="flex flex-col items-center">
          <motion.div initial={{ height: 0 }} animate={{ height: todayH }} transition={{ duration: 0.6 }}
                      className="w-8 rounded-t-md" style={{ background: color }} />
          <span className="text-[8px] font-bold mt-1 text-foreground">Today</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-8 rounded-t-md border-2 border-dashed" style={{ height: avgH, borderColor: "#667085" }} />
          <span className="text-[8px] font-bold mt-1 text-muted-foreground">20d Avg</span>
        </div>
      </div>
      <p className="text-center mt-2">
        <span className="text-sm font-black" style={{ color, fontFamily: "var(--font-mono)" }}>{ratio.toFixed(1)}x</span>
        <span className="text-[9px] text-muted-foreground ml-1">({fmt(volume)} vs {fmt(avgVolume)})</span>
      </p>
    </div>
  );
}

// ── Sentiment Compass ────────────────────────────────────────────────────

function SentimentCompass({ communityBullPct, newsPositive, newsNegative, direction }: {
  communityBullPct: number; newsPositive: number; newsNegative: number; direction: string;
}) {
  const kaiAngle = direction === "bullish" ? -45 : direction === "bearish" ? 45 : 0;
  const communityAngle = ((communityBullPct - 50) / 50) * -60;
  const newsTotal = newsPositive + newsNegative;
  const newsAngle = newsTotal > 0 ? (((newsPositive / newsTotal) - 0.5) * -90) : 0;

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Sentiment</p>
      <svg width="100" height="100" viewBox="0 0 100 100" className="mx-auto">
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth={1} />
        <circle cx="50" cy="50" r="25" fill="none" stroke="var(--border)" strokeWidth={0.5} strokeDasharray="3 3" />
        {/* Quadrant labels */}
        <text x="50" y="12" textAnchor="middle" fontSize="7" fill="#4DC820" fontWeight="700">BULL</text>
        <text x="50" y="95" textAnchor="middle" fontSize="7" fill="#E8193C" fontWeight="700">BEAR</text>
        {/* Kai vector */}
        <line x1="50" y1="50" x2={50 + 30 * Math.sin(kaiAngle * Math.PI / 180)} y2={50 - 30 * Math.cos(kaiAngle * Math.PI / 180)}
              stroke="#4DC820" strokeWidth={2} strokeLinecap="round" />
        <circle cx={50 + 30 * Math.sin(kaiAngle * Math.PI / 180)} cy={50 - 30 * Math.cos(kaiAngle * Math.PI / 180)} r="3" fill="#4DC820" />
        {/* Community vector */}
        <line x1="50" y1="50" x2={50 + 22 * Math.sin(communityAngle * Math.PI / 180)} y2={50 - 22 * Math.cos(communityAngle * Math.PI / 180)}
              stroke="#00AEEF" strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
        {/* News vector */}
        <line x1="50" y1="50" x2={50 + 18 * Math.sin(newsAngle * Math.PI / 180)} y2={50 - 18 * Math.cos(newsAngle * Math.PI / 180)}
              stroke="#F79009" strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
        <circle cx="50" cy="50" r="3" fill="var(--foreground)" />
      </svg>
      <div className="flex justify-center gap-3 mt-1">
        <span className="text-[8px] font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#4DC820" }} />Kai</span>
        <span className="text-[8px] font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#00AEEF" }} />Community</span>
        <span className="text-[8px] font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#F79009" }} />News</span>
      </div>
    </div>
  );
}

// ── Earnings Countdown ───────────────────────────────────────────────────

function EarningsCountdown({ earnings }: { earnings: any }) {
  if (!earnings?.next_date) return null;
  const next = new Date(earnings.next_date);
  const now = new Date();
  const daysUntil = Math.max(0, Math.ceil((next.getTime() - now.getTime()) / 86400000));

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Earnings</p>
      <div className="text-center">
        <p className="text-3xl font-black text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
          {daysUntil}
        </p>
        <p className="text-[9px] font-bold text-muted-foreground uppercase">days until</p>
        <p className="text-xs font-bold text-foreground mt-1">{earnings.next_date}</p>
        {earnings.last_signal && (
          <span className="inline-block mt-2 text-[9px] font-bold px-2 py-0.5 rounded-full text-white"
                style={{ background: earnings.last_signal === "BUY" ? "#4DC820" : "#E8193C" }}>
            Last: {earnings.last_signal}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Mini Price Chart with S/R Levels ─────────────────────────────────────

function PriceChartWithLevels({ priceHistory, levels, currentPrice }: {
  priceHistory: { date: string; close: number; high: number; low: number; open?: number }[];
  levels: any;
  currentPrice: number;
}) {
  if (!priceHistory?.length && !levels) return null;

  const W = 650, H = 280, PAD = { top: 16, right: 80, bottom: 24, left: 12 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Collect all S/R prices
  const levelLines: { price: number; label: string; color: string; dash: boolean }[] = [];
  if (levels) {
    const res = levels.resistance;
    const sup = levels.support;
    const inv = levels.invalidation;
    (Array.isArray(res) ? res : res != null ? [res] : []).forEach((v: number, i: number) =>
      levelLines.push({ price: v, label: i === 0 ? "R" : `R${i+1}`, color: "#E8193C", dash: false })
    );
    (Array.isArray(sup) ? sup : sup != null ? [sup] : []).forEach((v: number, i: number) =>
      levelLines.push({ price: v, label: i === 0 ? "S" : `S${i+1}`, color: "#4DC820", dash: false })
    );
    if (inv) {
      const invP = typeof inv === "number" ? inv : parseFloat(String(inv).replace(/[^0-9.]/g, ""));
      if (invP > 0) levelLines.push({ price: invP, label: "INV", color: "#F79009", dash: true });
    }
  }

  const bars = priceHistory?.length ? priceHistory : [];
  const allPrices = [
    ...bars.flatMap(b => [b.high, b.low]),
    ...levelLines.map(l => l.price),
    currentPrice,
  ].filter(Boolean);

  if (allPrices.length === 0) return null;

  const minP = Math.min(...allPrices) * 0.97;
  const maxP = Math.max(...allPrices) * 1.03;
  const rangeP = maxP - minP || 1;

  const priceToY = (p: number) => PAD.top + chartH - ((p - minP) / rangeP) * chartH;

  // Build candlestick path
  // Candles occupy ~65% of chart width — leaves margin on right for S/R labels
  const candleAreaW = chartW * 0.65;
  const barWidth = bars.length > 0 ? Math.max(3, (candleAreaW / bars.length) * 0.75) : 5;

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Price Chart + Key Levels</p>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(pct => {
          const y = PAD.top + chartH * pct;
          return <line key={pct} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="var(--border)" strokeWidth={0.5} />;
        })}

        {/* Candlesticks — positioned in left 65% of chart */}
        {bars.map((bar, i) => {
          const x = PAD.left + (i / Math.max(1, bars.length - 1)) * candleAreaW;
          const open = bar.open ?? bar.close;
          const isGreen = bar.close >= open;
          const color = isGreen ? "#4DC820" : "#E8193C";
          const bodyTop = priceToY(Math.max(open, bar.close));
          const bodyBot = priceToY(Math.min(open, bar.close));
          const bodyH = Math.max(1, bodyBot - bodyTop);
          return (
            <g key={i}>
              <line x1={x} y1={priceToY(bar.high)} x2={x} y2={priceToY(bar.low)} stroke={color} strokeWidth={0.8} />
              <rect x={x - barWidth / 2} y={bodyTop} width={barWidth} height={bodyH} fill={color} rx={0.5} />
            </g>
          );
        })}

        {/* S/R level lines */}
        {levelLines.map((l, i) => {
          const y = priceToY(l.price);
          if (y < PAD.top || y > H - PAD.bottom) return null;
          return (
            <g key={`level-${i}`}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                    stroke={l.color} strokeWidth={1} strokeDasharray={l.dash ? "4 3" : "0"} opacity={0.7} />
              <rect x={W - PAD.right + 2} y={y - 8} width={50} height={16} rx={4} fill={l.color} opacity={0.15} />
              <text x={W - PAD.right + 6} y={y + 4} fontSize="9" fontWeight="800" fill={l.color}
                    style={{ fontFamily: "var(--font-mono)" }}>
                {l.label} ${l.price.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Current price line */}
        {currentPrice > 0 && (
          <g>
            <line x1={PAD.left} y1={priceToY(currentPrice)} x2={W - PAD.right} y2={priceToY(currentPrice)}
                  stroke="#00AEEF" strokeWidth={1.5} strokeDasharray="6 3" />
            <rect x={W - PAD.right + 2} y={priceToY(currentPrice) - 9} width={54} height={18} rx={4} fill="#00AEEF" />
            <text x={W - PAD.right + 6} y={priceToY(currentPrice) + 4} fontSize="9" fontWeight="900" fill="white"
                  style={{ fontFamily: "var(--font-mono)" }}>
              ${currentPrice.toFixed(2)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ── Neural Connection Graph (simplified SVG) ─────────────────────────────

function ConnectionGraph({ symbol, connections, communityPosts, videos, news }: {
  symbol: string;
  connections: any[];
  communityPosts?: any[];
  videos?: any[];
  news?: any[];
}) {
  // Build nodes from ALL available data sources — each gets a clickable link
  const graphNodes: { label: string; type: string; color: string; sublabel?: string; link?: string; external?: boolean }[] = [];

  // Intel connections (highest priority) — link to related ticker
  for (const c of (connections || []).slice(0, 4)) {
    const t = (c.other_tickers || [])[0];
    if (t) graphNodes.push({ label: `$${t}`, type: "intel", color: c.direction === "bullish" ? "#4DC820" : c.direction === "bearish" ? "#E8193C" : "#667085", sublabel: (c.headline || "").slice(0, 18), link: `/tickers/${t}/analyze` });
  }

  // News sources — link to article
  for (const n of (news || []).slice(0, 3)) {
    if (graphNodes.length >= 8) break;
    const sentiment = typeof n.sentiment === "number" ? (n.sentiment > 0 ? "#4DC820" : n.sentiment < 0 ? "#E8193C" : "#667085") : "#667085";
    graphNodes.push({ label: "News", type: "news", color: sentiment, sublabel: (n.title || "").slice(0, 18), link: n.link, external: true });
  }

  // Videos / creators — link to video page
  for (const v of (videos || []).slice(0, 2)) {
    if (graphNodes.length >= 8) break;
    graphNodes.push({ label: v.creator_name?.split(" ")[0] || "Video", type: "video", color: "#E8193C", sublabel: (v.title || "").slice(0, 18), link: `/video/${v.id}` });
  }

  // Community voices — link to ticker feed
  for (const p of (communityPosts || []).slice(0, 2)) {
    if (graphNodes.length >= 8) break;
    const sc = p.sentiment === "bullish" ? "#4DC820" : p.sentiment === "bearish" ? "#E8193C" : "#667085";
    graphNodes.push({ label: (p.author || "Trader").split(" ")[0], type: "community", color: sc, sublabel: p.is_agent ? "AI" : "Trader", link: `/tickers/${symbol}` });
  }

  if (graphNodes.length === 0) return null;

  const W = 360, H = 240;
  const centerX = W / 2, centerY = H / 2;
  const radius = 85;
  const typeIcon: Record<string, string> = { intel: "⚡", news: "📰", video: "▶", community: "💬" };

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <GitBranch size={14} style={{ color: "#7B2FBE" }} />
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Intelligence Network</p>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        {/* Pulsing rings around center */}
        <circle cx={centerX} cy={centerY} r={30} fill="none" stroke="#4DC820" strokeWidth={0.5} opacity={0.15} />
        <circle cx={centerX} cy={centerY} r={55} fill="none" stroke="#4DC820" strokeWidth={0.3} opacity={0.08} strokeDasharray="4 4" />

        {/* Edges */}
        {graphNodes.map((n, i) => {
          const angle = (i / graphNodes.length) * 2 * Math.PI - Math.PI / 2;
          const nx = centerX + radius * Math.cos(angle);
          const ny = centerY + radius * Math.sin(angle);
          return (
            <line key={`e${i}`} x1={centerX} y1={centerY} x2={nx} y2={ny}
                  stroke={n.color} strokeWidth={1.2} opacity={0.4}
                  strokeDasharray={n.type === "community" ? "3 3" : "0"} />
          );
        })}

        {/* Center node */}
        <circle cx={centerX} cy={centerY} r={22} fill="#4DC820" opacity={0.12} />
        <circle cx={centerX} cy={centerY} r={16} fill="#4DC820" opacity={0.25} />
        <text x={centerX} y={centerY + 4} textAnchor="middle" fontSize="11" fontWeight="900" fill="#4DC820"
              style={{ fontFamily: "var(--font-mono)" }}>${symbol}</text>

        {/* Outer nodes — clickable */}
        {graphNodes.map((n, i) => {
          const angle = (i / graphNodes.length) * 2 * Math.PI - Math.PI / 2;
          const nx = centerX + radius * Math.cos(angle);
          const ny = centerY + radius * Math.sin(angle);
          const handleClick = () => {
            if (!n.link) return;
            if (n.external) {
              window.open(n.link, "_blank", "noopener");
            } else {
              window.location.href = n.link;
            }
          };
          return (
            <g key={`n${i}`} onClick={handleClick} style={{ cursor: n.link ? "pointer" : "default" }} className="group">
              <circle cx={nx} cy={ny} r={16} fill={n.color} opacity={0.05} className="group-hover:opacity-20 transition-opacity" />
              <circle cx={nx} cy={ny} r={10} fill={n.color} opacity={0.25} className="group-hover:opacity-50 transition-opacity" />
              <text x={nx} y={ny - 1} textAnchor="middle" fontSize="6">{typeIcon[n.type] || "●"}</text>
              <text x={nx} y={ny + 8} textAnchor="middle" fontSize="7" fontWeight="700" fill={n.color}>{n.label}</text>
              {n.sublabel && (
                <text x={(centerX + nx) / 2} y={(centerY + ny) / 2 - 5} textAnchor="middle"
                      fontSize="5.5" fill="var(--muted-foreground)" opacity={0.7}>
                  {n.sublabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {/* Legend */}
      <div className="flex justify-center gap-3 mt-2">
        {[
          { icon: "⚡", label: "Intel", color: "#7B2FBE" },
          { icon: "📰", label: "News", color: "#00AEEF" },
          { icon: "▶", label: "Creators", color: "#E8193C" },
          { icon: "💬", label: "Community", color: "#4DC820" },
        ].map(l => (
          <span key={l.label} className="text-[8px] font-bold flex items-center gap-1" style={{ color: l.color }}>
            {l.icon} {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

type DossierTab = "overview" | "deep" | "connections";

function formatMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function MetricCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-muted rounded-xl p-2.5 text-center">
      <p className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">{label}</p>
      <p className="text-xs font-black text-foreground" style={{ fontFamily: "var(--font-mono)", color }}>{value}</p>
    </div>
  );
}

export default function TickerAnalyzePage() {
  const params = useParams<{ symbol: string }>();
  const symbol = (params.symbol || "").toUpperCase();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<DossierTab>("overview");

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
  // Use news-derived direction from backend (overrides raw price direction)
  const direction = (data?.news_sentiment?.direction || data?.direction || "neutral").toLowerCase();
  const dirColor = direction === "bullish" ? "#4DC820" : direction === "bearish" ? "#E8193C" : "#F79009";
  const fund = data?.fundamentals;
  const kai = data?.kai_analysis;

  // Compute derived values
  const volRatio = useMemo(() => {
    const sb = data?.score_breakdown;
    if (!sb) return 1;
    return 1 + (sb.volume || 0) / 16; // reverse the formula
  }, [data]);

  // News sentiment from backend aggregate
  const newsPos = data?.news_sentiment?.positive || 0;
  const newsNeg = data?.news_sentiment?.negative || 0;

  // Radar chart data for fundamentals
  const radarData = useMemo(() => {
    if (!fund) return [];
    return [
      { axis: "Value", value: fund.pe_ratio ? Math.min(100, Math.max(0, 100 - fund.pe_ratio)) : 50 },
      { axis: "Growth", value: fund.quarterly_revenue_growth ? Math.min(100, (fund.quarterly_revenue_growth + 0.5) * 100) : 50 },
      { axis: "Margin", value: fund.profit_margin ? Math.min(100, (fund.profit_margin + 0.5) * 100) : 50 },
      { axis: "Momentum", value: Math.min(100, Math.abs(chg) * 10) },
      { axis: "Quality", value: fund.roe ? Math.min(100, (fund.roe + 0.5) * 100) : 50 },
      { axis: "Stability", value: fund.beta ? Math.min(100, Math.max(0, (2 - fund.beta) * 50)) : 50 },
    ];
  }, [fund, chg]);

  const TABS: { id: DossierTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "deep", label: "Deep Dive" },
    { id: "connections", label: "Connections" },
  ];

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
                <p className="text-xs text-muted-foreground">News, fundamentals, earnings, alerts, community...</p>
              </div>
            </div>
          </motion.div>
        )}

        {error && !loading && (
          <div className="text-center py-20">
            <AlertTriangle size={24} style={{ color: "#E8193C" }} className="mx-auto mb-2" />
            <p className="font-bold text-foreground">{error}</p>
          </div>
        )}

        {data && !loading && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

            {/* ── HERO ── */}
            <div className="rounded-2xl border border-border p-5 mb-4" style={{ background: dirColor + "06" }}>
              <div className="flex items-center gap-4">
                <TickerLogo symbol={symbol} size={48} className="rounded-xl flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-2xl font-black text-foreground" style={{ fontFamily: "var(--font-mono)" }}>${symbol}</span>
                    {data.name && <span className="text-sm text-muted-foreground">{data.name}</span>}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: dirColor }}>{direction || "neutral"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>${(data.last_price || 0).toFixed(2)}</span>
                    <span className="text-sm font-bold flex items-center gap-0.5" style={{ color: chg >= 0 ? "#4DC820" : "#E8193C" }}>
                      {chg >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                      {chg >= 0 ? "+" : ""}{chg.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <ScoreGauge score={data.convergence_score || 0} direction={direction} />
              </div>

              {/* Kai TLDR — terminal style */}
              {kai?.tldr && (
                <div className="mt-3 px-3 py-2 rounded-lg" style={{ background: "#0a0f1a" }}>
                  <p className="text-xs leading-relaxed" style={{ fontFamily: "var(--font-mono)", color: "#4DC820" }}>
                    <span className="opacity-50">kai@dossier ~ </span>{kai.tldr}
                  </p>
                </div>
              )}
            </div>

            {/* ── Audio Dossier Brief ── */}
            {data.audio_url && (
              <div className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                     style={{ background: "#4DC82018" }}>
                  <Play size={14} style={{ color: "#4DC820" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-foreground mb-1">Kai Audio Brief</p>
                  <audio controls preload="none" className="w-full h-8" style={{ filter: "hue-rotate(90deg) saturate(1.5)" }}>
                    <source src={data.audio_url} type="audio/wav" />
                  </audio>
                </div>
              </div>
            )}

            {/* ── TABS ── */}
            <div className="flex items-center gap-1 mb-4 border-b border-border">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                        className="px-4 py-2.5 text-xs font-bold transition-colors relative"
                        style={{ color: tab === t.id ? "#4DC820" : "var(--muted-foreground)" }}>
                  {t.label}
                  {tab === t.id && <motion.div layoutId="dossier-tab" className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "#4DC820" }} />}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">

              {/* ═══ OVERVIEW TAB ═══ */}
              {tab === "overview" && (
                <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  {/* Visual grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <MomentumGauge changePct={chg} volRatio={volRatio} />
                    <VolumeBar volume={parseFloat(data.score_breakdown?.volume || 0) * 1e6 / 16 + (fund?.market_cap ? 5e6 : 1e6)} avgVolume={fund?.market_cap ? 5e6 : 1e6} />
                    <SentimentCompass communityBullPct={60} newsPositive={newsPos} newsNegative={newsNeg} direction={direction} />
                    <EarningsCountdown earnings={data.earnings} />
                  </div>

                  {/* Candlestick chart with S/R levels */}
                  <PriceChartWithLevels
                    priceHistory={data.price_history || []}
                    levels={kai?.key_levels}
                    currentPrice={data.last_price || 0}
                  />

                  {/* 52W Range */}
                  {fund && (fund.high_52w || fund.low_52w) && (
                    <RangeSlider price={data.last_price || 0} high={fund.high_52w || 0} low={fund.low_52w || 0} ma50={fund.ma_50d} ma200={fund.ma_200d} />
                  )}

                  {/* Fundamentals radar + metric grid side by side */}
                  {fund && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {radarData.length > 0 && (
                        <div className="bg-card rounded-xl border border-border p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Profile</p>
                          <ResponsiveContainer width="100%" height={180}>
                            <RadarChart data={radarData}>
                              <PolarGrid stroke="var(--border)" />
                              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
                              <Radar dataKey="value" stroke="#4DC820" fill="#4DC820" fillOpacity={0.15} strokeWidth={1.5} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                      <div className="bg-card rounded-xl border border-border p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <DollarSign size={14} style={{ color: "#00AEEF" }} />
                          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Fundamentals</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {fund.market_cap && <MetricCard label="Mkt Cap" value={formatMoney(fund.market_cap)} />}
                          {fund.pe_ratio && <MetricCard label="P/E" value={fund.pe_ratio.toFixed(1)} />}
                          {fund.eps && <MetricCard label="EPS" value={`$${fund.eps.toFixed(2)}`} />}
                          {fund.analyst_target && <MetricCard label="Target" value={`$${fund.analyst_target.toFixed(0)}`} color="#4DC820" />}
                          {fund.beta && <MetricCard label="Beta" value={fund.beta.toFixed(2)} />}
                          {fund.short_ratio && <MetricCard label="Short" value={fund.short_ratio.toFixed(1)} />}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* News ribbon */}
                  {data.news?.length > 0 && (
                    <div className="bg-card rounded-xl border border-border p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Newspaper size={14} style={{ color: "#00AEEF" }} />
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">News</p>
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
                        {data.news.map((n: any, i: number) => {
                          const sc = n.sentiment > 0 ? "#4DC820" : n.sentiment < 0 ? "#E8193C" : "#667085";
                          return (
                            <a key={i} href={n.link} target="_blank" rel="noopener noreferrer"
                               className="flex-shrink-0 w-52 bg-muted rounded-xl p-3 hover:border-border border border-transparent transition-all cursor-pointer">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <div className="w-2 h-2 rounded-full" style={{ background: sc }} />
                                <span className="text-[9px] text-muted-foreground">{n.date}</span>
                              </div>
                              <p className="text-[11px] font-bold text-foreground line-clamp-3 leading-tight">{n.title}</p>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Drivers */}
                  {data.drivers?.length > 0 && (
                    <div className="bg-card rounded-xl border border-border p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-3">What's Driving This</p>
                      <div className="flex flex-wrap gap-2">
                        {data.drivers.map((d: any, i: number) => {
                          const ic = d.type === "momentum" ? "#4DC820" : d.type === "volume" ? "#7B2FBE" : d.type === "sector" ? "#F79009" : "#00AEEF";
                          return (
                            <span key={i} className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5"
                                  style={{ background: ic + "12", color: ic }}>
                              {d.type === "momentum" ? (chg >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />) :
                               d.type === "volume" ? <BarChart2 size={11} /> : d.type === "sector" ? <Layers size={11} /> : <Activity size={11} />}
                              {d.text}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══ DEEP DIVE TAB ═══ */}
              {tab === "deep" && (
                <motion.div key="deep" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  {/* Price chart with S/R levels */}
                  <PriceChartWithLevels
                    priceHistory={data.price_history || []}
                    levels={kai?.key_levels}
                    currentPrice={data.last_price || 0}
                  />

                  {/* Catalysts + Risks side by side */}
                  {((kai?.catalysts?.length > 0) || (kai?.risks?.length > 0)) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {kai?.catalysts?.length > 0 && (
                        <div className="bg-card rounded-xl border border-border p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Zap size={14} style={{ color: "#4DC820" }} />
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Catalysts</p>
                          </div>
                          <div className="space-y-1.5">
                            {kai.catalysts.map((c: string, i: number) => (
                              <div key={i} className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-muted">
                                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#4DC820" }} />
                                <span className="text-xs text-foreground">{c}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {kai?.risks?.length > 0 && (
                        <div className="bg-card rounded-xl border border-border p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Shield size={14} style={{ color: "#E8193C" }} />
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Risks</p>
                          </div>
                          <div className="space-y-1.5">
                            {kai.risks.map((r: string, i: number) => (
                              <div key={i} className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-muted">
                                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#E8193C" }} />
                                <span className="text-xs text-foreground">{r}</span>
                              </div>
                            ))}
                          </div>
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
                          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Alert Track Record</p>
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

                  {/* Earnings detail */}
                  {data.earnings && (
                    <div className="bg-card rounded-xl border border-border p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar size={14} style={{ color: "#7B2FBE" }} />
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Earnings Intel</p>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
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
                        <div className="flex flex-wrap gap-1.5 mt-2">
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

                  {/* Videos */}
                  {data.videos?.length > 0 && (
                    <div className="bg-card rounded-xl border border-border p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Play size={14} style={{ color: "#E8193C" }} />
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Creator Coverage</p>
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
                        {data.videos.map((v: any) => (
                          <Link key={v.id} href={`/video/${v.id}`}>
                            <div className="flex-shrink-0 w-48 bg-muted rounded-xl overflow-hidden border border-transparent hover:border-border transition-all cursor-pointer group">
                              <div className="relative aspect-video bg-background">
                                {v.thumbnail_url && <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" />}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Play size={14} className="text-white" />
                                </div>
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
                </motion.div>
              )}

              {/* ═══ CONNECTIONS TAB ═══ */}
              {tab === "connections" && (
                <motion.div key="connections" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  {/* Neural graph — shows ALL data sources as nodes */}
                  <ConnectionGraph
                    symbol={symbol}
                    connections={data.intel_connections || []}
                    communityPosts={data.community_posts}
                    videos={data.videos}
                    news={data.news}
                  />

                  {/* Community posts */}
                  {data.community_posts?.length > 0 && (
                    <div className="bg-card rounded-xl border border-border p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Users size={14} style={{ color: "#4DC820" }} />
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Community on ${symbol}</p>
                      </div>
                      <div className="space-y-2">
                        {data.community_posts.map((p: any, i: number) => {
                          const sc = p.sentiment === "bullish" ? "#4DC820" : p.sentiment === "bearish" ? "#E8193C" : "#667085";
                          return (
                            <div key={i} className="px-3 py-2 rounded-lg bg-muted">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-[10px] font-bold text-foreground">{p.author}</span>
                                {p.is_agent && <span className="text-[8px] font-bold px-1 py-0.5 rounded-full text-white" style={{ background: "#7B2FBE" }}>AI</span>}
                                {p.sentiment && <div className="w-1.5 h-1.5 rounded-full" style={{ background: sc }} />}
                              </div>
                              <p className="text-xs text-foreground leading-relaxed">{p.body}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Themes */}
                  {data.themes?.length > 0 && (
                    <div className="bg-card rounded-xl border border-border p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-3">Active Themes</p>
                      <div className="flex flex-wrap gap-2">
                        {data.themes.map((t: string, i: number) => (
                          <span key={i} className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5"
                                style={{ background: "#F7900918", color: "#F79009" }}>
                            <Flame size={11} /> {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.intel_connections?.length === 0 && data.community_posts?.length === 0 && (
                    <div className="text-center py-12">
                      <GitBranch size={24} className="text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No connections data yet for ${symbol}</p>
                      <p className="text-xs text-muted-foreground">Intel connections build over time as Kai processes news and cross-ticker signals</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
      <KaiChat />
    </div>
  );
}
