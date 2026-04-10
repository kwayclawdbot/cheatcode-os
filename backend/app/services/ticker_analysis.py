"""Daily Ticker Analysis — Claude generates fresh analysis for each tracked ticker."""

import json
import logging
from datetime import datetime, timezone

import anthropic
from app.core.config import get_settings
from app.core.supabase import get_supabase, maybe_one
from app.services.market_data import fetch_bulk_quotes

log = logging.getLogger("ticker_analysis")


def _get_kai_context(symbol: str) -> str:
    """Pull proprietary intelligence from Kai's breakout-alert-system tables.

    Queries: sent_alerts, alert_performance, kai_market_context, vault_store.
    Returns a formatted text block. Returns empty string on failure.
    """
    try:
        db = get_supabase()
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        sections: list[str] = []

        # 1. Alert history — last 5 alerts for this ticker
        alerts = (
            db.table("sent_alerts")
            .select("ticker, alert_price, breakout_score, setup_label, catalyst_type, flow_score, sent_at")
            .eq("ticker", symbol)
            .order("sent_at", desc=True)
            .limit(5)
            .execute()
        )
        if alerts.data:
            lines = []
            for a in alerts.data:
                dt = a.get("sent_at", "")[:10]
                lines.append(
                    f"  - {dt}: ${a.get('alert_price', '?')} | "
                    f"setup={a.get('setup_label', '?')} | "
                    f"breakout_score={a.get('breakout_score', '?')}/100 | "
                    f"catalyst={a.get('catalyst_type', 'N/A')}"
                )
            sections.append("OUR ALERT HISTORY:\n" + "\n".join(lines))

        # 2. Alert performance
        perf = (
            db.table("alert_performance")
            .select("ticker, max_gain_pct, current_gain_pct, status")
            .eq("ticker", symbol)
            .order("max_gain_pct", desc=True)
            .limit(5)
            .execute()
        )
        if perf.data:
            lines = []
            for p in perf.data:
                lines.append(
                    f"  - max_gain={p.get('max_gain_pct', '?')}% | "
                    f"current={p.get('current_gain_pct', '?')}% | "
                    f"status={p.get('status', '?')}"
                )
            sections.append("ALERT PERFORMANCE:\n" + "\n".join(lines))

        # 3. Dark pool / institutional flow — alerts with flow_score > 0
        flow_alerts = (
            db.table("sent_alerts")
            .select("ticker, flow_score, sent_at, alert_price")
            .eq("ticker", symbol)
            .gt("flow_score", 0)
            .order("sent_at", desc=True)
            .limit(3)
            .execute()
        )
        if flow_alerts.data:
            lines = []
            for f in flow_alerts.data:
                dt = f.get("sent_at", "")[:10]
                lines.append(
                    f"  - {dt}: Institutional dark pool activity detected "
                    f"(flow score {f.get('flow_score', '?')}/10) at ${f.get('alert_price', '?')}"
                )
            sections.append("DARK POOL / INSTITUTIONAL FLOW:\n" + "\n".join(lines))

        # 4. News intel connections — today's vault intel
        intel_key = f"Kai/Intel/{today}.json"
        intel = maybe_one(
            db.table("vault_store").select("value").eq("key", intel_key)
        )
        if intel.data:
            try:
                raw = intel.data.get("value", "{}")
                intel_data = json.loads(raw) if isinstance(raw, str) else raw
                connections = intel_data.get("connections", [])
                relevant = [
                    c for c in connections
                    if symbol in (c.get("tickers_affected", []) or [])
                ]
                if relevant:
                    lines = []
                    for c in relevant[:3]:
                        other_tickers = [
                            t for t in (c.get("tickers_affected", []) or [])
                            if t != symbol
                        ]
                        lines.append(
                            f"  - {c.get('headline', '?')}\n"
                            f"    Chain: {c.get('chain', 'N/A')}\n"
                            f"    Direction: {c.get('direction', '?')} | "
                            f"Linked tickers: {', '.join(other_tickers) or 'none'}"
                        )
                    sections.append("NEWS INTEL CONNECTIONS (today):\n" + "\n".join(lines))
            except (json.JSONDecodeError, TypeError):
                pass

        # 5. Earnings analysis — search vault for ticker earnings file
        earnings_key = f"12 - Earnings Intel/by-ticker/{symbol}"
        earnings = (
            db.table("vault_store")
            .select("key, value")
            .ilike("key", f"%{earnings_key}%")
            .limit(1)
            .execute()
        )
        if earnings.data:
            val = earnings.data[0].get("value", "")
            snippet = val[:500] if isinstance(val, str) else str(val)[:500]
            if snippet:
                sections.append(f"EARNINGS ANALYSIS:\n  {snippet}")

        # 6. Market regime context
        regime = (
            db.table("kai_market_context")
            .select("regime, analysis")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if regime.data:
            r = regime.data[0]
            sections.append(
                f"MARKET REGIME (today): {r.get('regime', 'unknown')}\n"
                f"  {(r.get('analysis', '') or '')[:300]}"
            )

        if not sections:
            return ""

        return (
            "KAI INTELLIGENCE (internal — not available on other platforms):\n"
            + "\n\n".join(sections)
        )

    except Exception as e:
        log.warning("Kai context unavailable for %s: %s", symbol, e)
        return ""


async def analyze_ticker(symbol: str) -> dict | None:
    """Generate a comprehensive daily analysis for a single ticker."""
    s = get_settings()
    db = get_supabase()

    # Get ticker data — returns None if symbol unknown (not an error)
    ticker = maybe_one(db.table("tickers").select("*").eq("symbol", symbol))
    if not ticker.data:
        return None

    t = ticker.data

    # Get live quote
    quotes = await fetch_bulk_quotes([symbol])
    quote = quotes.get(symbol, {})

    # Get recent content mentions
    mentions = db.table("content_tickers").select(
        "ticker, mention_context, sentiment, content(title, quick_take, curated_at)"
    ).eq("ticker", symbol).order("created_at", desc=True).limit(5).execute()

    mention_text = ""
    for m in (mentions.data or []):
        c = m.get("content", {}) or {}
        mention_text += f"\n- [{m.get('sentiment', '?')}] {c.get('title', '?')}: {m.get('mention_context', '')[:150]}"

    # Get active themes this ticker belongs to
    themes = db.table("themes").select("name, status, description").execute()
    ticker_themes = [th for th in (themes.data or []) if symbol in (t.get("themes", []))]
    theme_text = "\n".join(f"- {th['name']} ({th['status']}): {th.get('description', '')[:100]}" for th in ticker_themes)

    # Kai proprietary intelligence
    kai_context = _get_kai_context(symbol)

    client = anthropic.Anthropic(api_key=s.anthropic_api_key)

    prompt = f"""You are Kai, the AI analyst for CheatCode OS. Write a daily ticker analysis for {symbol}.
Reference our proprietary data when relevant — alert track record, dark pool activity, earnings tone analysis, and cross-ticker connections are what make this analysis unique.

{kai_context}

TICKER DATA:
Symbol: {symbol}
Name: {t.get('name', symbol)}
Sector: {t.get('sector', 'N/A')}
Convergence Score: {t['convergence_score']}/100
Direction: {t.get('direction', 'N/A')}
Timeframe: {t.get('timeframe', 'N/A')}
Confidence: {t.get('confidence', 'N/A')}
Sources: {t.get('source_count', 0)}

LIVE PRICE:
Price: ${quote.get('price', 'N/A')}
Change: {quote.get('change_pct', 'N/A')}%
Open: ${quote.get('open', 'N/A')}
High: ${quote.get('high', 'N/A')}
Low: ${quote.get('low', 'N/A')}
Volume: {quote.get('volume', 'N/A'):,}

EVIDENCE CHAIN:
{json.dumps(t.get('evidence_chain', [])[:5], indent=2)}

CREATOR MENTIONS:
{mention_text or 'No recent mentions.'}

ACTIVE THEMES:
{theme_text or 'No active themes.'}

Write a JSON object with:
{{
  "analysis": "3-5 paragraph analysis. Be specific with numbers. Reference creator mentions if relevant. Start with the convergence score and what it means. Cover: technical setup, fundamental drivers, risk factors. End with what to watch. Write in Kai's voice — clinical, data-first, no hype.",
  "key_levels": {{
    "support": [price levels],
    "resistance": [price levels],
    "invalidation": "price level that invalidates the thesis"
  }},
  "catalysts": ["upcoming catalyst 1", "catalyst 2"],
  "risks": ["risk 1", "risk 2"],
  "tldr": "One sentence summary — direction, timeframe, confidence."
}}

Return ONLY valid JSON."""

    try:
        resp = client.messages.create(
            model="claude-haiku-4-5-20250514",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.content[0].text
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        result = json.loads(text)
    except (json.JSONDecodeError, Exception) as e:
        log.error("Analysis failed for %s: %s", symbol, e)
        return None

    # Save to DB
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    db.table("tickers").update({
        "daily_analysis": result.get("analysis", ""),
        "analysis_date": today,
        "key_levels": result.get("key_levels", {}),
        "catalysts": result.get("catalysts", []),
        "risks": result.get("risks", []),
        "catalyst": result.get("tldr", ""),
    }).eq("symbol", symbol).execute()

    log.info("Analysis generated for %s: %s", symbol, result.get("tldr", "")[:80])
    return result


async def run_daily_analysis():
    """Generate analysis for all tracked tickers with convergence score >= 50."""
    db = get_supabase()
    tickers = db.table("tickers").select("symbol").gte("convergence_score", 50).order("convergence_score", desc=True).execute()

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    results = []

    for t in (tickers.data or []):
        symbol = t["symbol"]
        # Skip if already analyzed today
        existing = db.table("tickers").select("analysis_date").eq("symbol", symbol).single().execute()
        if existing.data and existing.data.get("analysis_date") == today:
            continue

        result = await analyze_ticker(symbol)
        if result:
            results.append({"symbol": symbol, "tldr": result.get("tldr", "")})

    log.info("Daily analysis complete: %d tickers analyzed", len(results))
    return results
