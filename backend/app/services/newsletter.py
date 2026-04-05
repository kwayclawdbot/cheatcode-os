"""Newsletter generation — daily auto-generated email from brain data."""

import json
import logging
from datetime import datetime, timezone
import anthropic
from app.core.config import get_settings
from app.core.supabase import get_supabase, maybe_one

log = logging.getLogger("newsletter")


async def generate_daily_newsletter() -> dict:
    """Generate today's newsletter content from brain + curated content."""
    s = get_settings()
    db = get_supabase()

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Check if already generated
    existing = maybe_one(db.table("newsletters").select("id").eq("date", today))
    if existing.data:
        log.info("Newsletter already generated for %s", today)
        return existing.data

    # Gather data
    radar = maybe_one(db.table("radar_snapshots").select("*").eq("date", today))
    radar_data = radar.data or {}

    # Top curated content from last 24h
    top_content = db.table("content").select(
        "id, title, content_type, external_url, thumbnail_url, quick_take, "
        "creators:creator_id(name)"
    ).eq("is_published", True).order("relevance_score", desc=True).limit(5).execute()

    content_items = []
    for c in (top_content.data or []):
        creator = c.pop("creators", None) or {}
        content_items.append({
            "title": c["title"],
            "creator": creator.get("name", ""),
            "url": c["external_url"],
            "quick_take": c.get("quick_take", ""),
        })

    # Theme changes
    themes = db.table("themes").select("name, status, escalation_score").in_(
        "status", ["escalating", "emerging"]
    ).order("escalation_score", desc=True).limit(5).execute()

    # Generate newsletter via Claude
    client = anthropic.Anthropic(api_key=s.anthropic_api_key)
    prompt = f"""Generate a daily finance newsletter for CheatCode OS subscribers.

Date: {today}
Market Sentiment: {radar_data.get('market_sentiment', 'neutral')}
Sentiment Summary: {radar_data.get('sentiment_summary', '')}

Top Curated Content:
{json.dumps(content_items, indent=2)}

Active/Escalating Themes:
{json.dumps(themes.data or [], indent=2)}

Critical Tickers (90+ convergence): {json.dumps(radar_data.get('critical', [])[:5])}
High Conviction (75-89): {json.dumps(radar_data.get('high_conviction', [])[:5])}

Write the newsletter with:
1. Subject line (compelling, <60 chars)
2. One-line market regime summary
3. Top 3 curated videos with creator name, one-line take, and link
4. Theme changes section (what's escalating, what's cooling)
5. Intelligence tool CTA: "See which tickers are scoring 90+ right now →"
6. Upgrade CTA for free users

Return as JSON: {{"subject": "...", "body_html": "...", "body_text": "..."}}
Use clean, minimal HTML with inline styles. Mobile-friendly.
Return ONLY valid JSON."""

    resp = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
    )

    try:
        text = resp.content[0].text
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        newsletter = json.loads(text)
    except (json.JSONDecodeError, IndexError) as e:
        log.error("Failed to generate newsletter: %s", e)
        return {}

    # Save to DB
    content_ids = [c["id"] for c in (top_content.data or [])]
    record = {
        "date": today,
        "subject": newsletter.get("subject", f"CheatCode Daily — {today}"),
        "body_html": newsletter.get("body_html", ""),
        "body_text": newsletter.get("body_text", ""),
        "market_sentiment": radar_data.get("market_sentiment"),
        "top_content_ids": content_ids,
        "theme_changes": themes.data,
    }

    result = db.table("newsletters").insert(record).execute()
    log.info("Generated newsletter for %s: %s", today, newsletter.get("subject"))
    return result.data[0] if result.data else {}
