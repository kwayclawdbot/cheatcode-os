// ScoreDot — small numeric badge with color tier
// Tiers calibrated against the trigger engine's V4 score distribution
// (observed range: ~40 to ~130, top picks score 95+).
import type { CSSProperties } from "react";

interface Props {
  score: number;
  size?: "xs" | "sm";
}

export function ScoreDot({ score, size = "sm" }: Props) {
  const color =
    score >= 110 ? "var(--kai-gold)"
    : score >= 95  ? "var(--kai-green)"
    : score >= 80  ? "var(--kai-green-dim)"
    : score >= 60  ? "var(--kai-text-muted)"
    : "var(--kai-text-dim)";

  const dotSize = size === "xs" ? 5 : 6;
  const fontSize = size === "xs" ? 10 : 11;

  const dotStyle: CSSProperties = {
    width: dotSize,
    height: dotSize,
    background: color,
    borderRadius: "9999px",
    flexShrink: 0,
  };

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span style={dotStyle} />
      <span className="font-mono tabular-nums" style={{ color, fontSize }}>
        {score}
      </span>
    </div>
  );
}
