// SparklineChart — minimal price sparkline for ticker cards
// Strategy:
//   1. Try /api/v1/market/sparkline/:symbol (EODHD 30-day history) — when deployed
//   2. Fall back to /api/v1/market/quote/:symbol and synthesize a realistic
//      intraday shape from open/high/low/close/prev_close data
//
// MOBILE FIX:
//   - Accepts an explicit `width` prop so callers can pass the known card width
//   - Falls back to ResizeObserver with multiple retry delays (50ms, 200ms, 500ms, 1000ms)
//   - SVG uses viewBox + preserveAspectRatio="none" so it always fills the container
//   - Default width=104 (120px card - 16px padding) renders immediately without waiting
import { useEffect, useState, useRef } from "react";

interface SparklineChartProps {
  symbol: string;
  color: string;  // "#4DC820" bullish | "#E8193C" bearish | "#F79009" neutral
  height?: number;
  width?: number; // optional explicit width — skips ResizeObserver if provided
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
  // Build a realistic intraday shape: gap open, early move, reversal, trend, close
  return [
    prev_close,
    open,
    isUp ? low + range * 0.2  : high - range * 0.2,   // early dip/spike
    isUp ? low + range * 0.35 : high - range * 0.35,  // consolidation
    isUp ? high - range * 0.4 : low + range * 0.4,    // mid-session
    isUp ? high - range * 0.25: low + range * 0.25,   // push
    isUp ? high               : low,                  // extreme
    isUp ? high - range * 0.1 : low + range * 0.1,    // slight pullback
    isUp ? high - range * 0.05: low + range * 0.05,   // hold
    close,
  ];
}

async function fetchSparklineData(symbol: string): Promise<number[]> {
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
    // fall through
  }

  return [];
}

/** Pure SVG sparkline — uses viewBox so it always fills the container */
function SvgSparkline({ values, color, width, height }: {
  values: number[];
  color: string;
  width: number;
  height: number;
}) {
  if (values.length < 2) return null;

  const W = 100; // internal viewBox width — SVG scales to fill container
  const H = 40;  // internal viewBox height

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // Add 15% padding top and bottom so the line doesn't touch the edges
  const pad = range * 0.15;
  const domainMin = min - pad;
  const domainMax = max + pad;
  const domainRange = domainMax - domainMin;

  const toX = (i: number) => (i / (values.length - 1)) * W;
  const toY = (v: number) => H - ((v - domainMin) / domainRange) * H;

  // Build polyline points
  const points = values.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");

  // Build filled area path
  const linePath = values.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`;

  const gradId = `sg-${color.replace("#", "")}`;

  return (
    <svg
      width={width}
      height={height}
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
      {/* Filled area */}
      <path d={areaPath} fill={`url(#${gradId})`} />
      {/* Line */}
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

export function SparklineChart({ symbol, color, height = 40, width: widthProp }: SparklineChartProps) {
  const [values, setValues] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [measuredWidth, setMeasuredWidth] = useState(widthProp ?? 104);
  const containerRef = useRef<HTMLDivElement>(null);

  // If explicit width prop is provided, skip ResizeObserver entirely
  useEffect(() => {
    if (widthProp !== undefined) {
      setMeasuredWidth(widthProp);
      return;
    }
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setMeasuredWidth(Math.floor(w));
    };

    // Immediate attempt
    measure();

    // Multiple retry delays to handle mobile paint timing
    const timers = [
      setTimeout(measure, 50),
      setTimeout(measure, 200),
      setTimeout(measure, 500),
      setTimeout(measure, 1000),
    ];

    const ro = new ResizeObserver(() => measure());
    ro.observe(el);

    return () => {
      timers.forEach(clearTimeout);
      ro.disconnect();
    };
  }, [widthProp]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSparklineData(symbol).then(d => {
      if (!cancelled) {
        setValues(d);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [symbol]);

  return (
    // Stable outer div — ALWAYS mounted so ResizeObserver always has a target
    <div
      ref={containerRef}
      style={{ width: "100%", height, position: "relative", overflow: "hidden" }}
    >
      {loading || values.length < 3 ? (
        <div
          style={{ width: "100%", height: "100%" }}
          className={loading ? "animate-pulse bg-muted/40 rounded" : "bg-muted/20 rounded"}
        />
      ) : (
        <SvgSparkline
          values={values}
          color={color}
          width={measuredWidth}
          height={height}
        />
      )}
    </div>
  );
}
