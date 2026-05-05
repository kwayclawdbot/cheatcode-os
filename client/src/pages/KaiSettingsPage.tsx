// KaiSettingsPage — alert preferences, muted tickers, channel selection
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { TickerLogo } from "@/components/intelligence/TickerLogo";
import { Toggle } from "@/components/kai/Toggle";
import { useKaiAlertPrefs } from "@/hooks/kai/useKaiAlertPrefs";
import { useKaiMutedTickers } from "@/hooks/kai/useKaiMutedTickers";
import { useKaiWatchlist } from "@/hooks/kai/useKaiWatchlist";
import { useKaiAlertEstimate } from "@/hooks/kai/useKaiAlertEstimate";
import type { KaiSystemTier } from "@/lib/kai/types";

interface TierOption {
  key: KaiSystemTier;
  label: string;
  desc: string;
  recommended?: boolean;
  warning?: boolean;
}

const TIER_OPTIONS: TierOption[] = [
  {
    key: "top5",
    label: "Top 5 only",
    desc: "Highest conviction. Best for beginners.",
    recommended: true,
  },
  {
    key: "top10",
    label: "Full Top 10",
    desc: "More opportunities. Moderate volume.",
  },
  {
    key: "universe",
    label: "All 30 watched tickers",
    desc: "Every trigger Kai fires. High volume.",
    warning: true,
  },
];

export function KaiSettingsPage() {
  const { prefs, update, loading } = useKaiAlertPrefs();
  const { muted, toggle } = useKaiMutedTickers();
  const { watchlist } = useKaiWatchlist();
  const estimate = useKaiAlertEstimate({ prefs, watchlistCount: watchlist.length });

  if (loading || !prefs) {
    return (
      <div className="space-y-5">
        <Link
          href="/kai"
          className="flex items-center gap-1.5 -ml-1 px-1 py-1 text-[10px] font-mono tracking-[0.15em] uppercase"
          style={{ color: "var(--kai-text-muted)" }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </Link>
        <p className="font-mono text-[11px]" style={{ color: "var(--kai-text-muted)" }}>
          Loading…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href="/kai"
        className="flex items-center gap-1.5 -ml-1 px-1 py-1 text-[10px] font-mono tracking-[0.15em] uppercase"
        style={{ color: "var(--kai-text-muted)" }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </Link>

      <div>
        <h1
          className="font-mono text-xl tracking-wider"
          style={{ color: "var(--kai-text)" }}
        >
          Alert Settings
        </h1>
        <p className="text-xs mt-1" style={{ color: "var(--kai-text-muted)" }}>
          Choose what triggers a notification
        </p>
      </div>

      {/* Daily estimate — derived from real 30d firing rate, not switches */}
      <div
        className="border rounded-sm px-3.5 py-3 flex items-center justify-between"
        style={{
          borderColor: "color-mix(in oklab, var(--kai-gold) 40%, transparent)",
          background: "var(--kai-surface)",
        }}
      >
        <div>
          <div
            className="text-[9px] font-mono tracking-[0.2em] uppercase"
            style={{ color: "var(--kai-gold)" }}
          >
            Estimated Alerts / Day
          </div>
          <div className="text-[10px] mt-1" style={{ color: "var(--kai-text-muted)" }}>
            Last 30 days · adjusted for your tier
          </div>
        </div>
        <div className="font-mono tabular-nums">
          {estimate == null ? (
            <span className="text-xl" style={{ color: "var(--kai-text-dim)" }}>—</span>
          ) : (
            <span className="text-2xl" style={{ color: "var(--kai-gold)" }}>
              ~{estimate}
            </span>
          )}
        </div>
      </div>

      {/* System tier */}
      <section>
        <div
          className="text-[10px] font-mono tracking-[0.2em] uppercase mb-2 px-1"
          style={{ color: "var(--kai-text)" }}
        >
          Kai's System Picks
        </div>
        <div
          className="border rounded-sm overflow-hidden"
          style={{ borderColor: "var(--kai-border)", background: "var(--kai-surface)" }}
        >
          {TIER_OPTIONS.map((option, idx) => (
            <div
              key={option.key}
              className="px-3.5 py-3 flex items-center justify-between gap-3"
              style={{ borderTop: idx > 0 ? "1px solid var(--kai-border)" : "none" }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="font-mono text-sm"
                    style={{ color: "var(--kai-text)" }}
                  >
                    {option.label}
                  </span>
                  {option.recommended && (
                    <span
                      className="text-[9px] font-mono tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-sm"
                      style={{
                        backgroundColor: "color-mix(in oklab, var(--kai-green) 20%, transparent)",
                        color: "var(--kai-green)",
                      }}
                    >
                      Recommended
                    </span>
                  )}
                  {option.warning && (
                    <span
                      className="text-[9px] font-mono tracking-[0.1em] uppercase"
                      style={{ color: "var(--kai-gold)" }}
                    >
                      ⚠ High volume
                    </span>
                  )}
                </div>
                <div
                  className="text-[11px] mt-1"
                  style={{ color: "var(--kai-text-muted)" }}
                >
                  {option.desc}
                </div>
              </div>
              <Toggle
                on={prefs.system_tier === option.key}
                onChange={(v) => {
                  if (v) void update({ system_tier: option.key });
                }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Personal picks tier */}
      <section>
        <div
          className="text-[10px] font-mono tracking-[0.2em] uppercase mb-2 px-1"
          style={{ color: "var(--kai-text)" }}
        >
          My Watchlist
        </div>
        <div
          className="border rounded-sm overflow-hidden"
          style={{ borderColor: "var(--kai-border)", background: "var(--kai-surface)" }}
        >
          <div className="px-3.5 py-3 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-mono text-sm" style={{ color: "var(--kai-text)" }}>
                Alert me on my picks
              </div>
              <div
                className="text-[11px] mt-1"
                style={{ color: "var(--kai-text-muted)" }}
              >
                Notify when any of your {watchlist.length} stock
                {watchlist.length === 1 ? "" : "s"} trigger
              </div>
            </div>
            <Toggle
              on={prefs.personal_picks}
              onChange={(v) => void update({ personal_picks: v })}
            />
          </div>
          <div
            className="px-3.5 py-3 flex items-center justify-between gap-3"
            style={{ borderTop: "1px solid var(--kai-border)" }}
          >
            <div className="flex-1 min-w-0">
              <div className="font-mono text-sm" style={{ color: "var(--kai-text)" }}>
                Low-quality warning
              </div>
              <div
                className="text-[11px] mt-1"
                style={{ color: "var(--kai-text-muted)" }}
              >
                Add ⚠ tag to alerts where Kai score &lt; 40
              </div>
            </div>
            <Toggle
              on={prefs.low_quality_warning}
              onChange={(v) => void update({ low_quality_warning: v })}
            />
          </div>
        </div>
      </section>

      {/* Channels + pause */}
      <section>
        <div
          className="text-[10px] font-mono tracking-[0.2em] uppercase mb-2 px-1"
          style={{ color: "var(--kai-text)" }}
        >
          Delivery
        </div>
        <div
          className="border rounded-sm overflow-hidden"
          style={{ borderColor: "var(--kai-border)", background: "var(--kai-surface)" }}
        >
          <ChannelRow
            label="SMS"
            sub="Twilio text message"
            on={prefs.channel_sms}
            onChange={(v) => void update({ channel_sms: v })}
          />
          <ChannelRow
            label="In-app"
            sub="Live triggers feed in this dashboard"
            on={prefs.channel_inapp}
            onChange={(v) => void update({ channel_inapp: v })}
            divider
          />
          <ChannelRow
            label="Push (coming soon)"
            sub="Browser + PWA notifications"
            on={prefs.channel_push}
            onChange={(v) => void update({ channel_push: v })}
            divider
            disabled
          />
          <div
            className="px-3.5 py-3 flex items-center justify-between gap-3"
            style={{ borderTop: "1px solid var(--kai-border)" }}
          >
            <div className="flex-1 min-w-0">
              <div className="font-mono text-sm" style={{ color: "var(--kai-text)" }}>
                Pause all alerts
              </div>
              <div
                className="text-[11px] mt-1"
                style={{ color: "var(--kai-text-muted)" }}
              >
                Mute everything. Resume anytime.
              </div>
            </div>
            <Toggle
              on={prefs.pause_all}
              onChange={(v) => void update({ pause_all: v })}
            />
          </div>
        </div>
      </section>

      {/* Muted tickers */}
      {muted.length > 0 && (
        <section>
          <div
            className="text-[10px] font-mono tracking-[0.2em] uppercase mb-2 px-1"
            style={{ color: "var(--kai-text)" }}
          >
            Muted Tickers · {muted.length}
          </div>
          <div
            className="border rounded-sm overflow-hidden"
            style={{ borderColor: "var(--kai-border)", background: "var(--kai-surface)" }}
          >
            {muted.map((ticker, idx) => (
              <div
                key={ticker}
                className="px-3.5 py-2.5 flex items-center gap-3"
                style={{ borderTop: idx > 0 ? "1px solid var(--kai-border)" : "none" }}
              >
                <TickerLogo symbol={ticker} size={24} />
                <span
                  className="font-mono text-sm tracking-wider flex-1"
                  style={{ color: "var(--kai-text)" }}
                >
                  {ticker}
                </span>
                <button
                  type="button"
                  onClick={() => void toggle(ticker)}
                  className="text-[10px] font-mono tracking-[0.15em] uppercase px-2 py-1 rounded-sm"
                  style={{ color: "var(--kai-gold)" }}
                >
                  Unmute
                </button>
              </div>
            ))}
          </div>
          <p
            className="text-[10px] mt-2 px-1 leading-relaxed"
            style={{ color: "var(--kai-text-muted)" }}
          >
            Muted tickers won't notify even if your global settings allow them.
          </p>
        </section>
      )}
    </div>
  );
}

function ChannelRow({
  label,
  sub,
  on,
  onChange,
  divider,
  disabled,
}: {
  label: string;
  sub: string;
  on: boolean;
  onChange: (v: boolean) => void;
  divider?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      className="px-3.5 py-3 flex items-center justify-between gap-3"
      style={{ borderTop: divider ? "1px solid var(--kai-border)" : "none" }}
    >
      <div className="flex-1 min-w-0">
        <div className="font-mono text-sm" style={{ color: "var(--kai-text)" }}>
          {label}
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: "var(--kai-text-muted)" }}>
          {sub}
        </div>
      </div>
      <Toggle on={on} onChange={onChange} disabled={disabled} />
    </div>
  );
}
