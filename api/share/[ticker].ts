// Vercel Serverless Function — returns crawler-friendly HTML with per-ticker
// Open Graph + Twitter Card meta tags pointing at /api/og?ticker=TICKER, plus
// an immediate JS redirect to the SPA route /kai/wins/TICKER for humans.
//
// Use the URL https://cheatcode-os-app.vercel.app/share/AMD when posting links
// — Twitter, iMessage, Discord, Slack, etc. fetch this HTML, see the og tags,
// and render a rich preview with the dynamically generated card.

export const config = { runtime: "edge" };

const BACKEND =
  "https://cheatcode-os-api-production.up.railway.app/api/v1";
const FRONTEND_BASE =
  "https://cheatcode-os-app.vercel.app";

interface KaiBest {
  alert_price: number;
  peak_price: number | null;
  peak_pct: number | null;
}
interface KaiDetail {
  ticker: string;
  direction: "long" | "short";
  best: KaiBest;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "\"": return "&quot;";
      case "'": return "&#39;";
      default: return c;
    }
  });
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  // Path is /api/share/AMD or rewritten from /share/AMD — extract ticker
  const segments = url.pathname.split("/").filter(Boolean);
  const ticker = (segments[segments.length - 1] || "AMD").toUpperCase();

  let detail: KaiDetail | null = null;
  try {
    const res = await fetch(`${BACKEND}/kai/wins/${encodeURIComponent(ticker)}`);
    if (res.ok) detail = (await res.json()) as KaiDetail;
  } catch {
    /* fall through */
  }

  const peakPct = detail?.best?.peak_pct;
  const dir = detail?.direction === "short" ? "Short" : "Long";
  const verb = detail?.direction === "short" ? "dropped" : "ran";
  const title = peakPct !== null && peakPct !== undefined
    ? `K.AI · ${ticker} ${verb} ${peakPct >= 0 ? "+" : ""}${peakPct.toFixed(1)}%`
    : `K.AI · ${ticker}`;
  const description = detail?.best
    ? `${dir} call alerted at $${detail.best.alert_price?.toFixed(2)}. Peak $${detail.best.peak_price?.toFixed(2)}.`
    : `K.AI alert detail for ${ticker}.`;
  const ogImage = `${FRONTEND_BASE}/api/og?ticker=${encodeURIComponent(ticker)}&v=${Date.now()}`;
  const canonical = `${FRONTEND_BASE}/kai/wins/${encodeURIComponent(ticker)}`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />

<meta property="og:type" content="article" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${escapeHtml(ogImage)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${escapeHtml(canonical)}" />
<meta property="og:site_name" content="cheatcode.ai · K.AI" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${escapeHtml(ogImage)}" />

<link rel="canonical" href="${escapeHtml(canonical)}" />
<meta http-equiv="refresh" content="0;url=${escapeHtml(canonical)}" />
<script>window.location.replace(${JSON.stringify(canonical)});</script>
</head>
<body style="background:#0a0a0c;color:#f5f1e8;font-family:ui-monospace,monospace;padding:24px">
Loading <a style="color:#10b981" href="${escapeHtml(canonical)}">${escapeHtml(ticker)}</a>…
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
