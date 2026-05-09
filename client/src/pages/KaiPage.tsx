// KaiPage — shell + entitlement gate + sub-route routing for /kai/*
// Wraps every K.AI screen in <div className="kai-module"> so the scoped
// CSS variables in index.css apply.
import { useEffect } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { Settings as SettingsIcon } from "lucide-react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useKaiEntitlement } from "@/hooks/kai/useKaiEntitlement";
import { useKaiAlertPrefs } from "@/hooks/kai/useKaiAlertPrefs";
import { KaiTodayPage } from "./KaiTodayPage";
import { KaiHistoryPage } from "./KaiHistoryPage";
import { KaiSettingsPage } from "./KaiSettingsPage";
import { KaiTickerDetailPage } from "./KaiTickerDetailPage";
import { KaiWinsPage } from "./KaiWinsPage";

export default function KaiPage() {
  return (
    <ErrorBoundary>
      <KaiPageInner />
    </ErrorBoundary>
  );
}

function KaiPageInner() {
  const ent = useKaiEntitlement();
  const [, navigate] = useLocation();
  const [isToday] = useRoute("/kai");
  const [isHistory] = useRoute("/kai/history");
  const [isWins] = useRoute("/kai/wins");
  const [isSettings] = useRoute("/kai/settings");
  const [tickerMatch, tickerParams] = useRoute("/kai/t/:symbol");
  const { prefs } = useKaiAlertPrefs();

  // Side-effect navigation must happen in an effect, not during render.
  useEffect(() => {
    if (ent === "unauthenticated") {
      navigate("/auth?next=/kai");
    }
  }, [ent, navigate]);

  // Surface entitlement state in the console so you can see exactly where
  // the gate is landing while developing.
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.debug("[kai] entitlement:", ent);
  }, [ent]);

  if (ent === "loading") {
    return (
      <div className="kai-module min-h-screen flex items-center justify-center">
        <span className="font-mono text-[11px] tracking-[0.2em] uppercase opacity-60">
          Loading…
        </span>
      </div>
    );
  }
  if (ent === "unauthenticated") {
    return (
      <div className="kai-module min-h-screen flex items-center justify-center">
        <span className="font-mono text-[11px] tracking-[0.2em] uppercase opacity-60">
          Redirecting to sign in…
        </span>
      </div>
    );
  }
  if (ent === "denied") {
    return <KaiUpgradeGate onPricing={() => navigate("/pricing")} />;
  }

  const showSubnav = !tickerMatch && !isSettings;

  return (
    <div className="kai-module min-h-screen w-full">
      {/* Header */}
      <header
        className="sticky top-0 z-40"
        style={{ background: "var(--kai-bg)", borderBottom: "1px solid var(--kai-border)" }}
      >
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <Link href="/kai" className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-sm flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, var(--kai-gold), var(--kai-gold-dark))",
              }}
            >
              <span
                className="font-mono text-[11px] font-bold"
                style={{ color: "var(--kai-bg)" }}
              >
                K
              </span>
            </span>
            <span
              className="font-mono text-sm tracking-[0.2em]"
              style={{ color: "var(--kai-text)" }}
            >
              K.AI
            </span>
            {prefs?.pause_all && (
              <span
                className="text-[9px] font-mono tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm ml-1"
                style={{
                  backgroundColor: "color-mix(in oklab, var(--kai-red) 25%, transparent)",
                  color: "var(--kai-red)",
                }}
              >
                Paused
              </span>
            )}
          </Link>
          <Link
            href="/kai/settings"
            className="-m-2 p-2 transition-colors"
            style={{
              color: isSettings ? "var(--kai-gold)" : "var(--kai-text-muted)",
            }}
          >
            <SettingsIcon className="w-4 h-4" />
          </Link>
        </div>

        {showSubnav && (
          <nav
            className="max-w-2xl mx-auto px-4 flex gap-5"
            style={{ borderTop: "1px solid var(--kai-border)" }}
          >
            <SubnavLink href="/kai" label="Today" active={!!isToday} />
            <SubnavLink href="/kai/history" label="History" active={!!isHistory} />
            <SubnavLink href="/kai/wins" label="Wins" active={!!isWins} />
          </nav>
        )}
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 pb-20">
        {isToday && <KaiTodayPage />}
        {isHistory && <KaiHistoryPage />}
        {isWins && <KaiWinsPage />}
        {isSettings && <KaiSettingsPage />}
        {tickerMatch && tickerParams?.symbol && (
          <KaiTickerDetailPage symbol={tickerParams.symbol.toUpperCase()} />
        )}
      </main>
    </div>
  );
}

function SubnavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className="py-2.5 text-[11px] font-mono tracking-[0.2em] uppercase transition-colors relative"
      style={{ color: active ? "var(--kai-gold)" : "var(--kai-text-muted)" }}
    >
      {label}
      {active && (
        <span
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ backgroundColor: "var(--kai-gold)" }}
        />
      )}
    </Link>
  );
}

function KaiUpgradeGate({ onPricing }: { onPricing: () => void }) {
  return (
    <div className="kai-module min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-sm space-y-4">
        <div
          className="w-12 h-12 mx-auto rounded-sm flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, var(--kai-gold), var(--kai-gold-dark))",
          }}
        >
          <span
            className="font-mono text-lg font-bold"
            style={{ color: "var(--kai-bg)" }}
          >
            K
          </span>
        </div>
        <h1
          className="font-mono text-xl tracking-[0.15em] uppercase"
          style={{ color: "var(--kai-text)" }}
        >
          K.AI Module
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "var(--kai-text-2)" }}>
          K.AI is included with active CheatCode subscriptions. Subscribe or restart
          your trial to unlock the dashboard, watchlist, and live triggers.
        </p>
        <button
          type="button"
          onClick={onPricing}
          className="w-full py-3 font-mono text-[11px] tracking-[0.2em] uppercase rounded-sm"
          style={{ backgroundColor: "var(--kai-gold)", color: "var(--kai-bg)" }}
        >
          See Pricing
        </button>
      </div>
    </div>
  );
}
