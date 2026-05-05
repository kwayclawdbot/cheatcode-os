// KaiTickerDetailPage — header, real V4 component scores, trigger setup,
// alert toggles. The chart panel and "Kai's Read" only render when the
// engine has authored real content for that ticker (no synthetic candles
// or boilerplate prose surfaces here anymore).
import { Link, useLocation } from "wouter";
import { Activity, ArrowLeft, AlertTriangle } from "lucide-react";
import { TickerLogo } from "@/components/intelligence/TickerLogo";
import { ChangePercent } from "@/components/kai/ChangePercent";
import { ChartModule } from "@/components/kai/ChartModule";
import { StateBadge } from "@/components/kai/StateBadge";
import { Toggle } from "@/components/kai/Toggle";
import { useKaiSystemUniverse } from "@/hooks/kai/useKaiSystemUniverse";
import { useKaiWatchlist } from "@/hooks/kai/useKaiWatchlist";
import { useKaiMutedTickers } from "@/hooks/kai/useKaiMutedTickers";
import type { KaiV4Components } from "@/lib/kai/types";

interface Props {
  symbol: string;
}

interface ScoreRow {
  label: string;
  value: number;
  max: number;
}

// Map real V4 components → labeled rows. Only includes components that
// have a value (so the breakdown reflects actual engine output, not
// hardcoded percentages).
function buildScoreRows(c: KaiV4Components | undefined): ScoreRow[] {
  if (!c) return [];
  const rows: ScoreRow[] = [];
  if (c.momentum_quality != null)
    rows.push({ label: "Momentum quality", value: c.momentum_quality, max: 35 });
  if (c.vol_pattern_score != null)
    rows.push({ label: "Volume pattern",  value: c.vol_pattern_score, max: 20 });
  if (c.accel_score != null)
    rows.push({ label: "Acceleration",    value: c.accel_score, max: 15 });
  if (c.catalyst_score != null)
    rows.push({ label: "Catalyst",        value: c.catalyst_score, max: 20 });
  if (c.flow_score != null)
    rows.push({ label: "Flow",            value: c.flow_score, max: 15 });
  return rows;
}

export function KaiTickerDetailPage({ symbol }: Props) {
  const [, navigate] = useLocation();
  const { picks, meta } = useKaiSystemUniverse();
  const { watchlist, remove } = useKaiWatchlist();
  const { isMuted, toggle } = useKaiMutedTickers();

  const sysData = picks.find((p) => p.ticker === symbol);
  const isUserPick = watchlist.some((w) => w.ticker === symbol);
  const muted = isMuted(symbol);

  const scoreRows = buildScoreRows(sysData?.components);
  const showChart =
    sysData?.or_high != null && sysData?.or_low != null &&
    sysData?.entry_low != null && sysData?.stop != null &&
    sysData?.target != null;

  return (
    <div className="space-y-5">
      <Link
        href="/kai"
        className="flex items-center gap-1.5 -ml-1 px-1 py-1 text-[10px] font-mono tracking-[0.15em] uppercase transition-colors"
        style={{ color: "var(--kai-text-muted)" }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </Link>

      <div className="flex items-start gap-3">
        <TickerLogo symbol={symbol} size={48} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1
              className="font-mono text-3xl tracking-wider leading-none"
              style={{ color: "var(--kai-text)" }}
            >
              {symbol}
            </h1>
            {isUserPick && (
              <span
                className="px-1.5 py-0.5 text-[9px] font-mono tracking-[0.15em] uppercase rounded-sm"
                style={{
                  backgroundColor: "color-mix(in oklab, var(--kai-gold) 25%, transparent)",
                  color: "var(--kai-gold)",
                }}
              >
                Your Pick
              </span>
            )}
            {sysData && <StateBadge state={sysData.state} />}
          </div>
          {sysData && (
            <div className="text-xs" style={{ color: "var(--kai-text-muted)" }}>
              {sysData.name ?? ""} {sysData.sector ? `· ${sysData.sector}` : ""}
            </div>
          )}
          {sysData && (
            <div className="flex items-baseline gap-2.5 mt-2">
              <span
                className="font-mono text-2xl tabular-nums leading-none"
                style={{ color: "var(--kai-text)" }}
              >
                ${sysData.price.toFixed(2)}
              </span>
              <ChangePercent value={sysData.change_pct} size="lg" />
            </div>
          )}
        </div>
      </div>

      {/* Staleness banner — applies to whole detail when watchlist is old */}
      {meta?.is_stale && sysData && (
        <div
          className="border rounded-sm px-3 py-2 flex items-start gap-2 text-[11px] font-mono"
          style={{
            borderColor: "color-mix(in oklab, var(--kai-red) 40%, transparent)",
            background: "color-mix(in oklab, var(--kai-red) 8%, transparent)",
            color: "var(--kai-red)",
          }}
        >
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Levels & price below from {meta.generated_for_date} watchlist ({meta.age_days}d old).
            Reference only — pull live data before trading.
          </span>
        </div>
      )}

      {/* Chart panel — only when engine has OR levels. Synthetic candles
          have been retired; Phase 3 wires real TradingView MCP capture. */}
      {showChart && sysData && <ChartModule pick={sysData} />}

      {/* Kai's Read — only render when engine authored a real narrative.
          Boilerplate prose has been removed; no read = no section. */}
      {sysData?.read && (
        <section
          className="pl-3.5 py-1"
          style={{ borderLeft: "2px solid var(--kai-gold)" }}
        >
          <div
            className="text-[9px] font-mono tracking-[0.2em] uppercase mb-1.5"
            style={{ color: "var(--kai-gold)" }}
          >
            Kai's Read
          </div>
          <p
            className="kai-serif text-[14px] leading-[1.55]"
            style={{ color: "var(--kai-text-2)" }}
          >
            {sysData.read}
          </p>
        </section>
      )}

      {/* No system coverage yet — gentle empty state for user-picked tickers */}
      {!sysData && (
        <section
          className="border rounded-sm px-3.5 py-4 text-[12px]"
          style={{
            borderColor: "var(--kai-border)",
            background: "var(--kai-surface)",
            color: "var(--kai-text-muted)",
          }}
        >
          <div
            className="text-[9px] font-mono tracking-[0.2em] uppercase mb-1.5"
            style={{ color: "var(--kai-text-muted)" }}
          >
            Watching
          </div>
          <p className="kai-serif text-[13px] leading-[1.5]" style={{ color: "var(--kai-text-2)" }}>
            {symbol} isn't in this week's swing watchlist yet, so Kai hasn't scored it.
            Alerts still fire if a trigger pattern forms intraday.
          </p>
        </section>
      )}

      {/* Trigger setup */}
      {sysData && sysData.entry_low != null && sysData.stop != null && sysData.target != null && (
        <section
          className="border rounded-sm overflow-hidden"
          style={{ borderColor: "var(--kai-border)", background: "var(--kai-surface)" }}
        >
          <div
            className="px-3.5 py-2.5"
            style={{ borderBottom: "1px solid var(--kai-border)" }}
          >
            <div
              className="text-[9px] font-mono tracking-[0.2em] uppercase"
              style={{ color: "var(--kai-text)" }}
            >
              Trigger Setup
            </div>
          </div>
          <div className="grid grid-cols-3">
            <div className="px-3 py-3">
              <div
                className="text-[9px] font-mono tracking-[0.1em] uppercase mb-1"
                style={{ color: "var(--kai-text-muted)" }}
              >
                Entry
              </div>
              <div
                className="font-mono text-sm tabular-nums"
                style={{ color: "var(--kai-text)" }}
              >
                ${sysData.entry_low}–{sysData.entry_high}
              </div>
            </div>
            <div
              className="px-3 py-3"
              style={{
                borderLeft: "1px solid var(--kai-border)",
                borderRight: "1px solid var(--kai-border)",
              }}
            >
              <div
                className="text-[9px] font-mono tracking-[0.1em] uppercase mb-1"
                style={{ color: "var(--kai-text-muted)" }}
              >
                Stop
              </div>
              <div
                className="font-mono text-sm tabular-nums"
                style={{ color: "var(--kai-red)" }}
              >
                ${sysData.stop.toFixed(2)}
              </div>
            </div>
            <div className="px-3 py-3">
              <div
                className="text-[9px] font-mono tracking-[0.1em] uppercase mb-1"
                style={{ color: "var(--kai-text-muted)" }}
              >
                2R Target
              </div>
              <div
                className="font-mono text-sm tabular-nums"
                style={{ color: "var(--kai-green)" }}
              >
                ${sysData.target.toFixed(2)}
              </div>
            </div>
          </div>
          <div
            className="px-3.5 py-2.5 flex items-start gap-1.5 text-[10px] font-mono leading-snug"
            style={{
              borderTop: "1px solid var(--kai-border)",
              color: "var(--kai-text-muted)",
            }}
          >
            <Activity className="w-3 h-3 mt-0.5 shrink-0" />
            <span>OR Break · 5min close + 1.5× vol + above VWAP + pullback ≤ 5%</span>
          </div>
        </section>
      )}

      {/* V4 Score — only renders when the engine has real component scores
          for this ticker. Composite score is shown standalone; the
          breakdown card only appears when components are available. */}
      {sysData && (
        <section
          className="border rounded-sm p-3.5"
          style={{ borderColor: "var(--kai-border)", background: "var(--kai-surface)" }}
        >
          <div className="flex items-baseline justify-between mb-3">
            <div
              className="text-[9px] font-mono tracking-[0.2em] uppercase"
              style={{ color: "var(--kai-text)" }}
            >
              Kai Score · V4
            </div>
            <div className="font-mono tabular-nums">
              <span className="text-2xl" style={{ color: "var(--kai-gold)" }}>
                {sysData.score}
              </span>
              <span className="text-xs" style={{ color: "var(--kai-text-dim)" }}>
                {/* The engine's V4 score is unbounded above — top picks
                    routinely break 100. Skip the /100 fraction. */}
              </span>
            </div>
          </div>
          {scoreRows.length > 0 ? (
            <div className="space-y-2.5">
              {scoreRows.map((p) => {
                const pct = Math.min(100, Math.max(0, (p.value / p.max) * 100));
                return (
                  <div key={p.label}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span style={{ color: "var(--kai-text-2)" }}>{p.label}</span>
                      <span
                        className="font-mono tabular-nums text-[10px]"
                        style={{ color: "var(--kai-text-muted)" }}
                      >
                        {p.value}
                        <span style={{ color: "var(--kai-text-dim)" }}>/{p.max}</span>
                      </span>
                    </div>
                    <div
                      className="h-[2px] rounded-full overflow-hidden"
                      style={{ backgroundColor: "var(--kai-border)" }}
                    >
                      <div
                        className="h-full"
                        style={{ width: `${pct}%`, backgroundColor: "var(--kai-gold)" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Composite available but no component breakdown — show key stats
            <div className="grid grid-cols-3 gap-3 text-[11px]">
              {sysData.rsi != null && (
                <Stat label="RSI" value={sysData.rsi.toFixed(0)} />
              )}
              {sysData.volume_ratio != null && (
                <Stat label="Vol vs avg" value={`${sysData.volume_ratio.toFixed(1)}×`} />
              )}
              {sysData.change_5d != null && (
                <Stat label="5d change" value={`${sysData.change_5d >= 0 ? "+" : ""}${sysData.change_5d.toFixed(1)}%`} />
              )}
              {sysData.rr != null && (
                <Stat label="R:R" value={`${sysData.rr.toFixed(1)}`} />
              )}
              {sysData.mcap_label && (
                <Stat label="Mcap" value={sysData.mcap_label} />
              )}
            </div>
          )}
        </section>
      )}

      {/* Alerts */}
      <section
        className="border rounded-sm overflow-hidden"
        style={{ borderColor: "var(--kai-border)", background: "var(--kai-surface)" }}
      >
        <div
          className="px-3.5 py-2.5"
          style={{ borderBottom: "1px solid var(--kai-border)" }}
        >
          <div
            className="text-[9px] font-mono tracking-[0.2em] uppercase"
            style={{ color: "var(--kai-text)" }}
          >
            Alerts
          </div>
        </div>
        <div className="px-3.5 py-3 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-mono text-sm" style={{ color: "var(--kai-text)" }}>
              Alerts on trigger
            </div>
            <div
              className="text-[11px] mt-0.5"
              style={{ color: "var(--kai-text-muted)" }}
            >
              {muted
                ? `Muted · ${symbol} won't notify`
                : isUserPick
                ? "Notify me when this stock triggers"
                : "Notify me when this system pick triggers"}
            </div>
          </div>
          <Toggle
            on={!muted}
            onChange={() => {
              void toggle(symbol);
            }}
          />
        </div>
        {isUserPick && (
          <button
            type="button"
            onClick={async () => {
              await remove(symbol);
              navigate("/kai");
            }}
            className="w-full px-3.5 py-3 text-[10px] font-mono tracking-[0.15em] uppercase transition-colors"
            style={{
              borderTop: "1px solid var(--kai-border)",
              color: "var(--kai-red)",
            }}
          >
            Remove from watchlist
          </button>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        className="text-[9px] font-mono tracking-[0.1em] uppercase mb-1"
        style={{ color: "var(--kai-text-muted)" }}
      >
        {label}
      </div>
      <div
        className="font-mono text-sm tabular-nums"
        style={{ color: "var(--kai-text)" }}
      >
        {value}
      </div>
    </div>
  );
}
