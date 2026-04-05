"""Daily Ticker Analysis — Claude generates fresh analysis for each tracked ticker."""

import json
import logging
from datetime import datetime, timezone

import anthropic
from app.core.config import get_settings
from app.core.supabase import get_supabase
from app.services.market_data import fetch_bulk_quotes

log = logging.getLogger("ticker_analysis")


async def analyze_ticker(symbol: str) -> dict | None:
    """Generate a comprehensive daily analysis for a single ticker."""
    s = get_settings()
    db = get_supabase()

    # Get ticker data
    ticker = db.table("tickers").select("*").eq("symbol", symbol).single().execute()
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

    client = anthropic.Anthropic(api_key=s.anthropic_api_key)

    prompt = f"""You are Kai, the AI analyst for CheatCode OS. Write a daily ticker analysis for {symbol}.

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
            model=s.kai_model,
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
