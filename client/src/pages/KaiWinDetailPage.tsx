// KaiWinDetailPage — viral, screenshot-driven detail page for /kai/wins/:ticker.
// Built for IG / TikTok share — bold gradients, massive numbers, glowing peak %,
// candle chart with entry+peak+stop markers, Kai's original thesis, perf tiles,
// and a one-tap "Share PNG" that exports a 1080×1080 card via html-to-image.
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Check, Download, Link2, Share2, TrendingDown, TrendingUp } from "lucide-react";
import {
  AreaSeries,
  createChart,
  CrosshairMode,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type Time,
} from "lightweight-charts";
import { toPng } from "html-to-image";
import { createPortal } from "react-dom";
import { useKaiWinDetail, type KaiWinDetail, type KaiOhlcBar } from "@/hooks/kai/useKaiWinDetail";
import { ShareCard, SHARE_SIZES, type ShareSize } from "@/components/kai/ShareCard";

interface Props {
  ticker: string;
}

const ET_DATE_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function dateToTime(iso: string): Time {
  return iso.slice(0, 10) as Time;
}

export function KaiWinDetailPage({ ticker }: Props) {
  const [, navigate] = useLocation();
  const { detail, loading, error } = useKaiWinDetail(ticker);

  if (loading) {
    return (
      <div className="kai-module min-h-screen flex items-center justify-center">
        <div className="font-mono text-[11px] tracking-[0.2em] uppercase opacity-60">
          Loading {ticker}…
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="kai-module min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <div className="font-mono text-[11px] tracking-[0.2em] uppercase" style={{ color: "var(--kai-red)" }}>
          {error ?? "Not found"}
        </div>
        <button
          type="button"
          onClick={() => navigate("/kai/wins")}
          className="font-mono text-[11px] tracking-[0.2em] uppercase px-3 py-2 rounded-sm"
          style={{ background: "var(--kai-gold)", color: "var(--kai-bg)" }}
        >
          ← Back to wins
        </button>
      </div>
    );
  }

  return <KaiWinDetailInner detail={detail} />;
}

function KaiWinDetailInner({ detail }: { detail: KaiWinDetail }) {
  const [, navigate] = useLocation();
  const isLong = detail.direction === "long";
  const isWin = (detail.best.peak_pct ?? 0) > 0;
  const accent = isLong ? "#10b981" : "#f43f5e"; // emerald / rose
  const accentDark = isLong ? "#047857" : "#9f1239";
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: "#0a0a0c",
        color: "#f5f1e8",
        fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, monospace)",
      }}
    >
      {/* Top bar */}
      <div className="sticky top-0 z-50 backdrop-blur-md" style={{ background: "rgba(10,10,12,0.7)" }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/kai/wins")}
            className="flex items-center gap-1.5 text-[11px] tracking-[0.18em] uppercase opacity-70 hover:opacity-100 transition-opacity"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Wins
          </button>
          <ShareControls detail={detail} />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-16">
        {/* Hero card — this is the section captured for share PNG */}
        <div
          ref={cardRef}
          className="relative overflow-hidden rounded-3xl mt-4"
          style={{
            background: `radial-gradient(120% 80% at 0% 0%, ${accent}22, transparent 60%), radial-gradient(120% 80% at 100% 100%, ${accent}1a, transparent 55%), linear-gradient(180deg, #18181c 0%, #0e0e10 100%)`,
            border: `1px solid ${accent}33`,
          }}
        >
          {/* Glow blob */}
          <div
            className="absolute -top-32 -right-20 w-96 h-96 rounded-full opacity-30 blur-3xl pointer-events-none"
            style={{ background: accent }}
          />
          <div className="relative z-10 p-6 md:p-10">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[10px] tracking-[0.3em] uppercase px-2 py-0.5 rounded-sm"
                style={{ background: `${accent}26`, color: accent }}
              >
                {isLong ? "Long Call" : "Short Call"}
              </span>
              {detail.is_big_name && (
                <span
                  className="text-[10px] tracking-[0.3em] uppercase px-2 py-0.5 rounded-sm"
                  style={{ background: "rgba(176,127,30,0.2)", color: "#e8b755" }}
                >
                  ★ Big Name
                </span>
              )}
              {detail.best.sector && (
                <span className="text-[10px] tracking-[0.3em] uppercase opacity-50">
                  {detail.best.sector}
                </span>
              )}
            </div>

            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <div
                  className="font-black tracking-tight leading-none"
                  style={{
                    fontSize: "clamp(56px, 11vw, 124px)",
                    fontFamily: "var(--font-display, Inter, system-ui, sans-serif)",
                    background: `linear-gradient(180deg, #ffffff 0%, ${accent} 140%)`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                    letterSpacing: "-0.04em",
                  }}
                >
                  {detail.ticker}
                </div>
                <div className="mt-2 text-[11px] tracking-[0.25em] uppercase opacity-60">
                  K.AI Alert · {ET_DATE_FMT.format(new Date(detail.best.sent_at))} ET
                </div>
              </div>
              <div className="text-right">
                <AnimatedPct value={detail.best.peak_pct ?? 0} accent={accent} />
                <div className="text-[11px] tracking-[0.25em] uppercase opacity-60 mt-1">
                  {isLong ? "Peak Gain" : "Peak Drop"}
                </div>
              </div>
            </div>

            {/* Entry → Peak strip */}
            <div className="mt-8 grid grid-cols-3 gap-3">
              <PriceTile label="Entry" value={fmtMoney(detail.best.alert_price)} />
              <PriceTile
                label="Peak"
                value={fmtMoney(detail.best.peak_price)}
                accent={accent}
                glow
              />
              <PriceTile
                label={detail.best.days_to_peak !== null ? "Days to Peak" : "Status"}
                value={
                  detail.best.days_to_peak !== null
                    ? `${detail.best.days_to_peak}d`
                    : "Open"
                }
              />
            </div>

            {/* Chart */}
            <div className="mt-8 -mx-2">
              <KaiAlertChart
                bars={detail.ohlc}
                entry={detail.best.alert_price}
                peak={detail.best.peak_price}
                stop={detail.best.stop_price}
                alertDate={detail.best.sent_at.slice(0, 10)}
                peakDate={detail.best.peak_date}
                isLong={isLong}
                accent={accent}
                accentDark={accentDark}
              />
            </div>

            <div className="mt-6 flex items-center justify-between text-[10px] tracking-[0.2em] uppercase opacity-50">
              <span>cheatcode.ai · K.AI</span>
              <span>{detail.all_alerts.length} alert{detail.all_alerts.length === 1 ? "" : "s"} in 60d</span>
            </div>
          </div>
        </div>

        {/* Performance tiles */}
        <PerfBreakdown perf={detail.performance} accent={accent} />

        {/* Kai's thesis */}
        {detail.best.thesis && (
          <div
            className="mt-6 p-6 rounded-2xl"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold"
                style={{ background: "linear-gradient(135deg, #B07F1E, #6B4D17)", color: "#0a0a0c" }}
              >
                K
              </div>
              <span className="text-[10px] tracking-[0.25em] uppercase opacity-60">Kai's Read</span>
              {detail.best.setup_label && (
                <span
                  className="text-[10px] tracking-[0.2em] uppercase px-2 py-0.5 rounded-sm ml-auto"
                  style={{ background: `${accent}1a`, color: accent }}
                >
                  {detail.best.setup_label}
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed opacity-90" style={{ color: "#e8e3d6" }}>
              {detail.best.thesis}
            </p>
          </div>
        )}

        {/* All alerts */}
        {detail.all_alerts.length > 1 && (
          <div className="mt-6">
            <h3 className="text-[10px] tracking-[0.25em] uppercase opacity-60 mb-3">
              All {detail.all_alerts.length} Alerts (60d)
            </h3>
            <div className="space-y-2">
              {detail.all_alerts.map((a, i) => {
                const pct = (((detail.best.peak_price ?? 0) / a.alert_price) - 1) * 100;
                return (
                  <div
                    key={`${a.sent_at}-${i}`}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div className="text-[11px] tracking-[0.15em] uppercase opacity-70">
                      {ET_DATE_FMT.format(new Date(a.sent_at))} ET
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="opacity-60 tabular-nums">{fmtMoney(a.alert_price)}</span>
                      <span
                        className="tabular-nums font-bold"
                        style={{ color: pct >= 0 ? accent : "#94a3b8" }}
                      >
                        {fmtPct(pct)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PriceTile({
  label,
  value,
  accent,
  glow,
}: {
  label: string;
  value: string;
  accent?: string;
  glow?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-3 md:p-4"
      style={{
        background: glow
          ? `linear-gradient(180deg, ${accent}1a 0%, ${accent}05 100%)`
          : "rgba(255,255,255,0.04)",
        border: `1px solid ${glow ? `${accent}40` : "rgba(255,255,255,0.06)"}`,
        boxShadow: glow ? `0 0 30px ${accent}33` : "none",
      }}
    >
      <div className="text-[9px] tracking-[0.25em] uppercase opacity-50">{label}</div>
      <div
        className="text-2xl md:text-3xl font-black tabular-nums mt-1"
        style={{ color: accent ?? "#f5f1e8", letterSpacing: "-0.02em" }}
      >
        {value}
      </div>
    </div>
  );
}

function AnimatedPct({ value, accent }: { value: number; accent: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 900;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const Icon = value >= 0 ? TrendingUp : TrendingDown;
  return (
    <div className="flex items-center justify-end gap-2">
      <Icon className="w-7 h-7 md:w-9 md:h-9" style={{ color: accent }} />
      <div
        className="font-black tabular-nums leading-none"
        style={{
          fontSize: "clamp(48px, 9vw, 96px)",
          background: `linear-gradient(180deg, ${accent} 0%, ${accent}aa 100%)`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          letterSpacing: "-0.04em",
          textShadow: `0 0 40px ${accent}66`,
        }}
      >
        {value >= 0 ? "+" : ""}
        {shown.toFixed(1)}%
      </div>
    </div>
  );
}

function PerfBreakdown({
  perf,
  accent,
}: {
  perf: KaiWinDetail["performance"];
  accent: string;
}) {
  const tiles: { label: string; value: number | null }[] = [
    { label: "5m", value: perf.gain_5min },
    { label: "15m", value: perf.gain_15min },
    { label: "30m", value: perf.gain_30min },
    { label: "1h", value: perf.gain_1hour },
    { label: "1d", value: perf.gain_1day },
    { label: "3d", value: perf.gain_3day },
    { label: "1w", value: perf.gain_1week },
  ];
  const present = tiles.filter((t) => t.value !== null && t.value !== undefined);
  if (present.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-[10px] tracking-[0.25em] uppercase opacity-60 mb-3">
        Move at each timeframe
      </h3>
      <div className="grid grid-cols-7 gap-1.5 md:gap-2">
        {tiles.map((t) => {
          const positive = (t.value ?? 0) >= 0;
          const present = t.value !== null && t.value !== undefined;
          return (
            <div
              key={t.label}
              className="rounded-lg p-2 md:p-3 text-center"
              style={{
                background: present
                  ? positive
                    ? `linear-gradient(180deg, ${accent}22 0%, ${accent}08 100%)`
                    : "linear-gradient(180deg, rgba(244,63,94,0.15) 0%, rgba(244,63,94,0.04) 100%)"
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${
                  present
                    ? positive
                      ? `${accent}40`
                      : "rgba(244,63,94,0.3)"
                    : "rgba(255,255,255,0.06)"
                }`,
              }}
            >
              <div className="text-[9px] tracking-[0.2em] uppercase opacity-50">{t.label}</div>
              <div
                className="text-xs md:text-sm font-bold tabular-nums mt-0.5"
                style={{
                  color: !present ? "#666" : positive ? accent : "#f43f5e",
                }}
              >
                {present ? fmtPct(t.value) : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KaiAlertChart({
  bars,
  entry,
  peak,
  stop,
  alertDate,
  peakDate,
  isLong,
  accent,
  accentDark,
}: {
  bars: KaiOhlcBar[];
  entry: number;
  peak: number | null;
  stop: number | null;
  alertDate: string;
  peakDate: string | null;
  isLong: boolean;
  accent: string;
  accentDark: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || bars.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "rgba(245,241,232,0.5)",
        fontFamily: "ui-monospace, SFMono-Regular, monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      rightPriceScale: { borderColor: "transparent" },
      timeScale: { borderColor: "transparent", timeVisible: false },
      crosshair: { mode: CrosshairMode.Magnet },
      handleScroll: false,
      handleScale: false,
      width: containerRef.current.clientWidth,
      height: 280,
    });
    chartRef.current = chart;

    const series = chart.addSeries(AreaSeries, {
      lineColor: accent,
      lineWidth: 2,
      topColor: `${accent}80`,
      bottomColor: `${accent}00`,
      priceLineVisible: false,
      lastValueVisible: false,
    }) as ISeriesApi<"Area">;

    const data: LineData[] = bars.map((b) => ({
      time: dateToTime(b.date),
      value: b.close,
    }));
    series.setData(data);

    // Horizontal lines for entry / peak / stop
    series.createPriceLine({
      price: entry,
      color: "rgba(245,241,232,0.6)",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: `entry ${entry.toFixed(2)}`,
    });
    if (peak !== null) {
      series.createPriceLine({
        price: peak,
        color: accent,
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: `peak ${peak.toFixed(2)}`,
      });
    }
    if (stop !== null) {
      series.createPriceLine({
        price: stop,
        color: "rgba(244,63,94,0.6)",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `stop ${stop.toFixed(2)}`,
      });
    }

    // Vertical date markers
    const markers: { time: Time; color: string; text: string; position: "aboveBar" | "belowBar"; shape: "arrowUp" | "arrowDown" }[] = [];
    if (bars.find((b) => b.date >= alertDate)) {
      markers.push({
        time: dateToTime(alertDate),
        color: "#f5f1e8",
        text: "Alert",
        position: isLong ? "belowBar" : "aboveBar",
        shape: isLong ? "arrowUp" : "arrowDown",
      });
    }
    if (peakDate && bars.find((b) => b.date >= peakDate)) {
      markers.push({
        time: dateToTime(peakDate),
        color: accent,
        text: "Peak",
        position: "aboveBar",
        shape: "arrowDown",
      });
    }
    // lightweight-charts v5: createSeriesMarkers helper (back-compat: try setMarkers as well)
    type WithMarkers = typeof series & { setMarkers?: (m: typeof markers) => void };
    const seriesWithMarkers = series as WithMarkers;
    if (typeof seriesWithMarkers.setMarkers === "function") {
      seriesWithMarkers.setMarkers(markers);
    }

    chart.timeScale().fitContent();

    const onResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [bars, entry, peak, stop, alertDate, peakDate, isLong, accent, accentDark]);

  if (bars.length === 0) {
    return (
      <div
        className="h-[280px] rounded-xl flex items-center justify-center text-[10px] tracking-[0.2em] uppercase opacity-40"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
      >
        Chart unavailable
      </div>
    );
  }

  return <div ref={containerRef} className="w-full" style={{ height: 280 }} />;
}

function ShareControls({ detail }: { detail: KaiWinDetail }) {
  const [size, setSize] = useState<ShareSize>("square");
  const [busy, setBusy] = useState(false);
  const [pendingCapture, setPendingCapture] = useState<null | "download" | "share">(null);
  const [copied, setCopied] = useState(false);
  const offscreenRef = useRef<HTMLDivElement | null>(null);

  const copyShareUrl = async () => {
    const shareUrl = `${window.location.origin}/kai/wins/${detail.ticker}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback: open prompt
      window.prompt("Copy this URL", shareUrl);
    }
  };

  // When pendingCapture is set, the offscreen ShareCard is mounted; capture it on next paint.
  useEffect(() => {
    if (!pendingCapture || !offscreenRef.current) return;
    const action = pendingCapture;
    const node = offscreenRef.current;
    const target = SHARE_SIZES[size];
    const run = async () => {
      try {
        // Wait two frames so the portal definitely paints before capture.
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const dataUrl = await toPng(node, {
          cacheBust: true,
          pixelRatio: 1, // Card is already at full pixel size
          width: target.w,
          height: target.h,
          backgroundColor: "#0a0a0c",
        });
        const filename = `kai-${detail.ticker}-${size}-${Date.now()}.png`;
        if (action === "share") {
          const navWithShare = navigator as Navigator & {
            canShare?: (d: ShareData) => boolean;
            share?: (d: ShareData) => Promise<void>;
          };
          if (navWithShare.share) {
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], filename, { type: "image/png" });
            if (navWithShare.canShare?.({ files: [file] })) {
              await navWithShare.share({ files: [file], title: `K.AI ${detail.ticker}` });
              return;
            }
          }
        }
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = filename;
        a.click();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("PNG export failed", e);
      } finally {
        setPendingCapture(null);
        setBusy(false);
      }
    };
    run();
  }, [pendingCapture, size, detail]);

  const trigger = (action: "download" | "share") => {
    setBusy(true);
    setPendingCapture(action);
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        {/* Size selector */}
        <div
          className="flex items-center rounded-md p-0.5"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          {(["square", "story", "banner"] as ShareSize[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className="px-2 py-1 text-[9px] tracking-[0.18em] uppercase rounded-sm transition-colors"
              style={{
                background: s === size ? "var(--kai-gold, #B07F1E)" : "transparent",
                color: s === size ? "#0a0a0c" : "#f5f1e8aa",
                fontWeight: 700,
              }}
              title={`${SHARE_SIZES[s].w}×${SHARE_SIZES[s].h}`}
            >
              {s === "square" ? "1:1" : s === "story" ? "9:16" : "OG"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={copyShareUrl}
          className="flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase px-3 py-2 rounded-md transition-opacity"
          style={{
            background: copied
              ? "color-mix(in oklab, #10b981 20%, transparent)"
              : "rgba(255,255,255,0.06)",
            border: copied ? "1px solid #10b98166" : "1px solid rgba(255,255,255,0.1)",
            color: copied ? "#10b981" : "#f5f1e8",
          }}
          title="Copy a share-friendly link with auto-generated preview image"
        >
          {copied ? <Check className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
          {copied ? "Copied" : "Link"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => trigger("download")}
          className="flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase px-3 py-2 rounded-md transition-opacity"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#f5f1e8",
            opacity: busy ? 0.5 : 1,
          }}
        >
          <Download className="w-3 h-3" />
          PNG
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => trigger("share")}
          className="flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase px-3 py-2 rounded-md transition-opacity"
          style={{
            background: "linear-gradient(135deg, #B07F1E, #6B4D17)",
            color: "#0a0a0c",
            opacity: busy ? 0.5 : 1,
          }}
        >
          <Share2 className="w-3 h-3" />
          Share
        </button>
      </div>

      {/* Offscreen capture surface — mounted only while we're capturing */}
      {pendingCapture && createPortal(
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            opacity: 0,
            pointerEvents: "none",
            zIndex: -1,
          }}
        >
          <div ref={offscreenRef}>
            <ShareCard detail={detail} size={size} />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
