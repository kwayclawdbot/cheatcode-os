// ShareCard — self-contained, fixed-aspect render of a Kai win for PNG export.
// Three sizes: square (1080×1080 IG), story (1080×1920 IG/TikTok), banner (1200×630 OG/Twitter).
// Renders identical visual language to the live detail page hero, but in a
// layout that fills the chosen aspect.
import { TrendingDown, TrendingUp } from "lucide-react";
import type { KaiWinDetail } from "@/hooks/kai/useKaiWinDetail";

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

      {/* Entry → Peak rail */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          marginTop: isBanner ? 0 : 48,
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
