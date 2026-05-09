// KaiWinsPage — top Kai alert wins (peak before stop), live-scored vs Yahoo OHLC.
// Big-name tickers (★) sort to the top, then by peak %.
import { useState } from "react";
import { Star } from "lucide-react";
import { useLocation } from "wouter";
import { useKaiWins, type KaiWin } from "@/hooks/kai/useKaiWins";

function formatAlertDates(dates: string[]): { display: string; tooltip: string } {
  // Each date is YYYY-MM-DD. Compress to MM-DD; if many, show first 3 + "+N".
  const short = dates.map((d) => d.slice(5)); // MM-DD
  if (short.length <= 3) {
    return { display: short.join(", "), tooltip: short.join(", ") };
  }
  return {
    display: `${short.slice(0, 3).join(", ")} +${short.length - 3}`,
    tooltip: short.join(", "),
  };
}

function formatMoney(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export function KaiWinsPage() {
  const [, navigate] = useLocation();
  const [days, setDays] = useState(60);
  const { wins, loading, error, cached, scanned } = useKaiWins(days, 50);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1
          className="font-mono text-sm tracking-[0.2em] uppercase"
          style={{ color: "var(--kai-text)" }}
        >
          Top Wins
        </h1>
        <div className="flex gap-2">
          {[30, 60, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className="px-2 py-1 font-mono text-[10px] tracking-[0.15em] uppercase rounded-sm transition-colors"
              style={{
                background:
                  d === days
                    ? "var(--kai-gold)"
                    : "transparent",
                color: d === days ? "var(--kai-bg)" : "var(--kai-text-muted)",
                border: "1px solid var(--kai-border)",
              }}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <p
        className="font-mono text-[10px] tracking-[0.1em]"
        style={{ color: "var(--kai-text-dim)" }}
      >
        Peak before stop · scored against Yahoo OHLC
        {scanned !== null && ` · ${scanned} alerts scanned`}
        {cached && " · cached"}
      </p>

      {loading && (
        <div
          className="font-mono text-[11px] tracking-[0.15em] uppercase py-12 text-center"
          style={{ color: "var(--kai-text-muted)" }}
        >
          Scoring…
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
        <div className="overflow-x-auto -mx-4 px-4">
          <table
            className="w-full font-mono text-[11px]"
            style={{ color: "var(--kai-text)" }}
          >
            <thead>
              <tr
                className="text-[9px] tracking-[0.15em] uppercase"
                style={{
                  color: "var(--kai-text-muted)",
                  borderBottom: "1px solid var(--kai-border)",
                }}
              >
                <th className="text-left py-2 pr-2">Ticker</th>
                <th className="text-left py-2 pr-2">Dir</th>
                <th className="text-left py-2 pr-2">Alert Dates</th>
                <th className="text-right py-2 pr-2">Best Entry</th>
                <th className="text-right py-2 pr-2">Peak</th>
                <th className="text-right py-2 pr-2">%</th>
                <th className="text-left py-2 pr-2">Peak Dt</th>
                <th className="text-right py-2 pr-2">Days</th>
              </tr>
            </thead>
            <tbody>
              {wins.map((w, i) => (
                <WinRow key={`${w.ticker}-${w.sent_at}-${i}`} w={w} onClick={() => navigate(`/kai/wins/${w.ticker}`)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function WinRow({ w, onClick }: { w: KaiWin; onClick: () => void }) {
  const isShort = w.direction === "short";
  const dates = formatAlertDates(w.alert_dates ?? [w.sent_at.slice(0, 10)]);
  return (
    <tr
      onClick={onClick}
      className="cursor-pointer transition-colors hover:bg-white/[0.02]"
      style={{ borderBottom: "1px solid var(--kai-border)" }}
    >
      <td className="py-2 pr-2">
        <span className="inline-flex items-center gap-1">
          {w.is_big_name && (
            <Star
              className="w-3 h-3"
              style={{ color: "var(--kai-gold)", fill: "var(--kai-gold)" }}
            />
          )}
          <span style={{ color: "var(--kai-text)" }}>{w.ticker}</span>
          {w.alert_count > 1 && (
            <span
              className="text-[9px] tracking-[0.1em] px-1 rounded-sm"
              style={{
                background: "color-mix(in oklab, var(--kai-gold) 15%, transparent)",
                color: "var(--kai-gold)",
              }}
              title={`${w.alert_count} alerts in window`}
            >
              {w.alert_count}×
            </span>
          )}
        </span>
      </td>
      <td className="py-2 pr-2">
        <span
          className="text-[9px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm"
          style={{
            background: isShort
              ? "color-mix(in oklab, var(--kai-red) 15%, transparent)"
              : "color-mix(in oklab, var(--kai-green) 15%, transparent)",
            color: isShort ? "var(--kai-red)" : "var(--kai-green)",
          }}
        >
          {w.direction}
        </span>
      </td>
      <td className="py-2 pr-2" style={{ color: "var(--kai-text-2)" }} title={dates.tooltip}>
        {dates.display}
      </td>
      <td className="py-2 pr-2 text-right tabular-nums" style={{ color: "var(--kai-text-2)" }}>
        {formatMoney(w.alert_price)}
      </td>
      <td className="py-2 pr-2 text-right tabular-nums" style={{ color: "var(--kai-text)" }}>
        {formatMoney(w.peak_price)}
      </td>
      <td
        className="py-2 pr-2 text-right tabular-nums font-bold"
        style={{ color: "var(--kai-green)" }}
      >
        {formatPct(w.peak_pct)}
      </td>
      <td className="py-2 pr-2" style={{ color: "var(--kai-text-2)" }}>
        {w.peak_date.slice(5)}
      </td>
      <td className="py-2 pr-2 text-right tabular-nums" style={{ color: "var(--kai-text-2)" }}>
        {w.days_to_peak}d
      </td>
    </tr>
  );
}
