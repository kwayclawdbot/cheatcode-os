/**
 * CheatCode ALGO Chart — lightweight-charts with RSI heatmap candles,
 * SuperTrend cloud, buy/sell signals, trade levels, reversal bands, EMA clouds.
 */

import { useEffect, useRef, useState } from "react";
import { createChart, type IChartApi, type ISeriesApi, ColorType } from "lightweight-charts";
import { fetchChartData } from "@/lib/api";

interface CheatCodeChartProps {
  symbol: string;
  sensitivity?: "low" | "medium" | "high";
  period?: "d" | "w" | "m";
  height?: number;
  showReversalBands?: boolean;
  showEmaClouds?: boolean;
  showTradeLines?: boolean;
  colorScheme?: "heatmap" | "skittlez";
}

export function CheatCodeChart({
  symbol,
  sensitivity = "medium",
  period = "d",
  height = 500,
  showReversalBands = false,
  showEmaClouds = false,
  showTradeLines = true,
  colorScheme = "heatmap",
}: CheatCodeChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);

  // Fetch data
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchChartData(symbol, sensitivity, period, 200, colorScheme)
      .then((d) => {
        if (d.error) {
          setError(d.error);
        } else {
          setData(d);
          setMetadata(d.metadata);
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [symbol, sensitivity, period, colorScheme]);

  // Render chart
  useEffect(() => {
    if (!data || !containerRef.current) return;

    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#080d14" },
        textColor: "#667085",
        fontFamily: "'SF Mono', 'Fira Code', monospace",
      },
      grid: {
        vertLines: { color: "#1e2a3a" },
        horzLines: { color: "#1e2a3a" },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: "#00AEEF", width: 1, style: 2, labelBackgroundColor: "#00AEEF" },
        horzLine: { color: "#00AEEF", width: 1, style: 2, labelBackgroundColor: "#00AEEF" },
      },
      rightPriceScale: {
        borderColor: "#1e2a3a",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "#1e2a3a",
        timeVisible: false,
      },
    });

    chartRef.current = chart;

    // 1. Candlestick series with RSI heatmap colors
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: true,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    const candleData = data.candles.map((c: any) => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      color: c.color,
      borderColor: c.borderColor,
      wickColor: c.wickColor,
    }));
    candleSeries.setData(candleData);

    // Buy/sell markers
    if (data.markers?.length) {
      candleSeries.setMarkers(
        data.markers.map((m: any) => ({
          time: m.time,
          position: m.position,
          color: m.color,
          shape: m.shape,
          text: m.text,
          size: 2,
        }))
      );
    }

    // 2. SuperTrend line
    if (data.supertrend?.length) {
      // Split into bullish and bearish segments for different colors
      const bullSeries = chart.addLineSeries({
        color: "#00FF00",
        lineWidth: 2,
        lineStyle: 0,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      const bearSeries = chart.addLineSeries({
        color: "#FF0000",
        lineWidth: 2,
        lineStyle: 0,
        priceLineVisible: false,
        lastValueVisible: false,
      });

      const bullData: any[] = [];
      const bearData: any[] = [];

      for (const pt of data.supertrend) {
        if (pt.color === "#00FF00") {
          bullData.push({ time: pt.time, value: pt.value });
          bearData.push({ time: pt.time, value: NaN });
        } else {
          bearData.push({ time: pt.time, value: pt.value });
          bullData.push({ time: pt.time, value: NaN });
        }
      }

      bullSeries.setData(bullData.filter(d => !isNaN(d.value)));
      bearSeries.setData(bearData.filter(d => !isNaN(d.value)));
    }

    // 3. EMA Clouds
    if (showEmaClouds && data.ema_clouds) {
      const ema5Series = chart.addLineSeries({
        color: "#2ecc71",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      const ema12Series = chart.addLineSeries({
        color: "#2ecc71",
        lineWidth: 1,
        lineStyle: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      const ema34Series = chart.addLineSeries({
        color: "#e67e22",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      const ema50Series = chart.addLineSeries({
        color: "#e67e22",
        lineWidth: 1,
        lineStyle: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      });

      if (data.ema_clouds.ema5) ema5Series.setData(data.ema_clouds.ema5);
      if (data.ema_clouds.ema12) ema12Series.setData(data.ema_clouds.ema12);
      if (data.ema_clouds.ema34) ema34Series.setData(data.ema_clouds.ema34);
      if (data.ema_clouds.ema50) ema50Series.setData(data.ema_clouds.ema50);
    }

    // 4. Reversal Bands
    if (showReversalBands && data.reversal_bands) {
      const bandColors: Record<string, string> = {
        upper_2: "#FFFF0060",
        upper_3: "#FF000060",
        lower_0: "#0000FF60",
        lower_1: "#00FF0060",
      };
      for (const [key, color] of Object.entries(bandColors)) {
        if (data.reversal_bands[key]?.length) {
          const bandSeries = chart.addLineSeries({
            color: color as string,
            lineWidth: 1,
            lineStyle: 2,
            priceLineVisible: false,
            lastValueVisible: false,
          });
          bandSeries.setData(data.reversal_bands[key]);
        }
      }
    }

    // 5. Active trade levels
    if (showTradeLines && data.active_trade) {
      const t = data.active_trade;
      const isLong = t.direction === "long";

      candleSeries.createPriceLine({
        price: t.entry,
        color: "#00AEEF",
        lineWidth: 1,
        lineStyle: 0,
        axisLabelVisible: true,
        title: `Entry ${t.entry}`,
      });
      candleSeries.createPriceLine({
        price: t.sl,
        color: "#FF0000",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `SL ${t.sl}`,
      });
      candleSeries.createPriceLine({
        price: t.tp1,
        color: "#00FF0080",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `TP1 ${t.tp1}`,
      });
      candleSeries.createPriceLine({
        price: t.tp2,
        color: "#00FF0060",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `TP2 ${t.tp2}`,
      });
      candleSeries.createPriceLine({
        price: t.tp3,
        color: "#00FF0040",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `TP3 ${t.tp3}`,
      });
    }

    // Resize handler
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    // Fit content
    chart.timeScale().fitContent();

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [data, showReversalBands, showEmaClouds, showTradeLines, height]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height, background: "#080d14" }}>
        <div className="w-10 h-10 rounded-full border-2 border-[#00AEEF] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center text-sm" style={{ height, background: "#080d14", color: "#667085" }}>
        {error}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Chart */}
      <div ref={containerRef} style={{ width: "100%", height }} />

      {/* Metadata overlay */}
      {metadata && (
        <div className="absolute top-3 left-3 flex items-center gap-3 z-10">
          <span className="text-xs font-bold px-2 py-1 rounded"
                style={{
                  background: metadata.current_trend === 1 ? "#00FF0020" : "#FF000020",
                  color: metadata.current_trend === 1 ? "#00FF00" : "#FF0000",
                  fontFamily: "var(--font-mono)",
                }}>
            {metadata.current_trend === 1 ? "▲ BULL" : "▼ BEAR"}
          </span>
          <span className="text-[10px] px-2 py-1 rounded"
                style={{ background: "#1e2a3a", color: "#667085" }}>
            RSI {metadata.current_rsi}
          </span>
          <span className="text-[10px] px-2 py-1 rounded"
                style={{ background: "#1e2a3a", color: "#667085" }}>
            {metadata.total_signals} signals
          </span>
        </div>
      )}

      {/* Active trade panel */}
      {data?.active_trade && (
        <div className="absolute top-3 right-3 z-10 text-[10px] rounded-lg p-2"
             style={{ background: "#0d1117", border: "1px solid #1e2a3a" }}>
          <div className="font-bold mb-1" style={{ color: data.active_trade.direction === "long" ? "#00FF00" : "#FF0000" }}>
            {data.active_trade.direction.toUpperCase()} @ {data.active_trade.entry}
          </div>
          <div style={{ color: "#FF0000" }}>SL: {data.active_trade.sl}</div>
          <div style={{ color: "#00FF0099" }}>TP1: {data.active_trade.tp1}</div>
          <div style={{ color: "#00FF0077" }}>TP2: {data.active_trade.tp2}</div>
          <div style={{ color: "#00FF0055" }}>TP3: {data.active_trade.tp3}</div>
        </div>
      )}
    </div>
  );
}
