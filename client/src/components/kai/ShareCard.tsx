// ShareCard — self-contained, fixed-aspect render of a Kai win for PNG export.
// Three sizes: square (1080×1080 IG), story (1080×1920 IG/TikTok), banner (1200×630 OG/Twitter).
// Renders identical visual language to the live detail page hero, but in a
// layout that fills the chosen aspect.
import { TrendingDown, TrendingUp } from "lucide-react";
import type { KaiOhlcBar, KaiWinDetail } from "@/hooks/kai/useKaiWinDetail";

export type ShareSize = "square" | "story" | "banner";

const SIZE: Record<ShareSize, { w: number; h: number }> = {
  square: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
  banner: { w: 1200, h: 630 },
};

interface Props {
  detail: KaiWinDetail;
  size: ShareSize;
}

function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// SVG sparkline of close prices since the alert date, with horizontal entry/
// peak/stop reference lines and vertical alert/peak markers. Pure SVG so it
// captures cleanly in html-to-image (lightweight-charts canvas does not).
function ChartSvg({
  bars,
  alertDate,
  peakDate,
  entry,
  peak,
  stop,
  isLong,
  accent,
  width,
  height,
}: {
  bars: KaiOhlcBar[];
  alertDate: string;
  peakDate: string | null;
  entry: number;
  peak: number | null;
  stop: number | null;
  isLong: boolean;
  accent: string;
  width: number;
  height: number;
}) {
  // Trim to bars on/after alert date, capped to 90 trading days.
  const trimmed = bars.filter((b) => b.date >= alertDate).slice(0, 90);
  if (trimmed.length < 2) {
    return (
      <div
        style={{
          width,
          height,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
          fontSize: 12,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          opacity: 0.4,
          color: "#f5f1e8",
        }}
      >
        Chart unavailable
      </div>
    );
  }

  const padX = 24;
  const padTop = 12;
  const padBottom = 28;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;

  // y-domain: include all highs/lows + reference lines so they sit inside
  let yMin = Math.min(...trimmed.map((b) => b.low));
  let yMax = Math.max(...trimmed.map((b) => b.high));
  for (const v of [entry, peak, stop]) {
    if (v == null) continue;
    if (v < yMin) yMin = v;
    if (v > yMax) yMax = v;
  }
  // 4% top/bottom breathing room
  const span = yMax - yMin || 1;
  yMin -= span * 0.04;
  yMax += span * 0.04;

  const xAt = (i: number) => padX + (i / (trimmed.length - 1)) * innerW;
  const yAt = (v: number) => padTop + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  const linePath = trimmed
    .map((b, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(2)} ${yAt(b.close).toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L ${xAt(trimmed.length - 1).toFixed(2)} ${(padTop + innerH).toFixed(2)} L ${xAt(0).toFixed(2)} ${(padTop + innerH).toFixed(2)} Z`;

  // Vertical marker positions
  const findIdx = (d: string) => trimmed.findIndex((b) => b.date >= d);
  const alertIdx = 0; // we trimmed to alert date forward
  const peakIdx = peakDate ? findIdx(peakDate) : -1;

  const gradId = `cc-area-${accent.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", borderRadius: 16, background: "rgba(255,255,255,0.03)" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity={0.55} />
          <stop offset="100%" stopColor={accent} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* horizontal grid */}
      {[0.25, 0.5, 0.75].map((t) => {
        const y = padTop + t * innerH;
        return <line key={t} x1={padX} x2={width - padX} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />;
      })}

      {/* entry / peak / stop reference lines */}
      {[
        { v: entry, color: "rgba(245,241,232,0.55)", dash: "6 4", label: `Entry $${entry.toFixed(2)}` },
        peak != null ? { v: peak, color: accent, dash: "", label: `Peak $${peak.toFixed(2)}` } : null,
        stop != null ? { v: stop, color: "rgba(244,63,94,0.6)", dash: "6 4", label: `Stop $${stop.toFixed(2)}` } : null,
      ]
        .filter(Boolean)
        .map((line, i) => {
          const ln = line as { v: number; color: string; dash: string; label: string };
          const y = yAt(ln.v);
          if (!isFinite(y)) return null;
          return (
            <g key={i}>
              <line
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
                stroke={ln.color}
                strokeWidth={ln.dash ? 1.5 : 2}
                strokeDasharray={ln.dash}
              />
              <text
                x={width - padX - 8}
                y={y - 6}
                textAnchor="end"
                fontFamily="ui-monospace, SFMono-Regular, monospace"
                fontSize={11}
                fill={ln.color}
                style={{ letterSpacing: "0.08em" }}
              >
                {ln.label}
              </text>
            </g>
          );
        })}

      {/* gradient area + line */}
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={accent} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

      {/* vertical markers */}
      {alertIdx >= 0 && (
        <g>
          <line
            x1={xAt(alertIdx)}
            x2={xAt(alertIdx)}
            y1={padTop}
            y2={padTop + innerH}
            stroke="rgba(245,241,232,0.35)"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          <circle cx={xAt(alertIdx)} cy={yAt(trimmed[alertIdx].close)} r={5} fill="#f5f1e8" />
          <text
            x={xAt(alertIdx) + 8}
            y={padTop + 14}
            fontFamily="ui-monospace, SFMono-Regular, monospace"
            fontSize={11}
            fill="#f5f1e8"
            style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}
          >
            Alert
          </text>
        </g>
      )}
      {peakIdx > 0 && (
        <g>
          <line
            x1={xAt(peakIdx)}
            x2={xAt(peakIdx)}
            y1={padTop}
            y2={padTop + innerH}
            stroke={accent}
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.5}
          />
          <circle cx={xAt(peakIdx)} cy={yAt(isLong ? trimmed[peakIdx].high : trimmed[peakIdx].low)} r={6} fill={accent} />
          <text
            x={xAt(peakIdx)}
            y={yAt(isLong ? trimmed[peakIdx].high : trimmed[peakIdx].low) - 12}
            textAnchor="middle"
            fontFamily="ui-monospace, SFMono-Regular, monospace"
            fontSize={12}
            fill={accent}
            style={{ letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}
          >
            Peak
          </text>
        </g>
      )}
    </svg>
  );
}

export function ShareCard({ detail, size }: Props) {
  const { w, h } = SIZE[size];
  const isLong = detail.direction === "long";
  const accent = isLong ? "#10b981" : "#f43f5e";
  const Icon = isLong ? TrendingUp : TrendingDown;
  const peakPct = detail.best.peak_pct ?? 0;

  // Layout knobs scale per aspect
  const isStory = size === "story";
  const isSquare = size === "square";
  const isBanner = size === "banner";

  const tickerSize = isBanner ? 200 : isStory ? 280 : 240;
  const pctSize = isBanner ? 110 : isStory ? 160 : 140;

  return (
    <div
      style={{
        width: `${w}px`,
        height: `${h}px`,
        background: `radial-gradient(120% 80% at 0% 0%, ${accent}33, transparent 60%), radial-gradient(120% 80% at 100% 100%, ${accent}1f, transparent 55%), linear-gradient(180deg, #18181c 0%, #0a0a0c 100%)`,
        color: "#f5f1e8",
        fontFamily: "Inter, system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
        padding: isBanner ? 56 : isStory ? 96 : 80,
        display: "flex",
        flexDirection: isBanner ? "row" : "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
      }}
    >
      {/* Glow */}
      <div
        style={{
          position: "absolute",
          top: -200,
          right: -100,
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: accent,
          opacity: 0.22,
          filter: "blur(120px)",
          pointerEvents: "none",
        }}
      />

      {/* Header chips */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: isBanner ? 0 : 24,
        }}
      >
        <span
          style={{
            fontSize: 14,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            padding: "6px 14px",
            borderRadius: 4,
            background: `${accent}33`,
            color: accent,
            fontWeight: 700,
          }}
        >
          {isLong ? "Long Call" : "Short Call"}
        </span>
        {detail.is_big_name && (
          <span
            style={{
              fontSize: 14,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              padding: "6px 14px",
              borderRadius: 4,
              background: "rgba(176,127,30,0.25)",
              color: "#e8b755",
              fontWeight: 700,
            }}
          >
            ★ Big Name
          </span>
        )}
      </div>

      {/* Main: ticker + peak% */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          flex: isBanner ? 1 : "0 0 auto",
          display: "flex",
          flexDirection: isBanner ? "row" : "column",
          alignItems: isBanner ? "center" : "flex-start",
          justifyContent: "space-between",
          gap: isBanner ? 32 : isStory ? 80 : 48,
        }}
      >
        <div>
          <div
            style={{
              fontSize: tickerSize,
              fontWeight: 900,
              lineHeight: 0.9,
              letterSpacing: "-0.05em",
              background: `linear-gradient(180deg, #ffffff 0%, ${accent} 130%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {detail.ticker}
          </div>
          <div
            style={{
              fontSize: 22,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              opacity: 0.6,
              marginTop: 16,
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
            }}
          >
            K.AI Alert · {new Date(detail.best.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </div>
        </div>
        <div style={{ textAlign: isBanner ? "right" : "left" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              justifyContent: isBanner ? "flex-end" : "flex-start",
            }}
          >
            <Icon style={{ width: pctSize * 0.5, height: pctSize * 0.5, color: accent }} strokeWidth={3} />
            <div
              style={{
                fontSize: pctSize,
                fontWeight: 900,
                lineHeight: 0.9,
                letterSpacing: "-0.04em",
                background: `linear-gradient(180deg, ${accent} 0%, ${accent}cc 100%)`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                textShadow: `0 0 60px ${accent}80`,
              }}
            >
              {peakPct >= 0 ? "+" : ""}{peakPct.toFixed(1)}%
            </div>
          </div>
          <div
            style={{
              fontSize: 22,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              opacity: 0.6,
              marginTop: 12,
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
            }}
          >
            {isLong ? "Peak gain" : "Peak drop"}
            {detail.best.days_to_peak !== null && ` · ${detail.best.days_to_peak}d`}
          </div>
        </div>
      </div>

      {/* Chart — only on tall aspects (square / story); banner is too short */}
      {!isBanner && detail.ohlc?.length >= 2 && (
        <div
          style={{
            position: "relative",
            zIndex: 2,
            marginTop: isStory ? 64 : 32,
          }}
        >
          <ChartSvg
            bars={detail.ohlc}
            alertDate={detail.best.sent_at.slice(0, 10)}
            peakDate={detail.best.peak_date}
            entry={detail.best.alert_price}
            peak={detail.best.peak_price}
            stop={detail.best.stop_price}
            isLong={isLong}
            accent={accent}
            width={w - (isStory ? 192 : 160)}
            height={isStory ? 380 : 240}
          />
        </div>
      )}

      {/* Entry → Peak rail */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          marginTop: isBanner ? 0 : 32,
          padding: "20px 28px",
          borderRadius: 16,
          background: "rgba(255,255,255,0.06)",
          border: `1px solid ${accent}33`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
        }}
      >
        <div>
          <div style={{ fontSize: 13, letterSpacing: "0.25em", textTransform: "uppercase", opacity: 0.55 }}>Entry</div>
          <div style={{ fontSize: 36, fontWeight: 800, marginTop: 6, color: "#f5f1e8" }}>
            {fmtMoney(detail.best.alert_price)}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          }}
        />
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, letterSpacing: "0.25em", textTransform: "uppercase", opacity: 0.55 }}>Peak</div>
          <div style={{ fontSize: 36, fontWeight: 800, marginTop: 6, color: accent }}>
            {fmtMoney(detail.best.peak_price)}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          marginTop: isBanner ? 0 : 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 16,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          opacity: 0.55,
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
        }}
      >
        <span>cheatcode.ai · K.AI</span>
        <span>{detail.all_alerts.length} alert{detail.all_alerts.length === 1 ? "" : "s"} · 60d</span>
      </div>
    </div>
  );
}

export const SHARE_SIZES = SIZE;
