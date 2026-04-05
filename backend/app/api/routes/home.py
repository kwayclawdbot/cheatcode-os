"""Home page API — today's picks, sentiment, topics."""

import time as _time
from fastapi import APIRouter, Depends
from app.core.supabase import get_supabase, maybe_one
from app.core.auth import get_current_user
from app.models.content import HomePageData, ContentCard
from datetime import datetime, timezone

router = APIRouter(prefix="/home", tags=["home"])

# In-memory cache — 60 second TTL
_cache: dict = {"data": None, "expires": 0}

TOPIC_GRID = [
    {"slug": "technical_analysis", "label": "Technical Analysis", "icon": "chart-line"},
    {"slug": "options", "label": "Options", "icon": "layers"},
    {"slug": "swing_trading", "label": "Swing Trading", "icon": "trending-up"},
    {"slug": "day_trading", "label": "Day Trading", "icon": "zap"},
    {"slug": "macro", "label": "Macro", "icon": "globe"},
    {"slug": "sectors", "label": "Sectors", "icon": "pie-chart"},
    {"slug": "crypto", "label": "Crypto", "icon": "bitcoin"},
    {"slug": "fundamentals", "label": "Fundamentals", "icon": "bar-chart"},
    {"slug": "psychology", "label": "Psychology", "icon": "brain"},
    {"slug": "earnings", "label": "Earnings", "icon": "dollar-sign"},
]


@router.get("", response_model=HomePageData)
async def get_home(user: dict | None = Depends(get_current_user)):
    # Return cached data for anonymous users (most traffic)
    if not user and _cache["data"] and _time.time() < _cache["expires"]:
        return _cache["data"]

    db = get_supabase()

    # Today's radar for sentiment
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    radar = maybe_one(db.table("radar_snapshots").select("market_sentiment, sentiment_summary").eq("date", today))
    sentiment = (radar.data or {}).get("market_sentiment", "neutral")
    sentiment_summary = (radar.data or {}).get("sentiment_summary")

    # Today's picks: featured + high relevance, published
    picks = db.table("content").select(
        "id, title, content_type, external_url, thumbnail_url, duration_seconds, "
        "quick_take, relevance_score, topics, themes, skill_level, published_at, curated_at, "
        "creators:creator_id(name, slug)"
    ).eq("is_published", True).order("relevance_score", desc=True).limit(12).execute()

    pick_cards = []
    for p in (picks.data or []):
        creator = p.pop("creators", None) or {}
        pick_cards.append(ContentCard(
            id=p["id"],
            title=p["title"],
            content_type=p["content_type"],
            external_url=p["external_url"],
            thumbnail_url=p.get("thumbnail_url"),
            duration_seconds=p.get("duration_seconds"),
            creator_name=creator.get("name"),
            creator_slug=creator.get("slug"),
            quick_take=p.get("quick_take"),
            relevance_score=p.get("relevance_score", 0),
            topics=p.get("topics", []),
            themes=p.get("themes", []),
            skill_level=p.get("skill_level", "intermediate"),
            published_at=p.get("published_at"),
            curated_at=p["curated_at"],
        ))

    # Continue learning (personalized if logged in)
    continue_learning = None
    if user:
        viewed = db.table("user_views").select("content_id").eq("user_id", user["id"]).order("created_at", desc=True).limit(5).execute()
        viewed_ids = [v["content_id"] for v in (viewed.data or [])]
        if viewed_ids:
            # Get topics from viewed content
            viewed_content = db.table("content").select("topics").in_("id", viewed_ids).execute()
            user_topics = set()
            for vc in (viewed_content.data or []):
                user_topics.update(vc.get("topics", []))

            if user_topics:
                # Find similar content not yet viewed
                recs = db.table("content").select(
                    "id, title, content_type, external_url, thumbnail_url, duration_seconds, "
                    "quick_take, relevance_score, topics, themes, skill_level, published_at, curated_at, "
                    "creators:creator_id(name, slug)"
                ).eq("is_published", True).overlaps("topics", list(user_topics)).limit(6).execute()

                continue_learning = []
                for r in (recs.data or []):
                    if r["id"] not in viewed_ids:
                        creator = r.pop("creators", None) or {}
                        continue_learning.append(ContentCard(
                            id=r["id"], title=r["title"], content_type=r["content_type"],
                            external_url=r["external_url"], thumbnail_url=r.get("thumbnail_url"),
                            duration_seconds=r.get("duration_seconds"),
                            creator_name=creator.get("name"), creator_slug=creator.get("slug"),
                            quick_take=r.get("quick_take"), relevance_score=r.get("relevance_score", 0),
                            topics=r.get("topics", []), themes=r.get("themes", []),
                            skill_level=r.get("skill_level", "intermediate"),
                            published_at=r.get("published_at"), curated_at=r["curated_at"],
                        ))

    # Active themes for theme section
    themes = db.table("themes").select("name, slug, status, escalation_score").in_(
        "status", ["active", "escalating"]
    ).order("escalation_score", desc=True).limit(8).execute()

    result = HomePageData(
        market_sentiment=sentiment,
        sentiment_summary=sentiment_summary,
        todays_picks=pick_cards,
        continue_learning=continue_learning,
        topics=TOPIC_GRID,
        themes=[{"name": t["name"], "slug": t["slug"], "status": t["status"], "score": t["escalation_score"]} for t in (themes.data or [])],
    )

    # Cache for 60 seconds
    if not user:
        _cache["data"] = result
        _cache["expires"] = _time.time() + 60

    return result
