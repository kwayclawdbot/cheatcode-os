// SparklineChart — minimal price sparkline for ticker cards
// Rendering strategy:
//   1. Try /api/v1/market/sparkline/:symbol (EODHD 30-day history)
//   2. Fall back to /api/v1/market/quote/:symbol → synthesize from OHLC
//   3. Final fallback: generate a plausible synthetic curve from color direction
//      so the chart ALWAYS renders — never shows empty on mobile
//
// SVG uses viewBox + CSS width:100%/height:100% — no ResizeObserver needed.
import { useEffect, useState } from "react";

interface SparklineChartProps {
  symbol: string;
  color: string;  // "#4DC820" bullish | "#E8193C" bearish | "#F79009" neutral
  height?: number;
  // Optional seed price for synthetic fallback
  price?: number;
  changePct?: number;
}

// In-memory cache to avoid re-fetching on re-renders
const _cache: Record<string, { data: number[]; ts: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/** Build a plausible 10-point intraday sparkline from a quote snapshot */
function buildSparklineFromQuote(q: {
  price: number; open: number; high: number; low: number;
  close: number; prev_close: number;
}): number[] {
  const { prev_close, open, high, low, close } = q;
  const isUp = close >= open;
  const range = high - low || Math.abs(close - prev_close) * 2 || close * 0.01;
  return [
    prev_close,
    open,
    isUp ? low + range * 0.2  : high - range * 0.2,
    isUp ? low + range * 0.35 : high - range * 0.35,
    isUp ? high - range * 0.4 : low + range * 0.4,
    isUp ? high - range * 0.25: low + range * 0.25,
    isUp ? high               : low,
    isUp ? high - range * 0.1 : low + range * 0.1,
    isUp ? high - range * 0.05: low + range * 0.05,
    close,
  ];
}

/** Generate a synthetic sparkline purely from direction + price (no API needed) */
function buildSyntheticSparkline(price: number, changePct: number): number[] {
  const isUp = changePct >= 0;
  const base = price || 100;
  const totalMove = base * Math.abs(changePct) / 100;
  const range = Math.max(totalMove * 3, base * 0.005); // at least 0.5% range for visibility

  // Seed a deterministic-ish curve based on price value
  const seed = (base * 1000) % 1;
  const noise = (i: number) => Math.sin(i * 2.3 + base * 0.01) * range * 0.15;

  if (isUp) {
    // Upward trend: dip early, then rally
    return [
      base - totalMove * 0.8,
      base - totalMove * 0.9 + noise(0),
      base - totalMove * 1.0 + noise(1),
      base - totalMove * 0.85 + noise(2),
      base - totalMove * 0.6 + noise(3),
      base - totalMove * 0.4 + noise(4),
      base - totalMove * 0.2 + noise(5),
      base - totalMove * 0.1 + noise(6),
      base + noise(7),
      base,
    ];
  } else {
    // Downward trend: spike early, then sell off
    return [
      base + totalMove * 0.8,
      base + totalMove * 0.9 + noise(0),
      base + totalMove * 0.7 + noise(1),
      base + totalMove * 0.5 + noise(2),
      base + totalMove * 0.3 + noise(3),
      base + totalMove * 0.15 + noise(4),
      base + noise(5),
      base - totalMove * 0.3 + noise(6),
      base - totalMove * 0.6 + noise(7),
      base,
    ];
  }
}

async function fetchSparklineData(
  symbol: string,
  price?: number,
  changePct?: number
): Promise<number[]> {
  const cached = _cache[symbol];
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  // 1. Try the historical sparkline endpoint (EODHD 30-day)
  try {
    const res = await fetch(`/api/v1/market/sparkline/${encodeURIComponent(symbol)}?days=30`);
    if (res.ok) {
      const raw: { t: number; v: number }[] = await res.json();
      if (Array.isArray(raw) && raw.length >= 5) {
        const data = raw.map(p => p.v);
        _cache[symbol] = { data, ts: Date.now() };
        return data;
      }
    }
  } catch {
    // fall through to quote fallback
  }

  // 2. Fall back to quote endpoint — synthesize shape from OHLC data
  try {
    const res = await fetch(`/api/v1/market/quote/${encodeURIComponent(symbol)}`);
    if (res.ok) {
      const q = await res.json();
      if (q && q.price) {
        const data = buildSparklineFromQuote({
          price:      q.price,
          open:       q.open  ?? q.price,
          high:       q.high  ?? q.price * 1.005,
          low:        q.low   ?? q.price * 0.995,
          close:      q.close ?? q.price,
          prev_close: q.prev_close ?? q.price * 0.99,
        });
        _cache[symbol] = { data, ts: Date.now() };
        return data;
      }
    }
  } catch {
    // fall through to synthetic fallback
  }

  // 3. Synthetic fallback — always renders, uses passed price/changePct
  const fallbackPrice = price ?? 100;
  const fallbackChange = changePct ?? 0;
  const data = buildSyntheticSparkline(fallbackPrice, fallbackChange);
  _cache[symbol] = { data, ts: Date.now() };
  return data;
}

/** Pure SVG sparkline — CSS width/height 100% fills any container automatically */
function SvgSparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;

  const W = 100;
  const H = 40;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const pad = range * 0.15;
  const domainMin = min - pad;
  const domainMax = max + pad;
  const domainRange = domainMax - domainMin;

  const toX = (i: number) => (i / (values.length - 1)) * W;
  const toY = (v: number) => H - ((v - domainMin) / domainRange) * H;

  const points = values.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const linePath = values.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`;

  // Unique gradient ID per color to avoid SVG defs collision
  const gradId = `sg-${color.replace("#", "")}-${Math.round(values[0] * 100)}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ display: "block", width: "100%", height: "100%" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function SparklineChart({ symbol, color, height = 40, price, changePct }: SparklineChartProps) {
  const [values, setValues] = useState<number[]>(() => {
    // Initialize immediately with synthetic data so chart renders on first paint
    // This is critical for mobile — no blank state even before fetch completes
    return buildSyntheticSparkline(price ?? 100, changePct ?? 0);
  });
  const [loading, setLoading] = useState(false); // start false since we have synthetic data

  useEffect(() => {
    let cancelled = false;
    // Fetch real data in background — will update chart when ready
    fetchSparklineData(symbol, price, changePct).then(d => {
      if (!cancelled && d.length >= 3) {
        setValues(d);
      }
    });
    return () => { cancelled = true; };
  }, [symbol, price, changePct]);

  return (
    <div style={{ width: "100%", height, display: "block" }}>
      {loading ? (
        <div
          style={{ width: "100%", height: "100%" }}
          className="animate-pulse bg-muted/40 rounded"
        />
      ) : (
        <SvgSparkline values={values} color={color} />
      )}
    </div>
  );
}
