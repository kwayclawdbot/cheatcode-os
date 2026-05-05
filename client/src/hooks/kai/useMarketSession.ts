// useMarketSession — current US equities session + countdown to next event.
// Honors weekends. Doesn't account for half-days/holidays — close enough
// for the dashboard's status bar; trade alerts come from the engine itself.
import { useEffect, useMemo, useState } from "react";

export type MarketSession = "PREMARKET" | "OPEN" | "AFTER_HOURS" | "CLOSED";

export interface MarketSessionState {
  session: MarketSession;
  label: string;       // "Market Open", "Pre-market", etc.
  countdown: string;   // "1h 14m to close", "opens Mon 9:30am ET"
  color: "green" | "gold" | "muted";
}

// All US equities times in America/New_York
function nyParts(d: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false, weekday: "short",
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: parts.weekday,         // 'Mon' | 'Tue' | ...
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

const PREMARKET_START = 4 * 60;        // 04:00
const OPEN_START      = 9 * 60 + 30;   // 09:30
const OPEN_END        = 16 * 60;       // 16:00
const AH_END          = 20 * 60;       // 20:00

const WEEKEND = new Set(["Sat", "Sun"]);

function fmtCountdown(minutes: number): string {
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h < 24) return m === 0 ? `${h}h` : `${h}h ${m}m`;
  const d = Math.floor(h / 24);
  const remH = h % 24;
  return remH === 0 ? `${d}d` : `${d}d ${remH}h`;
}

function compute(d: Date): MarketSessionState {
  const p = nyParts(d);
  const isWeekend = WEEKEND.has(p.weekday);

  if (isWeekend) {
    // Minutes until Monday 9:30am ET
    const daysToMon = p.weekday === "Sat" ? 2 : 1;
    const remainingToday = 24 * 60 - p.minutes;
    const total = remainingToday + (daysToMon - 1) * 24 * 60 + OPEN_START;
    return {
      session: "CLOSED",
      label: "Markets closed",
      countdown: `Opens ${p.weekday === "Sat" ? "Mon" : "Mon"} · ${fmtCountdown(total)}`,
      color: "muted",
    };
  }
  if (p.minutes < PREMARKET_START) {
    return {
      session: "CLOSED",
      label: "Markets closed",
      countdown: `Pre-market in ${fmtCountdown(PREMARKET_START - p.minutes)}`,
      color: "muted",
    };
  }
  if (p.minutes < OPEN_START) {
    return {
      session: "PREMARKET",
      label: "Pre-market",
      countdown: `Open in ${fmtCountdown(OPEN_START - p.minutes)}`,
      color: "gold",
    };
  }
  if (p.minutes < OPEN_END) {
    return {
      session: "OPEN",
      label: "Market open",
      countdown: `${fmtCountdown(OPEN_END - p.minutes)} to close`,
      color: "green",
    };
  }
  if (p.minutes < AH_END) {
    return {
      session: "AFTER_HOURS",
      label: "After-hours",
      countdown: `Close in ${fmtCountdown(AH_END - p.minutes)}`,
      color: "gold",
    };
  }
  // Past 8pm — closed until next weekday 4am
  const isFriday = p.weekday === "Fri";
  if (isFriday) {
    const total = 24 * 60 - p.minutes + 2 * 24 * 60 + PREMARKET_START;
    return {
      session: "CLOSED",
      label: "Markets closed",
      countdown: `Opens Mon · ${fmtCountdown(total)}`,
      color: "muted",
    };
  }
  return {
    session: "CLOSED",
    label: "Markets closed",
    countdown: `Pre-market in ${fmtCountdown(24 * 60 - p.minutes + PREMARKET_START)}`,
    color: "muted",
  };
}

export function useMarketSession(): MarketSessionState {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    // Update every 30s — countdown granular to the minute
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return useMemo(() => compute(now), [now]);
}
