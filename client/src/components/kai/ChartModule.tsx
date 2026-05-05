// ChartModule — synthetic candlestick + OR/Stop/Target overlay.
// Phase 1: synthetic from KaiSystemPick metadata so users see the markup
// they'll get on alerts. Phase 3 swaps to TradingView MCP screenshot URLs
// cached in Supabase Storage at {ticker}-{date}-{state_hash}.png.
import { useState } from "react";
import { Maximize2, RefreshCw } from "lucide-react";
import type { KaiSystemPick } from "@/lib/kai/types";

interface Props {
  pick: KaiSystemPick;
}

export function ChartModule({ pick }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  // Need entry/stop/target to render overlay; if missing, skip
  if (
    pick.entry_low == null ||
    pick.entry_high == null ||
    pick.stop == null ||
    pick.target == null ||
    pick.or_high == null ||
    pick.or_low == null
  ) {
    return (
      <section
        className="rounded-sm border p-6 text-center text-[11px] font-mono"
        style={{
          borderColor: "var(--kai-border)",
          background: "var(--kai-surface)",
          color: "var(--kai-text-muted)",
        }}
      >
        No setup levels for this ticker yet.
      </section>
    );
  }

  const candles = generateMockCandles(pick);
  const chartHeight = 200;
  const chartWidth = 600;
  const padding = { top: 12, right: 60, bottom: 24, left: 8 };

  const allPrices = candles.flatMap((c) => [c.high, c.low]);
  const yMin = Math.min(...allPrices, pick.stop) * 0.998;
  const yMax = Math.max(...allPrices, pick.target) * 1.002;
  const yRange = yMax - yMin;

  const innerH = chartHeight - padding.top - padding.bottom;
  const innerW = chartWidth - padding.left - padding.right;
  const candleWidth = innerW / candles.length;

  const yToPx = (price: number) => padding.top + ((yMax - price) / yRange) * innerH;
  const xToPx = (i: number) => padding.left + i * candleWidth + candleWidth / 2;

  return (
    <section
      className="border rounded-sm overflow-hidden"
      style={{ borderColor: "var(--kai-border)", background: "var(--kai-surface)" }}
    >
      {/* Header */}
      <div
        className="px-3.5 py-2.5 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--kai-border)" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-mono tracking-[0.2em] uppercase"
            style={{ color: "var(--kai-text)" }}
          >
            Chart · 5min
          </span>
          <span
            className="text-[9px] font-mono tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm"
            style={{
              backgroundColor: "color-mix(in oklab, var(--kai-gold) 15%, transparent)",
              color: "var(--kai-gold)",
            }}
          >
            via TradingView
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={refresh}
            className="-m-1 p-1.5 rounded-sm transition-colors"
            style={{ color: "var(--kai-text-muted)" }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            className="-m-1 p-1.5 rounded-sm"
            style={{ color: "var(--kai-text-muted)" }}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Plot */}
      <div className="relative" style={{ background: "color-mix(in oklab, var(--kai-bg) 80%, black)" }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto"
          style={{ display: "block" }}
          preserveAspectRatio="none"
        >
          {[0.25, 0.5, 0.75].map((p) => (
            <line
              key={p}
              x1={padding.left}
              y1={padding.top + innerH * p}
              x2={chartWidth - padding.right}
              y2={padding.top + innerH * p}
              stroke="var(--kai-border)"
              strokeWidth="0.5"
              strokeDasharray="2,3"
            />
          ))}

          {/* Target zone */}
          <rect
            x={padding.left}
            y={yToPx(pick.target)}
            width={innerW}
            height={Math.max(0, yToPx(pick.entry_high) - yToPx(pick.target))}
            fill="var(--kai-green)"
            fillOpacity="0.06"
          />
          {/* Stop zone */}
          <rect
            x={padding.left}
            y={yToPx(pick.entry_low)}
            width={innerW}
            height={Math.max(0, yToPx(pick.stop) - yToPx(pick.entry_low))}
            fill="var(--kai-red)"
            fillOpacity="0.06"
          />
          {/* OR-high */}
          <line
            x1={padding.left}
            y1={yToPx(pick.or_high)}
            x2={chartWidth - padding.right}
            y2={yToPx(pick.or_high)}
            stroke="var(--kai-gold)"
            strokeWidth="1"
            strokeDasharray="4,2"
          />
          {/* OR-low */}
          <line
            x1={padding.left}
            y1={yToPx(pick.or_low)}
            x2={chartWidth - padding.right}
            y2={yToPx(pick.or_low)}
            stroke="var(--kai-gold)"
            strokeWidth="1"
            strokeDasharray="4,2"
            opacity="0.5"
          />
          <line
            x1={padding.left}
            y1={yToPx(pick.stop)}
            x2={chartWidth - padding.right}
            y2={yToPx(pick.stop)}
            stroke="var(--kai-red)"
            strokeWidth="1"
          />
          <line
            x1={padding.left}
            y1={yToPx(pick.target)}
            x2={chartWidth - padding.right}
            y2={yToPx(pick.target)}
            stroke="var(--kai-green)"
            strokeWidth="1"
          />

          {candles.map((c, i) => {
            const isUp = c.close >= c.open;
            const cx = xToPx(i);
            const yHigh = yToPx(c.high);
            const yLow = yToPx(c.low);
            const yOpen = yToPx(c.open);
            const yClose = yToPx(c.close);
            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(1, Math.abs(yClose - yOpen));
            const bodyW = Math.max(2, candleWidth * 0.6);
            const color = isUp ? "var(--kai-green)" : "var(--kai-red)";
            return (
              <g key={i}>
                <line x1={cx} y1={yHigh} x2={cx} y2={yLow} stroke={color} strokeWidth="1" />
                <rect
                  x={cx - bodyW / 2}
                  y={bodyTop}
                  width={bodyW}
                  height={bodyHeight}
                  fill={color}
                  opacity={isUp ? 1 : 0.85}
                />
              </g>
            );
          })}

          {pick.state === "triggered" && pick.trigger_price && (
            <g>
              <circle
                cx={xToPx(candles.length - 4)}
                cy={yToPx(pick.trigger_price)}
                r="4"
                fill="var(--kai-green)"
              />
              <circle
                cx={xToPx(candles.length - 4)}
                cy={yToPx(pick.trigger_price)}
                r="8"
                fill="none"
                stroke="var(--kai-green)"
                strokeWidth="1"
                opacity="0.5"
              >
                <animate attributeName="r" values="4;12;4" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
              </circle>
            </g>
          )}

          {/* Right-axis labels */}
          <text
            x={chartWidth - padding.right + 4}
            y={yToPx(pick.or_high) + 3}
            fontSize="9"
            fontFamily="JetBrains Mono, monospace"
            fill="var(--kai-gold)"
          >
            OR ${pick.or_high.toFixed(2)}
          </text>
          <text
            x={chartWidth - padding.right + 4}
            y={yToPx(pick.target) + 3}
            fontSize="9"
            fontFamily="JetBrains Mono, monospace"
            fill="var(--kai-green)"
          >
            TP ${pick.target.toFixed(2)}
          </text>
          <text
            x={chartWidth - padding.right + 4}
            y={yToPx(pick.stop) + 3}
            fontSize="9"
            fontFamily="JetBrains Mono, monospace"
            fill="var(--kai-red)"
          >
            SL ${pick.stop.toFixed(2)}
          </text>

          {/* Time axis */}
          <text x={padding.left} y={chartHeight - 6} fontSize="8" fontFamily="JetBrains Mono, monospace" fill="var(--kai-text-muted)">9:30</text>
          <text x={padding.left + innerW * 0.33} y={chartHeight - 6} fontSize="8" fontFamily="JetBrains Mono, monospace" fill="var(--kai-text-muted)">11:00</text>
          <text x={padding.left + innerW * 0.66} y={chartHeight - 6} fontSize="8" fontFamily="JetBrains Mono, monospace" fill="var(--kai-text-muted)">13:00</text>
          <text x={padding.left + innerW * 0.95} y={chartHeight - 6} fontSize="8" fontFamily="JetBrains Mono, monospace" fill="var(--kai-text-muted)" textAnchor="end">15:30</text>
        </svg>
      </div>

      {/* Legend */}
      <div
        className="px-3.5 py-2 flex items-center gap-3 flex-wrap text-[9px] font-mono"
        style={{ borderTop: "1px solid var(--kai-border)", color: "var(--kai-text-muted)" }}
      >
        <div className="flex items-center gap-1">
          <span className="w-2 h-px" style={{ backgroundColor: "var(--kai-gold)", borderTop: "1px dashed" }} />
          <span>OR Range</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-px" style={{ backgroundColor: "var(--kai-green)" }} />
          <span>2R Target</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-px" style={{ backgroundColor: "var(--kai-red)" }} />
          <span>Stop</span>
        </div>
        {pick.state === "triggered" && pick.trigger_time && (
          <div className="flex items-center gap-1">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: "var(--kai-green)" }}
            />
            <span style={{ color: "var(--kai-green)" }}>
              Trigger fired @ {pick.trigger_time}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

// Synthetic 5-min candle generator — replaced by TradingView MCP capture in Phase 3
function generateMockCandles(pick: KaiSystemPick) {
  const out: Array<{ open: number; close: number; high: number; low: number }> = [];
  const numCandles = 78; // 9:30→16:00 in 5-min bars
  if (pick.or_high == null || pick.or_low == null || pick.entry_high == null || pick.target == null) {
    return out;
  }
  const startPrice = (pick.or_high + pick.or_low) / 2 - (pick.or_high - pick.or_low) * 0.3;
  let price = startPrice;
  const targetPrice = pick.state === "triggered" ? pick.target * 0.95 : pick.entry_high;
  const drift = (targetPrice - startPrice) / numCandles;

  for (let i = 0; i < numCandles; i++) {
    const open = price;
    const volatility = (pick.or_high - pick.or_low) * 0.15;
    let close: number, high: number, low: number;
    if (i < 3) {
      close = open + (Math.random() - 0.5) * volatility;
      high = Math.max(open, close) + Math.random() * volatility * 0.5;
      low = Math.min(open, close) - Math.random() * volatility * 0.5;
      if (i === 0) {
        high = pick.or_high * 0.998;
        low = pick.or_low * 1.002;
      }
    } else if (pick.state === "invalidated" && i > 20) {
      close = open - Math.abs(drift) * 1.5 + (Math.random() - 0.5) * volatility;
      high = Math.max(open, close) + Math.random() * volatility * 0.4;
      low = Math.min(open, close) - Math.random() * volatility * 0.6;
    } else {
      close = open + drift + (Math.random() - 0.5) * volatility;
      high = Math.max(open, close) + Math.random() * volatility * 0.5;
      low = Math.min(open, close) - Math.random() * volatility * 0.5;
    }
    out.push({ open, close, high, low });
    price = close;
  }
  return out;
}
