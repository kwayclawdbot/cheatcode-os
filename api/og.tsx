// Vercel Edge Function — renders the per-ticker share image at 1200×630.
// Called from /api/og?ticker=AMD.
// Pulls live data from the backend so the image always reflects the latest
// peak / entry. Same visual language as the in-app ShareCard.
import { ImageResponse } from "@vercel/og";

// Node runtime — @vercel/og supports both, and Node avoids the "unsupported
// modules" build error this monorepo hit on Edge.
export const config = { runtime: "nodejs" };

const BACKEND =
  "https://cheatcode-os-api-production.up.railway.app/api/v1";

interface KaiBest {
  sent_at: string;
  alert_price: number;
  peak_price: number | null;
  peak_pct: number | null;
  peak_date: string | null;
  days_to_peak: number | null;
}
interface KaiDetail {
  ticker: string;
  direction: "long" | "short";
  is_big_name: boolean;
  best: KaiBest;
  all_alerts: { sent_at: string }[];
}

function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const ticker = (url.searchParams.get("ticker") || "AMD").toUpperCase();

  let detail: KaiDetail | null = null;
  try {
    const res = await fetch(`${BACKEND}/kai/wins/${encodeURIComponent(ticker)}`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) detail = (await res.json()) as KaiDetail;
  } catch {
    /* fall through to fallback render */
  }

  const isLong = detail?.direction !== "short";
  const accent = isLong ? "#10b981" : "#f43f5e";
  const peakPct = detail?.best?.peak_pct ?? 0;
  const direction = isLong ? "Long Call" : "Short Call";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px",
          color: "#f5f1e8",
          fontFamily: "Inter, system-ui, sans-serif",
          background: `radial-gradient(120% 80% at 0% 0%, ${accent}33, transparent 60%), radial-gradient(120% 80% at 100% 100%, ${accent}1f, transparent 55%), linear-gradient(180deg, #18181c 0%, #0a0a0c 100%)`,
          position: "relative",
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            top: "-200px",
            right: "-100px",
            width: "800px",
            height: "800px",
            borderRadius: "50%",
            background: accent,
            opacity: 0.22,
            filter: "blur(120px)",
          }}
        />

        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
          <div
            style={{
              fontSize: 16,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              padding: "6px 14px",
              borderRadius: 4,
              background: `${accent}33`,
              color: accent,
              fontWeight: 700,
              display: "flex",
            }}
          >
            {direction}
          </div>
          {detail?.is_big_name && (
            <div
              style={{
                fontSize: 16,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                padding: "6px 14px",
                borderRadius: 4,
                background: "rgba(176,127,30,0.25)",
                color: "#e8b755",
                fontWeight: 700,
                display: "flex",
              }}
            >
              ★ Big Name
            </div>
          )}
        </div>

        {/* Middle row: ticker + peak% */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
            gap: 32,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 220,
                fontWeight: 900,
                lineHeight: 0.9,
                letterSpacing: "-0.05em",
                color: "#ffffff",
                display: "flex",
              }}
            >
              {detail?.ticker ?? ticker}
            </div>
            <div
              style={{
                fontSize: 22,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                opacity: 0.6,
                marginTop: 16,
                display: "flex",
              }}
            >
              K.AI Alert
              {detail?.best?.sent_at &&
                ` · ${new Date(detail.best.sent_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}`}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div
              style={{
                fontSize: 130,
                fontWeight: 900,
                lineHeight: 0.9,
                letterSpacing: "-0.04em",
                color: accent,
                display: "flex",
              }}
            >
              {peakPct >= 0 ? "+" : ""}
              {peakPct.toFixed(1)}%
            </div>
            <div
              style={{
                fontSize: 22,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                opacity: 0.6,
                marginTop: 12,
                display: "flex",
              }}
            >
              {isLong ? "Peak gain" : "Peak drop"}
              {detail?.best?.days_to_peak !== null && detail?.best?.days_to_peak !== undefined
                ? ` · ${detail.best.days_to_peak}d`
                : ""}
            </div>
          </div>
        </div>

        {/* Bottom row: entry → peak rail */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 28px",
            borderRadius: 16,
            background: "rgba(255,255,255,0.06)",
            border: `1px solid ${accent}33`,
            gap: 24,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 13, letterSpacing: "0.25em", textTransform: "uppercase", opacity: 0.55, display: "flex" }}>
              Entry
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, marginTop: 6, color: "#f5f1e8", display: "flex" }}>
              {fmtMoney(detail?.best?.alert_price)}
            </div>
          </div>
          <div
            style={{
              flex: 1,
              height: 2,
              background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ fontSize: 13, letterSpacing: "0.25em", textTransform: "uppercase", opacity: 0.55, display: "flex" }}>
              Peak
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, marginTop: 6, color: accent, display: "flex" }}>
              {fmtMoney(detail?.best?.peak_price)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 16,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            opacity: 0.55,
            position: "relative",
          }}
        >
          <div style={{ display: "flex" }}>cheatcode.ai · K.AI</div>
          <div style={{ display: "flex" }}>
            {detail?.all_alerts?.length ?? 0} alert{(detail?.all_alerts?.length ?? 0) === 1 ? "" : "s"} · 60d
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=600, stale-while-revalidate=3600",
      },
    },
  );
}
