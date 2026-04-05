// SparklineChart — minimal price sparkline for ticker cards
// Strategy:
//   1. Try /api/v1/market/sparkline/:symbol (EODHD 30-day history) — when deployed
//   2. Fall back to /api/v1/market/quote/:symbol and synthesize a realistic
//      intraday shape from open/high/low/close/prev_close data
import { useEffect, useState } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

interface SparklineChartProps {
  symbol: string;
  color: string;  // "#4DC820" bullish | "#E8193C" bearish | "#F79009" neutral
  height?: number;
}

// In-memory cache to avoid re-fetching on re-renders
const _cache: Record<string, { data: { v: number }[]; ts: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/** Build a plausible 8-point intraday sparkline from a quote snapshot */
function buildSparklineFromQuote(q: {
  price: number; open: number; high: number; low: number;
  close: number; prev_close: number;
}): { v: number }[] {
  const { prev_close, open, high, low, close } = q;
  const isUp = close >= open;
  const range = high - low;
  const earlyExtreme = isUp ? low + range * 0.25 : high - range * 0.25;
  const lateExtreme  = isUp ? high - range * 0.15 : low + range * 0.15;
  const mid = (high + low) / 2;
  return [
    { v: prev_close },
    { v: open },
    { v: earlyExtreme },
    { v: isUp ? mid * 0.998 : mid * 1.002 },
    { v: isUp ? high : low },
    { v: lateExtreme },
    { v: mid },
    { v: close },
  ];
}

async function fetchSparkline(symbol: string): Promise<{ v: number }[]> {
  const cached = _cache[symbol];
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  // 1. Try the historical sparkline endpoint (EODHD 30-day)
  try {
    const res = await fetch(`/api/v1/market/sparkline/${encodeURIComponent(symbol)}?days=30`);
    if (res.ok) {
      const raw: { t: number; v: number }[] = await res.json();
      if (Array.isArray(raw) && raw.length >= 5) {
        const data = raw.map(p => ({ v: p.v }));
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
      if (q && q.price && q.open && q.high && q.low) {
        const data = buildSparklineFromQuote({
          price:      q.price,
          open:       q.open,
          high:       q.high,
          low:        q.low,
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

export function SparklineChart({ symbol, color, height = 40 }: SparklineChartProps) {
  const [data, setData] = useState<{ v: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSparkline(symbol).then(d => {
      if (!cancelled) {
        setData(d);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [symbol]);

  if (loading || data.length < 3) {
    return (
      <div
        style={{ height, width: "100%" }}
        className={loading ? "animate-pulse bg-muted/40 rounded" : "bg-muted/20 rounded"}
      />
    );
  }

  const gradientId = `spark-${symbol.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
