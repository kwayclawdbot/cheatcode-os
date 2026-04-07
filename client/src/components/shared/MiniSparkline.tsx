/**
 * MiniSparkline — lightweight SVG sparkline for trending ticker cards and feed rows.
 * Fetches 50 daily closes from the Railway chart API (minimum limit=50),
 * then slices the last `displayCount` points for the visual.
 * Falls back to a flat line if data is unavailable.
 */
import { useEffect, useState } from "react";
import { fetchChartData } from "@/lib/api";

interface MiniSparklineProps {
  symbol: string;
  width?: number;
  height?: number;
  positive?: boolean; // override color; if undefined, auto-detect from data
  displayCount?: number; // how many candles to show (sliced from end of 50)
  className?: string;
}

export function MiniSparkline({
  symbol,
  width = 80,
  height = 32,
  positive,
  displayCount = 14,
  className = "",
}: MiniSparklineProps) {
  const [points, setPoints] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    setLoading(true);
    // API requires limit >= 50; we fetch 50 and slice the last displayCount
    fetchChartData(symbol.replace(/^[$]/, ""), "medium", "d", 50, "heatmap")
      .then((data: any) => {
        if (cancelled) return;
        if (data?.candles?.length) {
          const closes = data.candles
            .slice(-displayCount)
            .map((c: any) => Number(c.close))
            .filter((n: number) => !isNaN(n) && n > 0);
          setPoints(closes);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [symbol, displayCount]);

  if (loading || points.length < 2) {
    // Animated loading shimmer while fetching
    return (
      <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
        <line
          x1={0} y1={height / 2} x2={width} y2={height / 2}
          stroke="rgba(102,112,133,0.25)" strokeWidth={1.5} strokeLinecap="round"
          strokeDasharray="4 3"
        />
      </svg>
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || min * 0.01 || 1;
  const pad = 3;

  // Normalize to SVG coords
  const xs = points.map((_, i) => (i / (points.length - 1)) * (width - pad * 2) + pad);
  const ys = points.map(v => height - pad - ((v - min) / range) * (height - pad * 2));

  const pathD = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  const areaD = `${pathD} L ${xs[xs.length - 1].toFixed(1)} ${(height + 1).toFixed(1)} L ${xs[0].toFixed(1)} ${(height + 1).toFixed(1)} Z`;

  const isUp = positive !== undefined ? positive : points[points.length - 1] >= points[0];
  const color = isUp ? "#00C47A" : "#E8193C";
  const fillId = `spark-fill-${symbol.replace(/[^a-z0-9]/gi, "")}-${width}`;

  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path d={areaD} fill={`url(#${fillId})`} />
      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      {/* End dot */}
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={2.5} fill={color} />
    </svg>
  );
}
