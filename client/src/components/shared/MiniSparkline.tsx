/**
 * MiniSparkline — lightweight SVG sparkline for trending ticker cards and feed rows.
 * Fetches 50 daily closes from the Railway chart API (minimum limit=50),
 * then slices the last `displayCount` points for the visual.
 * Falls back to a flat line if data is unavailable.
 *
 * Symbol normalisation mirrors server/routers/marketData.ts:
 *   EURUSD  → EURUSD.FOREX   (6-char alpha = forex pair)
 *   BTC     → BTC-USD.CC     (known crypto tickers)
 *   AAPL    → AAPL.US        (default US equity)
 */
import { useEffect, useState } from "react";
import { fetchChartData } from "@/lib/api";

// ─── Known crypto base symbols ────────────────────────────────────────────────
const CRYPTO_SYMBOLS = new Set([
  "BTC","ETH","SOL","BNB","XRP","ADA","AVAX","DOGE","MATIC","DOT","LINK",
  "UNI","AAVE","LTC","BCH","ATOM","FIL","NEAR","APT","ARB","OP","SUI",
  "SEI","TIA","INJ","PEPE","WIF","BONK","JUP","PYTH","LDO","RPL","FXS",
  "CRV","CVX","BAL","SUSHI","COMP","MKR","SNX","YFI","DYDX","GMX","SHIB",
  "FLOKI","ELON","HOGE","VOLT",
]);

/** Map a raw display symbol to the Railway/EODHD chart API symbol. */
function normaliseForChart(raw: string): string {
  const s = raw.toUpperCase().replace(/^[$]/, "").trim();
  // Already has exchange suffix — pass through
  if (s.includes(".")) return s;
  // Crypto
  if (CRYPTO_SYMBOLS.has(s)) return `${s}-USD.CC`;
  // Forex pair: exactly 6 alpha chars (e.g. EURUSD, GBPUSD)
  if (/^[A-Z]{6}$/.test(s)) return `${s}.FOREX`;
  // Default: US equity
  return `${s}.US`;
}

interface MiniSparklineProps {
  symbol: string;
  width?: number;
  height?: number;
  positive?: boolean; // override color; if undefined, auto-detect from data
  displayCount?: number; // how many candles to show (sliced from end of 50)
  className?: string;
  changePct?: number; // optional, used to seed a synthetic line on first paint
}

// Build a synthetic sparkline from a price + changePct so the chart always
// renders something on first paint, even before the real data lands.
function _synthetic(changePct: number, count = 14): number[] {
  const base = 100;
  const totalMove = Math.max(Math.abs(changePct), 0.5);
  const isUp = changePct >= 0;
  const noise = (i: number) => Math.sin(i * 1.7) * totalMove * 0.12;
  const points: number[] = [];
  for (let i = 0; i < count; i++) {
    const progress = i / (count - 1);
    const v = isUp
      ? base * (1 - totalMove / 100 + (totalMove / 100) * progress) + noise(i)
      : base * (1 + totalMove / 100 - (totalMove / 100) * progress) + noise(i);
    points.push(v);
  }
  return points;
}

export function MiniSparkline({
  symbol,
  width = 80,
  height = 32,
  positive,
  displayCount = 14,
  className = "",
  changePct = 0.5,
}: MiniSparklineProps) {
  // Seed with synthetic data immediately so the card never paints empty.
  const [points, setPoints] = useState<number[]>(() => _synthetic(changePct, displayCount));

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    const chartSymbol = normaliseForChart(symbol);
    // API requires limit >= 50; we fetch 50 and slice the last displayCount
    fetchChartData(chartSymbol, "medium", "d", 50, "heatmap")
      .then((data: any) => {
        if (cancelled) return;
        if (data?.candles?.length) {
          const closes = data.candles
            .slice(-displayCount)
            .map((c: any) => Number(c.close))
            .filter((n: number) => !isNaN(n) && n > 0);
          if (closes.length >= 2) setPoints(closes);
        }
      })
      .catch(() => {
        // Synthetic fallback already in state — nothing to do.
      });
    return () => { cancelled = true; };
  }, [symbol, displayCount]);

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || min * 0.01 || 1;
  const pad = 3;

  // Normalize to SVG coords — clamp Y strictly within [pad, height-pad]
  const xs = points.map((_, i) => (i / (points.length - 1)) * (width - pad * 2) + pad);
  const ys = points.map(v => {
    const raw = height - pad - ((v - min) / range) * (height - pad * 2);
    return Math.max(pad, Math.min(height - pad, raw));
  });

  const pathD = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  // Area fill closes back along the bottom edge, staying within the SVG bounds
  const areaD = `${pathD} L ${xs[xs.length - 1].toFixed(1)} ${(height - pad).toFixed(1)} L ${xs[0].toFixed(1)} ${(height - pad).toFixed(1)} Z`;

  const isUp = positive !== undefined ? positive : points[points.length - 1] >= points[0];
  const color = isUp ? "#00C47A" : "#E8193C";
  const fillId = `spark-fill-${symbol.replace(/[^a-z0-9]/gi, "")}-${width}`;
  const clipId = `spark-clip-${symbol.replace(/[^a-z0-9]/gi, "")}-${width}`;

  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: "hidden" }}
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
        {/* Clip path ensures nothing renders outside the SVG bounds */}
        <clipPath id={clipId}>
          <rect x={0} y={0} width={width} height={height} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {/* Area fill */}
        <path d={areaD} fill={`url(#${fillId})`} />
        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        {/* End dot */}
        <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={2.5} fill={color} />
      </g>
    </svg>
  );
}
