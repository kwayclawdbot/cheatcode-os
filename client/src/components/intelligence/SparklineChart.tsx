// SparklineChart — minimal price sparkline for ticker cards
// Strategy:
//   1. Try /api/v1/market/sparkline/:symbol (EODHD 30-day history) — when deployed
//   2. Fall back to /api/v1/market/quote/:symbol and synthesize a realistic
//      intraday shape from open/high/low/close/prev_close data
// KEY FIX: Y-axis domain is set to [dataMin * 0.998, dataMax * 1.002] so the
//          chart zooms into the actual price range instead of starting at 0.
// MOBILE FIX: Uses ResizeObserver on a STABLE outer div (always mounted) so
//             width is measured correctly regardless of loading state.
import { useEffect, useState, useRef } from "react";

interface SparklineChartProps {
  symbol: string;
  color: string;  // "#4DC820" bullish | "#E8193C" bearish | "#F79009" neutral
  height?: number;
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

/** Pure SVG sparkline — no Recharts dependency, no Y=0 baseline issue */
function SvgSparkline({ values, color, width, height }: {
  values: number[];
  color: string;
  width: number;
  height: number;
}) {
  if (values.length < 2 || width <= 0) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // Add 15% padding top and bottom so the line doesn't touch the edges
  const pad = range * 0.15;
  const domainMin = min - pad;
  const domainMax = max + pad;
  const domainRange = domainMax - domainMin;

  const toX = (i: number) => (i / (values.length - 1)) * width;
  const toY = (v: number) => height - ((v - domainMin) / domainRange) * height;

  // Build polyline points
  const points = values.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");

  // Build filled area path
  const linePath = values.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  const gradId = `sg-${color.replace("#", "")}-${Math.round(width)}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"
         style={{ display: "block", overflow: "visible" }}>
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
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SparklineChart({ symbol, color, height = 40 }: SparklineChartProps) {
  const [values, setValues] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [width, setWidth] = useState(0);
  // CRITICAL: containerRef is on a STABLE outer div that is ALWAYS mounted.
  // This ensures ResizeObserver always has a valid element to measure,
  // regardless of whether we're in loading or data state.
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure actual container width — stable ref, always present
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setWidth(Math.floor(w));
    };
    // Initial measurement (may be 0 if not yet painted)
    measure();
    // Also measure after a short delay in case the card hasn't fully laid out
    const timer = setTimeout(measure, 50);
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, []);

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
    <div ref={containerRef} style={{ width: "100%", height, position: "relative" }}>
      {loading || values.length < 3 ? (
        // Loading skeleton — inside the stable outer div
        <div
          style={{ width: "100%", height: "100%" }}
          className={loading ? "animate-pulse bg-muted/40 rounded" : "bg-muted/20 rounded"}
        />
      ) : (
        <SvgSparkline values={values} color={color} width={width || 104} height={height} />
      )}
    </div>
  );
}
