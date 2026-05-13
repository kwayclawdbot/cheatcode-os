// KaiTodayPage — live triggers feed, user watchlist, system top 10, universe collapse
import { useState } from "react";
import { Bell, BellOff, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { TickerLogo } from "@/components/intelligence/TickerLogo";
import { ChangePercent } from "@/components/kai/ChangePercent";
import { ScoreDot } from "@/components/kai/ScoreDot";
import { StateBadge } from "@/components/kai/StateBadge";
import { MiniSparkline } from "@/components/kai/MiniSparkline";
import { AddPickModal } from "@/components/kai/AddPickModal";
import { useKaiTriggerEvents } from "@/hooks/kai/useKaiTriggerEvents";
import { useKaiWatchlist } from "@/hooks/kai/useKaiWatchlist";
import { useKaiSystemUniverse } from "@/hooks/kai/useKaiSystemUniverse";
import { useKaiWeeklyUniverse } from "@/hooks/kai/useKaiWeeklyUniverse";
import { useKaiMutedTickers } from "@/hooks/kai/useKaiMutedTickers";
import { useMarketSession } from "@/hooks/kai/useMarketSession";
import { useKaiLiveQuotes } from "@/hooks/kai/useKaiLiveQuotes";
import type { KaiSystemPick, KaiTriggerOutcome } from "@/lib/kai/types";

const REGIME_COPY: Record<string, string> = {
  neutral: "Neutral regime",
  risk_on: "Risk-on regime",
  risk_off: "Risk-off regime",
  bullish: "Bullish bias",
  bearish: "Bearish bias",
};

function fmtRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 60 * 60_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 24 * 60 * 60_000) return `${Math.floor(diff / (60 * 60_000))}h ago`;
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const t = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${days[d.getDay()]} ${t}`;
}

function fmtWatchlistDate(d: string): string {
  const dt = new Date(d + "T12:00:00Z");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[dt.getMonth()]} ${dt.getDate()}`;
}

const OUTCOME_STYLES: Record<
  KaiTriggerOutcome,
  { label: string; color: string; bg: string; border: string }
> = {
  tp_hit:      { label: "TP HIT",  color: "var(--kai-green)", bg: "color-mix(in oklab, var(--kai-green) 14%, transparent)", border: "color-mix(in oklab, var(--kai-green) 45%, transparent)" },
  win:         { label: "WIN",     color: "var(--kai-green)", bg: "color-mix(in oklab, var(--kai-green) 14%, transparent)", border: "color-mix(in oklab, var(--kai-green) 45%, transparent)" },
  stopped:     { label: "STOPPED", color: "var(--kai-red)",   bg: "color-mix(in oklab, var(--kai-red) 14%, transparent)",   border: "color-mix(in oklab, var(--kai-red) 45%, transparent)" },
  loss:        { label: "LOSS",    color: "var(--kai-red)",   bg: "color-mix(in oklab, var(--kai-red) 14%, transparent)",   border: "color-mix(in oklab, var(--kai-red) 45%, transparent)" },
  invalidated: { label: "INVALID", color: "var(--kai-text-muted)", bg: "var(--kai-surface-2)", border: "var(--kai-border)" },
  expired:     { label: "EXPIRED", color: "var(--kai-text-muted)", bg: "var(--kai-surface-2)", border: "var(--kai-border)" },
  open:        { label: "OPEN",    color: "var(--kai-gold)",  bg: "color-mix(in oklab, var(--kai-gold) 10%, transparent)",  border: "color-mix(in oklab, var(--kai-gold) 40%, transparent)" },
};

function OutcomeBadge({ outcome }: { outcome: KaiTriggerOutcome }) {
  const s = OUTCOME_STYLES[outcome];
  return (
    <span
      className="px-1.5 py-0.5 rounded-sm border text-[9px] font-mono tracking-[0.12em]"
      style={{ color: s.color, background: s.bg, borderColor: s.border }}
    >
      {s.label}
    </span>
  );
}

export function KaiTodayPage() {
  const [, navigate] = useLocation();
  const [universeOpen, setUniverseOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const session = useMarketSession();
  const {
    events,
    loading: triggersLoading,
    error: triggersError,
  } = useKaiTriggerEvents({ scope: "today", realtime: true });
  const { watchlist, add, remove } = useKaiWatchlist();
  const {
    top10,
    rest: dailyRest,
    meta,
    prevTopTickers,
    loading: sysLoading,
  } = useKaiSystemUniverse();
  const weekly = useKaiWeeklyUniverse();
  const { isMuted, toggle: toggleMute } = useKaiMutedTickers();

  const goToTicker = (ticker: string) => navigate(`/kai/t/${ticker.toUpperCase()}`);

  // "More Watched" reads from the WEEKLY tier (Kai/Weekly/current.json),
  // filtering out names that already appear in today's Top 10. Falls back
  // to daily ranks 11+ if weekly hasn't been written yet.
  const top10Tickers = new Set(top10.map((t) => t.ticker));
  const moreWatched = weekly.picks.length > 0
    ? weekly.picks.filter((p) => !top10Tickers.has(p.ticker)).slice(0, 30)
    : dailyRest.map((p) => ({
        ticker: p.ticker,
        score: p.score,
        last_close: p.price,
        chg_5d: p.change_5d ?? 0,
        chg_20d: 0,
        pct_from_52w_high: 0,
        pct_from_20d_high: 0,
        rsi: p.rsi ?? 0,
        rsi_1h: 0, rsi_2h: 0,
        rs_vs_spy_20d: 0,
        sustained_vol_ratio: p.volume_ratio ?? 0,
        ema21_above_ema50: true,
        atr_pct: 0,
        market_cap: p.market_cap ?? 0,
      }));
  const moreWatchedSourceLabel = weekly.picks.length > 0 ? "Weekly watch" : "Daily extended";

  const universeShouldDefaultOpen = watchlist.length === 0 && moreWatched.length > 0;
  const universeIsOpen = universeOpen || universeShouldDefaultOpen;

  const watchlistPicks: Array<{ ticker: string; system?: KaiSystemPick }> = watchlist.map((w) => ({
    ticker: w.ticker,
    system: top10.find((t) => t.ticker === w.ticker) ?? dailyRest.find((t) => t.ticker === w.ticker),
  }));

  // Live quotes for every ticker visible on this page — overlays current
  // price/change onto the daily-snapshot data so stale 4/30 prices never
  // surface as if live. 30s refresh while market is open, paused otherwise.
  const allVisibleSymbols = [
    ...top10.map((t) => t.ticker),
    ...moreWatched.map((m) => m.ticker),
    ...watchlistPicks.map((w) => w.ticker),
  ];
  const { quotesByTicker } = useKaiLiveQuotes({
    symbols: allVisibleSymbols,
    refreshMs: session.session === "OPEN" ? 30_000 : 0,
  });

  // Last historical trigger so empty states can say something useful
  const lastTriggerSummary: string | null = events.length > 0
    ? `${events[0].ticker} ${events[0].side} · ${fmtRelative(events[0].fired_at)}`
    : null;

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const sessionColor =
    session.color === "green" ? "var(--kai-green)"
    : session.color === "gold"  ? "var(--kai-gold)"
    : "var(--kai-text-muted)";

  return (
    <div className="space-y-5">
      {/* Session strip — real session detection, not always-pulsing green */}
      <div className="flex items-center justify-between px-1 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-1.5 h-1.5 rounded-full ${session.session === "OPEN" ? "animate-pulse" : ""}`}
            style={{ background: sessionColor }}
          />
          <span
            className="text-[10px] font-mono tracking-[0.15em] uppercase whitespace-nowrap"
            style={{ color: sessionColor }}
          >
            {session.label}
          </span>
        </div>
        <span
          className="text-[10px] font-mono whitespace-nowrap truncate"
          style={{ color: "var(--kai-text-muted)" }}
        >
          {session.countdown}
        </span>
      </div>

      {/* Regime + thesis context — surfaces "why these names" */}
      {meta && (meta.regime !== "unknown" || meta.thesis) && (
        <section
          className="border rounded-sm px-3.5 py-2.5"
          style={{ borderColor: "var(--kai-border)", background: "var(--kai-surface)" }}
        >
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="text-[9px] font-mono tracking-[0.2em] uppercase"
              style={{ color: "var(--kai-gold)" }}
            >
              {REGIME_COPY[meta.regime] ?? meta.regime}
            </span>
            {meta.is_stale && (
              <span
                className="text-[9px] font-mono tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm"
                style={{
                  backgroundColor: "color-mix(in oklab, var(--kai-red) 15%, transparent)",
                  color: "var(--kai-red)",
                }}
              >
                ⚠ {meta.age_days}d old · prices stale
              </span>
            )}
          </div>
          {meta.thesis && (
            <p
              className="kai-serif text-[12px] leading-[1.5]"
              style={{ color: "var(--kai-text-2)" }}
            >
              {meta.thesis}
            </p>
          )}
        </section>
      )}

      {/* Live triggers */}
      <section>
        <div className="flex items-baseline justify-between mb-2 px-1">
          <h2
            className="text-[10px] font-mono tracking-[0.2em] uppercase"
            style={{ color: "var(--kai-gold)" }}
          >
            Today's Triggers
          </h2>
          <span className="text-[10px] font-mono" style={{ color: "var(--kai-text-muted)" }}>
            {events.length} fired
          </span>
        </div>
        {triggersError ? (
          <div
            className="border rounded-sm px-4 py-4 text-[11px] font-mono space-y-2"
            style={{
              borderColor: "color-mix(in oklab, var(--kai-red) 50%, transparent)",
              background: "color-mix(in oklab, var(--kai-red) 12%, var(--kai-surface))",
              color: "var(--kai-red)",
            }}
          >
            <div className="font-semibold tracking-wider uppercase text-[10px]">
              Failed to load triggers
            </div>
            <div style={{ color: "var(--kai-text-muted)" }}>
              {triggersError}
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-[10px] tracking-[0.15em] uppercase underline"
              style={{ color: "var(--kai-gold)" }}
            >
              Retry
            </button>
          </div>
        ) : events.length === 0 ? (
          <div
            className="border rounded-sm px-4 py-6 text-center text-[11px] font-mono space-y-1"
            style={{
              borderColor: "color-mix(in oklab, var(--kai-gold) 40%, transparent)",
              background: "var(--kai-surface)",
              color: "var(--kai-text-muted)",
            }}
          >
            <div>
              {triggersLoading
                ? "Loading triggers…"
                : session.session === "CLOSED"
                ? "Markets closed."
                : session.session === "PREMARKET"
                ? "Pre-market — Kai is watching for setups."
                : session.session === "AFTER_HOURS"
                ? "After-hours — no new setups."
                : "No triggers yet. Kai is watching."}
            </div>
            {!triggersLoading && lastTriggerSummary && (
              <div className="text-[10px]" style={{ color: "var(--kai-text-dim)" }}>
                Last fired · {lastTriggerSummary}
              </div>
            )}
          </div>
        ) : (
          <div
            className="border rounded-sm overflow-hidden"
            style={{
              borderColor: "color-mix(in oklab, var(--kai-gold) 40%, transparent)",
              background: "var(--kai-surface)",
            }}
          >
            {events.map((t, idx) => (
              <button
                key={t.id}
                type="button"
                onClick={() => goToTicker(t.ticker)}
                className="w-full px-3.5 py-3 flex items-center gap-3 text-left transition-colors hover:bg-[var(--kai-surface-2)]"
                style={{ borderTop: idx > 0 ? "1px solid var(--kai-border)" : "none" }}
              >
                <div className="flex flex-col items-center gap-1 w-9 shrink-0">
                  <span
                    className="text-[9px] font-mono tabular-nums"
                    style={{ color: "var(--kai-text-muted)" }}
                  >
                    {fmtTime(t.fired_at)}
                  </span>
                  <span
                    className="w-1 h-1 rounded-full animate-pulse"
                    style={{ background: "var(--kai-green)" }}
                  />
                </div>
                <TickerLogo symbol={t.ticker} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono text-base tracking-wider"
                      style={{ color: "var(--kai-text)" }}
                    >
                      {t.ticker}
                    </span>
                    <span
                      className="text-[10px] font-mono tracking-[0.1em]"
                      style={{
                        color: t.side === "LONG" ? "var(--kai-green)" : "var(--kai-red)",
                      }}
                    >
                      {t.side}
                    </span>
                    <OutcomeBadge outcome={t.outcome} />
                  </div>
                  {t.premise && (
                    <div
                      className="text-[10px] font-mono leading-snug mt-0.5 truncate"
                      style={{ color: "var(--kai-text-muted)" }}
                      title={t.premise}
                    >
                      {t.premise}
                    </div>
                  )}
                  {t.source === "user_pick" && (
                    <div
                      className="text-[9px] font-mono tracking-[0.15em] mt-0.5"
                      style={{ color: "var(--kai-gold)" }}
                    >
                      YOUR PICK
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span
                    className="text-[9px] font-mono tracking-wider uppercase"
                    style={{ color: "var(--kai-text-muted)" }}
                  >
                    Entry
                  </span>
                  <span
                    className="font-mono text-sm tabular-nums"
                    style={{ color: "var(--kai-text)" }}
                  >
                    ${t.entry_price.toFixed(2)}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--kai-text-dim)" }} />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* My Watchlist */}
      <section>
        <div className="flex items-baseline justify-between mb-2 px-1">
          <h2
            className="text-[10px] font-mono tracking-[0.2em] uppercase"
            style={{ color: "var(--kai-text)" }}
          >
            My Watchlist
          </h2>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 px-2 py-1 -my-1 text-[10px] font-mono tracking-[0.15em] rounded-sm"
            style={{ color: "var(--kai-gold)" }}
          >
            <Plus className="w-3 h-3" strokeWidth={2.5} />
            ADD
          </button>
        </div>
        {watchlistPicks.length === 0 ? (
          <div
            className="border rounded-sm px-4 py-6 text-center text-[11px] font-mono"
            style={{
              borderColor: "var(--kai-border)",
              background: "var(--kai-surface)",
              color: "var(--kai-text-muted)",
            }}
          >
            Empty. Tap ADD to start tracking your own picks.
          </div>
        ) : (
          <div
            className="border rounded-sm overflow-hidden"
            style={{ borderColor: "var(--kai-border)", background: "var(--kai-surface)" }}
          >
            {watchlistPicks.map((p, idx) => {
              const muted = isMuted(p.ticker);
              const sys = p.system;
              return (
                <div
                  key={p.ticker}
                  className="flex items-stretch transition-colors"
                  style={{ borderTop: idx > 0 ? "1px solid var(--kai-border)" : "none" }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleMute(p.ticker);
                    }}
                    className="px-3 flex items-center transition-colors"
                    style={{
                      color: muted ? "var(--kai-text-muted)" : "var(--kai-gold)",
                    }}
                    aria-label={muted ? `Unmute ${p.ticker}` : `Mute ${p.ticker}`}
                  >
                    {muted ? (
                      <BellOff className="w-3.5 h-3.5" />
                    ) : (
                      <Bell className="w-3.5 h-3.5" fill="currentColor" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => goToTicker(p.ticker)}
                    className="flex-1 py-3 pr-3.5 flex items-center gap-2.5 text-left min-w-0 hover:bg-[var(--kai-surface-2)]"
                    style={{ opacity: muted ? 0.55 : 1 }}
                  >
                    <TickerLogo symbol={p.ticker} size={28} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono text-sm tracking-wider"
                          style={{ color: "var(--kai-text)" }}
                        >
                          {p.ticker}
                        </span>
                        {sys && <StateBadge state={sys.state} compact />}
                      </div>
                      {sys?.read && (
                        <div
                          className="kai-serif text-[11px] truncate mt-0.5"
                          style={{ color: "var(--kai-text-muted)" }}
                        >
                          {sys.read}
                        </div>
                      )}
                    </div>
                    {(() => {
                      const live = quotesByTicker.get(p.ticker);
                      // Use live quote first, then system data, then nothing.
                      const price = live?.price ?? sys?.price;
                      const changePct = live?.change_pct ?? sys?.change_pct;
                      if (price != null && changePct != null) {
                        return (
                          <>
                            <div className="flex flex-col items-end gap-0.5 shrink-0">
                              <span
                                className="font-mono text-sm tabular-nums"
                                style={{ color: "var(--kai-text)" }}
                              >
                                ${price.toFixed(2)}
                              </span>
                              <ChangePercent value={changePct} />
                            </div>
                            {sys ? (
                              <ScoreDot score={sys.score} />
                            ) : (
                              <span
                                className="text-[9px] font-mono tracking-[0.1em] uppercase"
                                style={{ color: "var(--kai-text-dim)" }}
                                title="Not yet on Kai's scored watchlist"
                              >
                                Watch
                              </span>
                            )}
                          </>
                        );
                      }
                      return (
                        <span
                          className="text-[10px] font-mono"
                          style={{ color: "var(--kai-text-dim)" }}
                        >
                          loading…
                        </span>
                      );
                    })()}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void remove(p.ticker);
                      }}
                      className="text-[9px] font-mono tracking-[0.1em] uppercase ml-2 px-1.5 py-0.5 rounded-sm"
                      style={{ color: "var(--kai-red)" }}
                    >
                      ✕
                    </button>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* System Top 10 */}
      <section>
        <div className="flex items-baseline justify-between mb-2 px-1 gap-2 flex-wrap">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h2
              className="text-[10px] font-mono tracking-[0.2em] uppercase"
              style={{ color: "var(--kai-text)" }}
            >
              Kai's Top 10
            </h2>
            {meta && (
              <span
                className="text-[9px] font-mono tracking-[0.15em] uppercase"
                style={{ color: meta.is_stale ? "var(--kai-red)" : "var(--kai-text-dim)" }}
              >
                · {fmtWatchlistDate(meta.generated_for_date)}
                {meta.is_stale ? ` (${meta.age_days}d old)` : ""}
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono" style={{ color: "var(--kai-text-muted)" }}>
            SCORE · PRICE
          </span>
        </div>
        {sysLoading ? (
          <div
            className="border rounded-sm px-4 py-6 text-center text-[11px] font-mono"
            style={{
              borderColor: "var(--kai-border)",
              background: "var(--kai-surface)",
              color: "var(--kai-text-muted)",
            }}
          >
            Loading picks…
          </div>
        ) : top10.length === 0 ? (
          <div
            className="border rounded-sm px-4 py-6 text-center text-[11px] font-mono"
            style={{
              borderColor: "var(--kai-border)",
              background: "var(--kai-surface)",
              color: "var(--kai-text-muted)",
            }}
          >
            No picks published yet today. Kai builds the daily watchlist before market open.
          </div>
        ) : (
          <div
            className="border rounded-sm overflow-hidden"
            style={{ borderColor: "var(--kai-border)", background: "var(--kai-surface)" }}
          >
            {top10.map((t, idx) => (
              <button
                key={t.ticker}
                type="button"
                onClick={() => goToTicker(t.ticker)}
                className="w-full px-3 py-3 flex items-center gap-2 text-left transition-colors hover:bg-[var(--kai-surface-2)]"
                style={{ borderTop: idx > 0 ? "1px solid var(--kai-border)" : "none" }}
              >
                <span
                  className="font-mono text-[10px] tabular-nums w-5 shrink-0"
                  style={{ color: "var(--kai-text-dim)" }}
                >
                  {String(t.rank).padStart(2, "0")}
                </span>
                <TickerLogo symbol={t.ticker} size={26} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="font-mono text-sm tracking-wider"
                      style={{ color: "var(--kai-text)" }}
                    >
                      {t.ticker}
                    </span>
                    <StateBadge state={t.state} compact />
                    {t.direction === "short" && (
                      <span
                        className="text-[8px] font-mono tracking-[0.15em] uppercase"
                        style={{ color: "var(--kai-red)" }}
                      >
                        Short
                      </span>
                    )}
                    {/* PROMOTED — wasn't in yesterday's Top 10 */}
                    {prevTopTickers.size > 0 && !prevTopTickers.has(t.ticker) && (
                      <span
                        className="text-[8px] font-mono tracking-[0.15em] uppercase px-1 py-0.5 rounded-sm"
                        style={{
                          backgroundColor: "color-mix(in oklab, var(--kai-gold) 18%, transparent)",
                          color: "var(--kai-gold)",
                        }}
                        title="Newly promoted into Top 10 today"
                      >
                        ↑ New
                      </span>
                    )}
                  </div>
                  <div
                    className="text-[10px] tracking-wide mt-0.5 truncate"
                    style={{ color: "var(--kai-text-muted)" }}
                  >
                    {t.setup_label ?? t.sector ?? ""}
                    {t.entry_low != null && t.entry_high != null
                      ? ` · $${t.entry_low.toFixed(2)}–${t.entry_high.toFixed(2)}`
                      : ""}
                  </div>
                </div>
                {/* Hide sparkline on narrow phones */}
                <span className="hidden sm:block">
                  <MiniSparkline
                    symbol={t.ticker}
                    positive={(quotesByTicker.get(t.ticker)?.change_pct ?? t.change_pct) >= 0}
                  />
                </span>
                <div className="flex flex-col items-end gap-0.5 shrink-0 w-[58px]">
                  <span
                    className="font-mono text-xs tabular-nums"
                    style={{ color: "var(--kai-text)" }}
                  >
                    ${(quotesByTicker.get(t.ticker)?.price ?? t.price).toFixed(2)}
                  </span>
                  <ChangePercent
                    value={quotesByTicker.get(t.ticker)?.change_pct ?? t.change_pct}
                    size="xs"
                  />
                </div>
                <ScoreDot score={t.score} />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* More Watched — broader weekly tier, ranks below today's Top 10 */}
      {moreWatched.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setUniverseOpen(!universeIsOpen)}
            className="w-full flex items-center justify-between px-1 py-2"
          >
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2
                className="text-[10px] font-mono tracking-[0.2em] uppercase"
                style={{ color: "var(--kai-text-muted)" }}
              >
                More Watched
              </h2>
              <span
                className="text-[9px] font-mono tracking-[0.15em] uppercase"
                style={{ color: "var(--kai-gold)" }}
              >
                · {moreWatchedSourceLabel}
              </span>
              <span
                className="text-[10px] font-mono"
                style={{ color: "var(--kai-text-dim)" }}
              >
                +{moreWatched.length}
              </span>
              {weekly.picks.length > 0 && weekly.age_hours > 24 * 8 && (
                <span
                  className="text-[9px] font-mono"
                  style={{ color: "var(--kai-red)" }}
                >
                  ⚠ {Math.floor(weekly.age_hours / 24)}d old
                </span>
              )}
            </div>
            {universeIsOpen ? (
              <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--kai-text-muted)" }} />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--kai-text-muted)" }} />
            )}
          </button>
          {universeIsOpen && (
            <div
              className="border rounded-sm mt-1 overflow-hidden"
              style={{ borderColor: "var(--kai-border)", background: "var(--kai-surface)" }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2">
                {[
                  moreWatched.slice(0, Math.ceil(moreWatched.length / 2)),
                  moreWatched.slice(Math.ceil(moreWatched.length / 2)),
                ].map((col, ci) => (
                  <div
                    key={ci}
                    className={ci === 0 ? "sm:border-r" : ""}
                    style={{
                      borderColor: "var(--kai-border)",
                      borderTopWidth: ci === 1 ? "1px" : "0",
                    }}
                  >
                    {col.map((t, idx) => (
                      <button
                        key={t.ticker}
                        type="button"
                        onClick={() => goToTicker(t.ticker)}
                        className="w-full px-2.5 py-2.5 flex items-center gap-2 text-left transition-colors hover:bg-[var(--kai-surface-2)]"
                        style={{
                          borderTop: idx > 0 ? "1px solid var(--kai-border)" : "none",
                        }}
                      >
                        <TickerLogo symbol={t.ticker} size={22} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className="font-mono text-[12px] tracking-wider"
                              style={{ color: "var(--kai-text-2)" }}
                            >
                              {t.ticker}
                            </span>
                            {/* DEMOTED — was in Top 10 yesterday, fell to weekly today */}
                            {prevTopTickers.has(t.ticker) && (
                              <span
                                className="text-[8px] font-mono tracking-[0.1em] uppercase px-1 py-0.5 rounded-sm"
                                style={{
                                  backgroundColor: "color-mix(in oklab, var(--kai-red) 14%, transparent)",
                                  color: "var(--kai-red)",
                                }}
                                title="Was in Top 10 yesterday — still on weekly watch"
                              >
                                ↓ Cut
                              </span>
                            )}
                            {t.rs_vs_spy_20d > 60 && (
                              <span
                                className="text-[8px] font-mono tracking-[0.1em] uppercase"
                                style={{ color: "var(--kai-green)" }}
                                title={`Outperforming SPY · RS ${t.rs_vs_spy_20d.toFixed(0)}`}
                              >
                                Strong
                              </span>
                            )}
                          </div>
                          <div
                            className="text-[9px] truncate"
                            style={{ color: "var(--kai-text-dim)" }}
                          >
                            5d {t.chg_5d >= 0 ? "+" : ""}{t.chg_5d.toFixed(1)}%
                            {t.chg_20d ? ` · 20d ${t.chg_20d >= 0 ? "+" : ""}${t.chg_20d.toFixed(0)}%` : ""}
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <span
                            className="font-mono text-[10px] tabular-nums"
                            style={{ color: "var(--kai-text-2)" }}
                          >
                            ${(quotesByTicker.get(t.ticker)?.price ?? t.last_close).toFixed(2)}
                          </span>
                          <ScoreDot score={t.score} size="xs" />
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <AddPickModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={async (ticker) => {
          await add(ticker);
        }}
      />
    </div>
  );
}
