// KaiHistoryPage — last 7 days of trigger events with WIN/LOSS outcomes
// when the engine has scored them, or "expired" / "open" otherwise.
// Win-rate stats only render once enough events have real outcomes.
import { useMemo, useState } from "react";
import { AlertTriangle, Check, Clock, History as HistoryIcon, X } from "lucide-react";
import { useLocation } from "wouter";
import { TickerLogo } from "@/components/intelligence/TickerLogo";
import { useKaiTriggerEvents } from "@/hooks/kai/useKaiTriggerEvents";
import type { KaiTriggerEvent } from "@/lib/kai/types";

type Outcome = "tp_hit" | "stopped" | "open" | "invalidated" | "expired";

interface Row {
  event: KaiTriggerEvent;
  outcome: Outcome;
  r: number | null;
}

function inferOutcome(e: KaiTriggerEvent): { outcome: Outcome; r: number | null } {
  const p = (e.payload ?? {}) as Record<string, unknown>;
  const eod = typeof p.eod_outcome === "string" ? (p.eod_outcome as string).toLowerCase() : null;
  const invalidated = p.post_fire_invalidated === true;
  if (invalidated) return { outcome: "invalidated", r: null };
  if (eod === "tp_hit" || eod === "win") return { outcome: "tp_hit", r: 2 };
  if (eod === "stopped" || eod === "loss") return { outcome: "stopped", r: -1 };
  if (eod === "invalidated") return { outcome: "invalidated", r: null };
  if (eod === "expired") return { outcome: "expired", r: null };
  return { outcome: "open", r: null };
}

const OUTCOME_CFG: Record<
  Outcome,
  { label: string; color: string; icon: typeof Check }
> = {
  tp_hit:      { label: "WIN",  color: "var(--kai-green)",      icon: Check },
  stopped:     { label: "LOSS", color: "var(--kai-red)",        icon: X },
  open:        { label: "OPEN", color: "var(--kai-gold)",       icon: Clock },
  invalidated: { label: "INV",  color: "var(--kai-text-muted)", icon: AlertTriangle },
  expired:     { label: "EXP",  color: "var(--kai-text-dim)",   icon: HistoryIcon },
};

// Number of completed (WIN/LOSS) events needed before we surface stats.
// Below this threshold, the win-rate / avg-R card stays hidden so we
// don't show a misleading "0% on 0 trades" line.
const STATS_THRESHOLD = 5;

function fmtRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 0) return "future";
  if (diff < 60_000) return "just now";
  if (diff < 60 * 60_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 24 * 60 * 60_000) return `${Math.floor(diff / (60 * 60_000))}h ago`;
  if (diff < 7 * 24 * 60 * 60_000) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const t = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
    return `${days[d.getDay()]} ${t}`;
  }
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export function KaiHistoryPage() {
  const [, navigate] = useLocation();
  const { events, loading } = useKaiTriggerEvents({ scope: "history", days: 7 });
  const [filter, setFilter] = useState<"all" | "mine">("all");

  const rows = useMemo<Row[]>(() => {
    const filtered =
      filter === "mine"
        ? events.filter((e) => e.source === "user_pick")
        : events;
    return filtered.map((e) => ({ event: e, ...inferOutcome(e) }));
  }, [events, filter]);

  const wins = rows.filter((r) => r.outcome === "tp_hit").length;
  const losses = rows.filter((r) => r.outcome === "stopped").length;
  const open = rows.filter((r) => r.outcome === "open").length;
  const invalid = rows.filter((r) => r.outcome === "invalidated").length;
  const expired = rows.filter((r) => r.outcome === "expired").length;
  const completed = wins + losses;
  const winRate = completed > 0 ? Math.round((wins / completed) * 100) : 0;
  const rValues = rows.filter((r) => r.r !== null).map((r) => r.r as number);
  const avgR =
    rValues.length > 0 ? rValues.reduce((s, v) => s + v, 0) / rValues.length : 0;
  const showStats = completed >= STATS_THRESHOLD;

  return (
    <div className="space-y-5">
      <div>
        <h1
          className="font-mono text-xl tracking-wider"
          style={{ color: "var(--kai-text)" }}
        >
          History
        </h1>
        <p className="text-xs mt-1" style={{ color: "var(--kai-text-muted)" }}>
          Last 7 days · system + your picks
        </p>
      </div>

      {/* Stats — only when enough events have real outcomes */}
      {showStats ? (
        <div
          className="border rounded-sm grid grid-cols-3 overflow-hidden"
          style={{ borderColor: "var(--kai-border)", background: "var(--kai-surface)" }}
        >
          <div className="px-3 py-3">
            <div className="text-[9px] font-mono tracking-[0.15em] uppercase mb-1" style={{ color: "var(--kai-text-muted)" }}>
              Win Rate
            </div>
            <div className="font-mono tabular-nums">
              <span className="text-2xl" style={{ color: "var(--kai-gold)" }}>{winRate}</span>
              <span className="text-xs" style={{ color: "var(--kai-text-muted)" }}>%</span>
            </div>
          </div>
          <div
            className="px-3 py-3"
            style={{
              borderLeft: "1px solid var(--kai-border)",
              borderRight: "1px solid var(--kai-border)",
            }}
          >
            <div className="text-[9px] font-mono tracking-[0.15em] uppercase mb-1" style={{ color: "var(--kai-text-muted)" }}>
              Avg R
            </div>
            <div
              className="font-mono text-2xl tabular-nums"
              style={{ color: avgR >= 0 ? "var(--kai-green)" : "var(--kai-red)" }}
            >
              {avgR >= 0 ? "+" : ""}
              {avgR.toFixed(2)}
            </div>
          </div>
          <div className="px-3 py-3">
            <div className="text-[9px] font-mono tracking-[0.15em] uppercase mb-1" style={{ color: "var(--kai-text-muted)" }}>
              Completed
            </div>
            <div className="font-mono text-2xl tabular-nums" style={{ color: "var(--kai-text)" }}>
              {completed}
            </div>
          </div>
        </div>
      ) : (
        // Below threshold — placeholder card that explains the gap so users
        // don't think the system is broken or losing.
        <div
          className="border rounded-sm px-3.5 py-3"
          style={{ borderColor: "var(--kai-border)", background: "var(--kai-surface)" }}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-mono tracking-[0.15em] uppercase" style={{ color: "var(--kai-gold)" }}>
                Win Rate · Pending
              </div>
              <p className="text-[11px] mt-1" style={{ color: "var(--kai-text-muted)" }}>
                {completed === 0
                  ? "No completed setups yet — outcomes appear as triggers play out."
                  : `${completed} completed so far · stats show at ${STATS_THRESHOLD}+`}
              </p>
            </div>
            <div className="font-mono tabular-nums">
              <span className="text-xl" style={{ color: "var(--kai-text-dim)" }}>—</span>
            </div>
          </div>
        </div>
      )}

      {/* Outcome chips */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { v: wins,    l: "WINS", c: "var(--kai-green)" },
          { v: losses,  l: "LOSS", c: "var(--kai-red)" },
          { v: open,    l: "OPEN", c: "var(--kai-gold)" },
          { v: invalid, l: "INV",  c: "var(--kai-text-muted)" },
          { v: expired, l: "EXP",  c: "var(--kai-text-dim)" },
        ].map((o) => (
          <div
            key={o.l}
            className="border rounded-sm py-2 text-center"
            style={{ borderColor: "var(--kai-border)", background: "var(--kai-surface)" }}
          >
            <div className="font-mono text-base tabular-nums" style={{ color: o.c }}>
              {o.v}
            </div>
            <div className="text-[9px] font-mono tracking-wider mt-0.5" style={{ color: "var(--kai-text-muted)" }}>
              {o.l}
            </div>
          </div>
        ))}
      </div>

      {/* Filter pill */}
      <div
        className="flex gap-1 border rounded-sm p-1 w-fit"
        style={{ borderColor: "var(--kai-border)", background: "var(--kai-surface)" }}
      >
        {(
          [
            { v: "all", l: "ALL" },
            { v: "mine", l: "MY PICKS" },
          ] as const
        ).map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => setFilter(o.v)}
            className="px-3 py-1.5 text-[10px] font-mono tracking-[0.15em] rounded-sm transition-colors"
            style={{
              backgroundColor:
                filter === o.v
                  ? "color-mix(in oklab, var(--kai-gold) 25%, transparent)"
                  : "transparent",
              color: filter === o.v ? "var(--kai-gold)" : "var(--kai-text-muted)",
            }}
          >
            {o.l}
          </button>
        ))}
      </div>

      {/* Rows */}
      {loading ? (
        <div
          className="border rounded-sm px-4 py-6 text-center text-[11px] font-mono"
          style={{
            borderColor: "var(--kai-border)",
            background: "var(--kai-surface)",
            color: "var(--kai-text-muted)",
          }}
        >
          Loading history…
        </div>
      ) : rows.length === 0 ? (
        <div
          className="border rounded-sm px-4 py-6 text-center text-[11px] font-mono space-y-2"
          style={{
            borderColor: "var(--kai-border)",
            background: "var(--kai-surface)",
            color: "var(--kai-text-muted)",
          }}
        >
          {filter === "mine" ? (
            <>
              <div>No triggers on your watchlist in the last 7 days.</div>
              <div className="text-[10px]" style={{ color: "var(--kai-text-dim)" }}>
                Add tickers from /kai to see your personal trigger history here.
              </div>
            </>
          ) : (
            <div>No triggers in the last 7 days.</div>
          )}
        </div>
      ) : (
        <div
          className="border rounded-sm overflow-hidden"
          style={{ borderColor: "var(--kai-border)", background: "var(--kai-surface)" }}
        >
          {rows.map((row, i) => {
            const cfg = OUTCOME_CFG[row.outcome];
            const Icon = cfg.icon;
            return (
              <button
                key={row.event.id}
                type="button"
                onClick={() => navigate(`/kai/t/${row.event.ticker}`)}
                className="w-full px-3.5 py-3 flex items-center gap-2.5 text-left transition-colors hover:bg-[var(--kai-surface-2)]"
                style={{ borderTop: i > 0 ? "1px solid var(--kai-border)" : "none" }}
              >
                <div className="flex flex-col items-start w-16 shrink-0">
                  <span
                    className="text-[10px] font-mono whitespace-nowrap"
                    style={{ color: "var(--kai-text-muted)" }}
                  >
                    {fmtRelative(row.event.fired_at)}
                  </span>
                  <span
                    className="text-[9px] font-mono tracking-wider"
                    style={{
                      color: row.event.side === "SHORT" ? "var(--kai-red)" : "var(--kai-text-dim)",
                    }}
                  >
                    {row.event.side}
                  </span>
                </div>
                <TickerLogo symbol={row.event.ticker} size={24} />
                <div className="flex-1 min-w-0">
                  <div
                    className="font-mono text-sm tracking-wider"
                    style={{ color: "var(--kai-text)" }}
                  >
                    {row.event.ticker}
                  </div>
                  <div
                    className="font-mono text-[10px] tabular-nums"
                    style={{ color: "var(--kai-text-muted)" }}
                  >
                    @ ${row.event.entry_price.toFixed(2)}
                  </div>
                </div>
                {row.r !== null && (
                  <div
                    className="font-mono text-xs tabular-nums w-10 text-right shrink-0"
                    style={{ color: row.r > 0 ? "var(--kai-green)" : "var(--kai-red)" }}
                  >
                    {row.r > 0 ? "+" : ""}
                    {row.r}R
                  </div>
                )}
                <div
                  className="flex items-center gap-1 shrink-0 w-12 justify-end"
                  style={{ color: cfg.color }}
                >
                  <Icon className="w-3 h-3" />
                  <span className="text-[10px] font-mono tracking-[0.1em]">
                    {cfg.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
