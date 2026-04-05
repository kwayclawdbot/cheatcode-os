// CandlestickChart — lightweight-charts v5 wrapper
// Fetches 60-day OHLCV from Yahoo Finance, renders candlestick chart,
// draws dashed horizontal price lines for support, resistance, and invalidation.

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  PriceScaleMode,
  LineStyle,
  type IChartApi,
  type CandlestickData,
  type Time,
} from "lightweight-charts";

interface Props {
  symbol: string;
  support: number[];
  resistance: number[];
  invalidation: number | null;
  currentPrice: number | null;
}

async function fetchOHLCV(symbol: string): Promise<CandlestickData<Time>[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=60d`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error("Failed to fetch");
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error("No data");

  const timestamps: number[] = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const opens: number[] = quote.open || [];
  const highs: number[] = quote.high || [];
  const lows: number[] = quote.low || [];
  const closes: number[] = quote.close || [];

  return timestamps
    .map((ts, i) => ({
      time: Math.floor(ts / 86400) * 86400 as Time,
      open: opens[i],
      high: highs[i],
      low: lows[i],
      close: closes[i],
    }))
    .filter(c => c.open != null && c.high != null && c.low != null && c.close != null)
    .sort((a, b) => (a.time as number) - (b.time as number));
}

export function CandlestickChart({ symbol, support, resistance, invalidation }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up any previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "#667085",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#F2F4F7" },
        horzLines: { color: "#F2F4F7" },
      },
      crosshair: {
        vertLine: { color: "#00000018", width: 1, style: LineStyle.Dashed },
        horzLine: { color: "#00000018", width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: {
        borderColor: "#EAECF0",
        mode: PriceScaleMode.Normal,
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      timeScale: {
        borderColor: "#EAECF0",
        timeVisible: false,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScroll: false,
      handleScale: false,
      width: containerRef.current.clientWidth,
      height: 240,
    });

    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#4DC820",
      downColor: "#E8193C",
      borderUpColor: "#4DC820",
      borderDownColor: "#E8193C",
      wickUpColor: "#4DC820",
      wickDownColor: "#E8193C",
    });

    // Auto-resize
    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    setLoading(true);
    setError(false);

    fetchOHLCV(symbol)
      .then(candles => {
        series.setData(candles);

        // Draw support lines
        support.forEach(price => {
          series.createPriceLine({
            price,
            color: "#4DC820",
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `S ${price}`,
          });
        });

        // Draw resistance lines
        resistance.forEach(price => {
          series.createPriceLine({
            price,
            color: "#E8193C",
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `R ${price}`,
          });
        });

        // Draw invalidation line
        if (invalidation != null) {
          series.createPriceLine({
            price: invalidation,
            color: "#F79009",
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `Inv ${invalidation}`,
          });
        }

        chart.timeScale().fitContent();
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  return (
    <div className="relative w-full" style={{ height: 240 }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 rounded-xl bg-card">
          <div className="flex flex-col items-center gap-2">
            <div className="w-5 h-5 rounded-full border-2 border-[#4DC820] border-t-transparent animate-spin" />
            <span className="text-xs text-muted-foreground">Loading chart…</span>
          </div>
        </div>
      )}
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 rounded-xl bg-card">
          <span className="text-xs text-muted-foreground">Chart data unavailable</span>
        </div>
      )}
      <div ref={containerRef} className="w-full" style={{ height: 240 }} />
    </div>
  );
}
