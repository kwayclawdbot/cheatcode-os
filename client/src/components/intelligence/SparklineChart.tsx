// SparklineChart — minimal price sparkline for ticker cards
//
// iOS Safari compatibility notes:
//   - SVG MUST have explicit width/height attributes (not just CSS %) — iOS Safari ignores CSS-only SVG sizing
//   - linearGradient uses gradientUnits="userSpaceOnUse" with absolute coords — objectBoundingBox is buggy on iOS
//   - vectorEffect="non-scaling-stroke" removed — not supported on all iOS versions, use fixed strokeWidth instead
//   - No CSS height:100% on SVG — iOS Safari doesn't resolve % heights inside flex children reliably
//   - Hardware acceleration (translateZ) on container to force compositing layer
//   - Synthetic data initialized immediately — no blank state on first paint, no ResizeObserver needed
import { useEffect, useState } from "react";

interface SparklineChartProps {
  symbol: string;
  color: string;
  height?: number;
  width?: number;   // Pass explicit pixel width for iOS Safari reliability
  price?: number;
  changePct?: number;
}

const _cache: Record<string, { data: number[]; ts: number }> = {};
const CACHE_TTL = 5 * 60 * 1000;

function buildSparklineFromQuote(q: {
  price: number; open: number; high: number; low: number;
  close: number; prev_close: number;
}): number[] {
  const { prev_close, open, high, low, close } = q;
  const isUp = close >= open;
  const range = high - low || Math.abs(close - prev_close) * 2 || close * 0.01;
  return [
    prev_close, open,
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

function buildSyntheticSparkline(price: number, changePct: number): number[] {
  const isUp = changePct >= 0;
  const base = price || 100;
  const totalMove = Math.max(base * Math.abs(changePct) / 100, base * 0.005);
  const noise = (i: number) => Math.sin(i * 2.3 + base * 0.01) * totalMove * 0.15;
  if (isUp) {
    return [
      base - totalMove * 0.8,  base - totalMove * 0.9 + noise(0),
      base - totalMove * 1.0 + noise(1), base - totalMove * 0.85 + noise(2),
      base - totalMove * 0.6 + noise(3), base - totalMove * 0.4 + noise(4),
      base - totalMove * 0.2 + noise(5), base - totalMove * 0.1 + noise(6),
      base + noise(7), base,
    ];
  } else {
    return [
      base + totalMove * 0.8,  base + totalMove * 0.9 + noise(0),
      base + totalMove * 0.7 + noise(1), base + totalMove * 0.5 + noise(2),
      base + totalMove * 0.3 + noise(3), base + totalMove * 0.15 + noise(4),
      base + noise(5), base - totalMove * 0.3 + noise(6),
      base - totalMove * 0.6 + noise(7), base,
    ];
  }
}

async function fetchSparklineData(symbol: string, price?: number, changePct?: number): Promise<number[]> {
  const cached = _cache[symbol];
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

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
  } catch { /* fall through */ }

  try {
    const res = await fetch(`/api/v1/market/quote/${encodeURIComponent(symbol)}`);
    if (res.ok) {
      const q = await res.json();
      if (q && q.price) {
        const data = buildSparklineFromQuote({
          price: q.price, open: q.open ?? q.price,
          high: q.high ?? q.price * 1.005, low: q.low ?? q.price * 0.995,
          close: q.close ?? q.price, prev_close: q.prev_close ?? q.price * 0.99,
        });
        _cache[symbol] = { data, ts: Date.now() };
        return data;
      }
    }
  } catch { /* fall through */ }

  const data = buildSyntheticSparkline(price ?? 100, changePct ?? 0);
  _cache[symbol] = { data, ts: Date.now() };
  return data;
}

// Internal SVG coordinate space
const VB_W = 100;
const VB_H = 40;

function SvgSparkline({
  values, color, svgW, svgH
}: { values: number[]; color: string; svgW: number; svgH: number }) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = range * 0.15;
  const domainMin = min - pad;
  const domainRange = (max + pad) - domainMin;

  const toX = (i: number) => (i / (values.length - 1)) * VB_W;
  const toY = (v: number) => VB_H - ((v - domainMin) / domainRange) * VB_H;

  const points = values.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const linePath = values.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${VB_W},${VB_H} L0,${VB_H} Z`;

  // Unique gradient ID per chart instance to avoid iOS Safari defs collision
  const gradId = `sg-${color.replace("#", "")}-${Math.abs(Math.round(values[0]))}-${svgW}`;

  return (
    // iOS Safari REQUIRES explicit width/height attributes on SVG elements
    // CSS width:100% alone is unreliable inside overflow-x:auto on iOS Safari
    <svg
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <defs>
        {/* iOS Safari fix: gradientUnits="userSpaceOnUse" with absolute coords is more reliable */}
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2={VB_H} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      {/* iOS Safari fix: fixed strokeWidth in SVG units — vectorEffect not supported on all iOS */}
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

export function SparklineChart({
  symbol, color, height = 40, width: widthProp, price, changePct
}: SparklineChartProps) {
  // Initialize with synthetic data immediately — no blank state on first paint
  const [values, setValues] = useState<number[]>(() =>
    buildSyntheticSparkline(price ?? 100, changePct ?? 0)
  );

  useEffect(() => {
    let cancelled = false;
    fetchSparklineData(symbol, price, changePct).then(d => {
      if (!cancelled && d.length >= 3) setValues(d);
    });
    return () => { cancelled = true; };
  }, [symbol, price, changePct]);

  // Use explicit width prop if provided (preferred for iOS Safari)
  // Fall back to a sensible default — the SVG will still render at this size
  const svgW = widthProp ?? 104;

  return (
    <div
      style={{
        width: svgW,
        height,
        display: "block",
        flexShrink: 0,
        // iOS Safari: force hardware compositing layer
        WebkitTransform: "translateZ(0)",
        transform: "translateZ(0)",
      }}
    >
      <SvgSparkline values={values} color={color} svgW={svgW} svgH={height} />
    </div>
  );
}
