// KaiWinsPage — viral, screenshot-friendly card grid of top Kai alert wins.
// Each card is built to read in <1s on mobile and look great as a screenshot.
import { useState } from "react";
import { ArrowUpRight, Star, TrendingDown, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import { useKaiWins, type KaiWin } from "@/hooks/kai/useKaiWins";

function formatMoney(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function compactDates(dates: string[]): { display: string; tooltip: string } {
  const short = dates.map((d) => d.slice(5)); // MM-DD
  if (short.length <= 2) {
    return { display: short.join(" · "), tooltip: short.join(", ") };
  }
  return {
    display: `${short.slice(0, 2).join(" · ")} +${short.length - 2}`,
    tooltip: short.join(", "),
  };
}

export function KaiWinsPage() {
  const [days, setDays] = useState(60);
  const { wins, loading, error, cached, scanned } = useKaiWins(days, 50);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-baseline justify-between">
          <h1
            className="font-black tracking-tight"
            style={{
              fontSize: "clamp(28px, 6vw, 40px)",
              fontFamily: "var(--font-display, Inter, system-ui, sans-serif)",
              color: "var(--kai-text)",
              letterSpacing: "-0.02em",
            }}
          >
            Top Wins
          </h1>
          <div className="flex gap-1.5">
            {[30, 60, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className="px-2.5 py-1 font-mono text-[10px] tracking-[0.15em] uppercase rounded-md transition-all"
                style={{
                  background: d === days ? "var(--kai-gold)" : "transparent",
                  color: d === days ? "var(--kai-bg)" : "var(--kai-text-muted)",
                  border: "1px solid",
                  borderColor: d === days ? "var(--kai-gold)" : "var(--kai-border)",
                }}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <p
          className="font-mono text-[10px] tracking-[0.1em] mt-1"
          style={{ color: "var(--kai-text-dim)" }}
        >
          Peak before stop · grouped by ticker
          {scanned !== null && ` · ${scanned} alerts scanned`}
          {cached && " · cached"}
        </p>
      </div>

      {loading && (
        <div
          className="font-mono text-[11px] tracking-[0.15em] uppercase py-12 text-center"
          style={{ color: "var(--kai-text-muted)" }}
        >
          Loading wins…
        </div>
      )}

      {error && !loading && (
        <div
          className="font-mono text-[11px] tracking-[0.15em] uppercase py-6 text-center"
          style={{ color: "var(--kai-red)" }}
        >
          {error}
        </div>
      )}

      {!loading && !error && wins.length === 0 && (
        <div
          className="font-mono text-[11px] tracking-[0.15em] uppercase py-12 text-center"
          style={{ color: "var(--kai-text-muted)" }}
        >
          No wins in this window
        </div>
      )}

      {!loading && !error && wins.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {wins.map((w, i) => (
            <WinCard key={`${w.ticker}-${i}`} w={w} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function WinCard({ w, rank }: { w: KaiWin; rank: number }) {
  const [, navigate] = useLocation();
  const isLong = w.direction === "long";
  const accent = isLong ? "#10b981" : "#f43f5e"; // emerald / rose
  const Icon = isLong ? TrendingUp : TrendingDown;
  const dates = compactDates(w.alert_dates ?? [w.sent_at.slice(0, 10)]);

  return (
    <button
      type="button"
      onClick={() => navigate(`/kai/wins/${w.ticker}`)}
      className="relative overflow-hidden rounded-2xl p-4 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
      style={{
        background: `radial-gradient(120% 80% at 100% 0%, ${accent}1f, transparent 60%), linear-gradient(180deg, var(--kai-bg) 0%, var(--kai-bg) 100%)`,
        border: `1px solid ${accent}26`,
        boxShadow: `0 1px 0 0 ${accent}1a inset, 0 0 30px -15px ${accent}40`,
      }}
    >
      {/* Rank chip */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5">
        <span
          className="font-mono text-[9px] tracking-[0.2em] uppercase opacity-50"
          style={{ color: "var(--kai-text-dim)" }}
        >
          #{rank}
        </span>
      </div>

      {/* Top-right: arrow */}
      <ArrowUpRight
        className="absolute top-3 right-3 w-3.5 h-3.5 opacity-30"
        style={{ color: "var(--kai-text)" }}
      />

      <div className="mt-5 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            {w.is_big_name && (
              <Star
                className="w-3.5 h-3.5"
                style={{ color: "var(--kai-gold)", fill: "var(--kai-gold)" }}
              />
            )}
            <span
              className="font-black tracking-tight"
              style={{
                fontSize: "clamp(28px, 5vw, 40px)",
                fontFamily: "var(--font-display, Inter, system-ui, sans-serif)",
                color: "var(--kai-text)",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              {w.ticker}
            </span>
            {w.alert_count > 1 && (
              <span
                className="text-[9px] tracking-[0.1em] px-1.5 py-0.5 rounded-md font-mono"
                style={{
                  background: "color-mix(in oklab, var(--kai-gold) 18%, transparent)",
                  color: "var(--kai-gold)",
                }}
                title={`${w.alert_count} alerts in window`}
              >
                {w.alert_count}×
              </span>
            )}
          </div>
          <div
            className="font-mono text-[9px] tracking-[0.18em] uppercase opacity-50"
            style={{ color: "var(--kai-text-2)" }}
            title={dates.tooltip}
          >
            {isLong ? "long" : "short"} · {dates.display}
          </div>
        </div>

        {/* Big peak % */}
        <div className="text-right shrink-0">
          <div className="flex items-center justify-end gap-1">
            <Icon className="w-4 h-4" style={{ color: accent }} />
            <span
              className="font-black tabular-nums"
              style={{
                fontSize: "clamp(24px, 4.5vw, 36px)",
                color: accent,
                letterSpacing: "-0.02em",
                lineHeight: 1,
                textShadow: `0 0 20px ${accent}40`,
              }}
            >
              {formatPct(w.peak_pct)}
            </span>
          </div>
          <div
            className="font-mono text-[9px] tracking-[0.18em] uppercase opacity-50 mt-1"
            style={{ color: "var(--kai-text-2)" }}
          >
            in {w.days_to_peak}d
          </div>
        </div>
      </div>

      {/* Entry → Peak rail */}
      <div
        className="mt-4 flex items-center justify-between gap-2 px-3 py-2 rounded-lg font-mono tabular-nums"
        style={{
          background: "color-mix(in oklab, var(--kai-text) 4%, transparent)",
        }}
      >
        <div className="flex flex-col">
          <span className="text-[8px] tracking-[0.18em] uppercase opacity-50" style={{ color: "var(--kai-text-2)" }}>
            Entry
          </span>
          <span className="text-xs font-bold" style={{ color: "var(--kai-text)" }}>
            {formatMoney(w.alert_price)}
          </span>
        </div>
        <div
          className="flex-1 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}80, transparent)`,
          }}
        />
        <div className="flex flex-col items-end">
          <span className="text-[8px] tracking-[0.18em] uppercase opacity-50" style={{ color: "var(--kai-text-2)" }}>
            Peak
          </span>
          <span className="text-xs font-bold" style={{ color: accent }}>
            {formatMoney(w.peak_price)}
          </span>
        </div>
      </div>
    </button>
  );
}
