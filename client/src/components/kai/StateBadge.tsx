// StateBadge — forming/triggered/invalid/watching pill
// Compact mode = single colored dot (used in dense list rows)
import type { CSSProperties } from "react";
import type { KaiTickerState } from "@/lib/kai/types";

interface Config {
  bg: string;
  border: string;
  fg: string;
  label: string;
  dot: string;
  pulse?: boolean;
}

const CONFIG: Record<KaiTickerState, Config> = {
  forming: {
    bg: "transparent",
    border: "var(--kai-border-light)",
    fg: "var(--kai-green-dim)",
    label: "FORMING",
    dot: "var(--kai-green)",
  },
  triggered: {
    bg: "color-mix(in oklab, var(--kai-green) 12%, transparent)",
    border: "var(--kai-green)",
    fg: "var(--kai-green)",
    label: "TRIGGERED",
    dot: "var(--kai-green)",
    pulse: true,
  },
  invalidated: {
    bg: "transparent",
    border: "color-mix(in oklab, var(--kai-red) 50%, transparent)",
    fg: "var(--kai-red)",
    label: "INVALID",
    dot: "var(--kai-red)",
  },
  watching: {
    bg: "transparent",
    border: "var(--kai-border-light)",
    fg: "var(--kai-text-muted)",
    label: "WATCH",
    dot: "var(--kai-text-muted)",
  },
};

interface Props {
  state: KaiTickerState;
  compact?: boolean;
}

export function StateBadge({ state, compact = false }: Props) {
  const cfg = CONFIG[state] ?? CONFIG.watching;

  if (compact) {
    // Distinct shape per state — color alone fails for color-blind users
    // and at-a-glance scanning of long lists.
    if (state === "triggered") {
      // Filled pulsing dot
      const dot: CSSProperties = {
        width: 6, height: 6, borderRadius: "9999px",
        background: cfg.dot, flexShrink: 0,
      };
      return <span style={dot} className="kai-pulse" aria-label={cfg.label} />;
    }
    if (state === "forming") {
      // Outlined ring
      const ring: CSSProperties = {
        width: 7, height: 7, borderRadius: "9999px",
        border: `1.5px solid ${cfg.dot}`, background: "transparent",
        flexShrink: 0,
      };
      return <span style={ring} aria-label={cfg.label} />;
    }
    if (state === "invalidated") {
      // Slash bar
      const slash: CSSProperties = {
        width: 8, height: 2, background: cfg.dot,
        flexShrink: 0, transform: "rotate(-20deg)",
      };
      return <span style={slash} aria-label={cfg.label} />;
    }
    // watching — small open square
    const sq: CSSProperties = {
      width: 6, height: 6,
      border: `1px solid ${cfg.dot}`, background: "transparent",
      flexShrink: 0,
    };
    return <span style={sq} aria-label={cfg.label} />;
  }

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-mono tracking-[0.1em] uppercase border shrink-0 ${cfg.pulse ? "animate-pulse" : ""}`}
      style={{ background: cfg.bg, color: cfg.fg, borderColor: cfg.border }}
    >
      {cfg.label}
    </span>
  );
}
