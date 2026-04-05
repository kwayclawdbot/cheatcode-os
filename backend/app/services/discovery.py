"""Creator Discovery — find and auto-add top trading YouTube channels.

Two modes:
1. Seed mode: bulk-add known channels from curated list
2. Discovery mode: search YouTube for top finance channels and auto-add
"""

import logging
import re
from datetime import datetime

import httpx
from app.core.config import get_settings
from app.core.supabase import get_supabase, maybe_one

log = logging.getLogger("discovery")


# Top trading/finance YouTube channels to seed (curated list)
SEED_CHANNELS = [
    # Already in DB
    # {"name": "Mark Minervini", "handle": "markminervini", "tags": ["technical_analysis", "swing_trading"]},
    # {"name": "Earn Your Leisure (Market Mondays)", "handle": "earnyourleisure", "tags": ["macro", "wealth_building"]},
    # etc.

    # New channels to add
    {"name": "Graham Stephan", "handle": "GrahamStephan", "tags": ["investing", "personal_finance", "real_estate"], "quality": 0.80},
    {"name": "Andrei Jikh", "handle": "AndreiJikh", "tags": ["investing", "crypto", "personal_finance"], "quality": 0.75},
    {"name": "Meet Kevin", "handle": "MeetKevin", "tags": ["macro", "stocks", "real_estate"], "quality": 0.80},
    {"name": "Tom Nash", "handle": "TomNashFinance", "tags": ["fundamentals", "growth", "tech_stocks"], "quality": 0.80},
    {"name": "Financial Education", "handle": "FinancialEducation2", "tags": ["stocks", "fundamentals", "education"], "quality": 0.75},
    {"name": "Trader Mayne", "handle": "TraderMayne", "tags": ["day_trading", "technical_analysis", "options"], "quality": 0.80},
    {"name": "InTheMoney", "handle": "InTheMoney", "tags": ["options", "education", "strategies"], "quality": 0.85},
    {"name": "Trey's Trades", "handle": "TreysTrades", "tags": ["stocks", "momentum", "retail"], "quality": 0.70},
    {"name": "Patrick Boyle", "handle": "PBoyleFinance", "tags": ["macro", "quant", "hedge_funds"], "quality": 0.90},
    {"name": "Corey's Trading", "handle": "CoreysTrading", "tags": ["technical_analysis", "swing_trading"], "quality": 0.75},
    {"name": "ClayTrader", "handle": "ClayTrader", "tags": ["day_trading", "education", "technical_analysis"], "quality": 0.75},
    {"name": "The Plain Bagel", "handle": "ThePlainBagel", "tags": ["fundamentals", "education", "value_investing"], "quality": 0.85},
    {"name": "Benjamin Cowen", "handle": "intothecryptoverse", "tags": ["crypto", "technical_analysis", "macro"], "quality": 0.85},
    {"name": "Coin Bureau", "handle": "CoinBureau", "tags": ["crypto", "education", "research"], "quality": 0.85},
    {"name": "Ross Cameron", "handle": "WarriorTradingRoss", "tags": ["day_trading", "small_caps", "momentum"], "quality": 0.80},
    {"name": "Larry Williams", "handle": "LarryWilliamsTrader", "tags": ["technical_analysis", "commodities", "futures"], "quality": 0.90},
    {"name": "Umar Ashraf", "handle": "UmarAshraf", "tags": ["day_trading", "momentum", "options"], "quality": 0.80},
    {"name": "Steven Dux", "handle": "StevenDux", "tags": ["penny_stocks", "short_selling", "day_trading"], "quality": 0.75},
    {"name": "The Swedish Investor", "handle": "TheSwedishInvestor", "tags": ["value_investing", "book_summaries", "education"], "quality": 0.85},
    {"name": "Minority Mindset", "handle": "MinorityMindset", "tags": ["personal_finance", "investing", "education"], "quality": 0.80},
]


def _slugify(name: str) -> str:
    slug = re.sub(r'[^\w\s-]', '', name.strip().lower())
    return re.sub(r'[-\s]+', '-', slug)[:60]


async def resolve_channel_id(handle: str) -> str | None:
    """Resolve a YouTube handle to a channel ID."""
    s = get_settings()
    if not s.youtube_api_key:
        return None

    async with httpx.AsyncClient() as client:
        # Try forHandle first
        resp = await client.get(
            "https://www.googleapis.com/youtube/v3/channels",
            params={"part": "id,snippet", "forHandle": handle, "key": s.youtube_api_key},
            timeout=10,
        )
        data = resp.json()
        if data.get("items"):
            return data["items"][0]["id"]

        # Fallback: search
        resp2 = await client.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={"part": "snippet", "q": handle, "type": "channel", "maxResults": 1, "key": s.youtube_api_key},
            timeout=10,
        )
        data2 = resp2.json()
        if data2.get("items"):
            return data2["items"][0]["snippet"]["channelId"]

    return None


async def add_creator(name: str, handle: str, tags: list[str], quality: float = 0.75) -> dict | None:
    """Add a new creator to the DB if not already present. Auto-resolves channel ID."""
    db = get_supabase()
    slug = _slugify(name)

    # Check if already exists
    existing = maybe_one(db.table("creators").select("id").eq("slug", slug))
    if existing.data:
        log.info("Creator already exists: %s", name)
        return None

    # Resolve YouTube channel ID + pull profile data
    s = get_settings()
    channel_id = await resolve_channel_id(handle)
    if not channel_id:
        log.warning("Could not resolve channel for %s (@%s)", name, handle)
        return None

    # Fetch avatar, description, banner from YouTube
    avatar_url = None
    yt_description = ""
    banner_url = None
    yt_handle = ""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/youtube/v3/channels",
                params={"part": "snippet,brandingSettings", "id": channel_id, "key": s.youtube_api_key},
                timeout=10,
            )
            data = resp.json()
            if data.get("items"):
                snippet = data["items"][0].get("snippet", {})
                avatar_url = snippet.get("thumbnails", {}).get("high", {}).get("url")
                yt_description = snippet.get("description", "")[:500]
                yt_handle = snippet.get("customUrl", "")
                banner_url = data["items"][0].get("brandingSettings", {}).get("image", {}).get("bannerExternalUrl")
    except Exception:
        pass

    record = {
        "name": name,
        "slug": slug,
        "platform": "youtube",
        "youtube_channel_id": channel_id,
        "quality_score": quality,
        "tags": tags,
        "avatar_url": avatar_url,
        "description": yt_description or f"Finance/trading content creator. YouTube: @{handle}",
        "is_active": True,
        "metadata": {"banner_url": banner_url, "youtube_handle": yt_handle} if banner_url else {},
    }

    result = db.table("creators").insert(record).execute()
    if result.data:
        log.info("Added creator: %s (%s) → channel %s", name, slug, channel_id)
        return result.data[0]
    return None


async def seed_creators() -> list[dict]:
    """Seed all channels from the curated list."""
    added = []
    for ch in SEED_CHANNELS:
        try:
            result = await add_creator(
                name=ch["name"],
                handle=ch["handle"],
                tags=ch.get("tags", []),
                quality=ch.get("quality", 0.75),
            )
            if result:
                added.append(result)
        except Exception as e:
            log.error("Failed to add %s: %s", ch["name"], e)

    log.info("Seeded %d new creators", len(added))
    return added


async def discover_channels(query: str = "trading education", max_results: int = 10) -> list[dict]:
    """Search YouTube for new finance channels and auto-add them."""
    s = get_settings()
    if not s.youtube_api_key:
        return []

    db = get_supabase()
    existing_ids = set()
    creators = db.table("creators").select("youtube_channel_id").execute()
    for c in (creators.data or []):
        if c.get("youtube_channel_id"):
            existing_ids.add(c["youtube_channel_id"])

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={
                "part": "snippet",
                "q": query,
                "type": "channel",
                "maxResults": max_results,
                "key": s.youtube_api_key,
            },
            timeout=10,
        )
        data = resp.json()

    added = []
    for item in data.get("items", []):
        channel_id = item["snippet"]["channelId"]
        if channel_id in existing_ids:
            continue

        name = item["snippet"]["title"]
        result = await add_creator(
            name=name,
            handle=name.replace(" ", ""),
            tags=["trading", "finance"],
            quality=0.70,
        )
        if result:
            added.append(result)

    log.info("Discovered %d new channels for query '%s'", len(added), query)
    return added
