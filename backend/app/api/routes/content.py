"""Content API — browse, search, detail pages."""

from fastapi import APIRouter, Depends, Query, HTTPException
from app.core.supabase import get_supabase
from app.core.auth import get_current_user, require_user
from app.models.content import ContentCard, ContentDetail, CreatorProfile
from app.services.curation import generate_embedding

router = APIRouter(prefix="/content", tags=["content"])


def _row_to_card(row: dict) -> ContentCard:
    creator = row.pop("creators", None) or {}
    return ContentCard(
        id=row["id"], title=row["title"], content_type=row["content_type"],
        external_url=row["external_url"], thumbnail_url=row.get("thumbnail_url"),
        duration_seconds=row.get("duration_seconds"),
        creator_name=creator.get("name"), creator_slug=creator.get("slug"),
        quick_take=row.get("quick_take"), relevance_score=row.get("relevance_score", 0),
        topics=row.get("topics", []), themes=row.get("themes", []),
        skill_level=row.get("skill_level", "intermediate"),
        published_at=row.get("published_at"), curated_at=row["curated_at"],
    )


CARD_SELECT = (
    "id, title, content_type, external_url, thumbnail_url, duration_seconds, "
    "quick_take, relevance_score, topics, themes, skill_level, published_at, curated_at, "
    "creators:creator_id(name, slug)"
)


@router.get("", response_model=list[ContentCard])
async def list_content(
    content_type: str | None = None,
    topic: str | None = None,
    theme: str | None = None,
    skill_level: str | None = None,
    creator_slug: str | None = None,
    sort: str = "recent",  # recent | relevance | popular
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
):
    db = get_supabase()
    q = db.table("content").select(CARD_SELECT).eq("is_published", True)

    if content_type:
        q = q.eq("content_type", content_type)
    if topic:
        q = q.contains("topics", [topic])
    if theme:
        q = q.contains("themes", [theme])
    if skill_level:
        q = q.eq("skill_level", skill_level)
    if creator_slug:
        # Resolve creator
        creator = db.table("creators").select("id").eq("slug", creator_slug).maybe_single().execute()
        if creator.data:
            q = q.eq("creator_id", creator.data["id"])

    if sort == "relevance":
        q = q.order("relevance_score", desc=True)
    elif sort == "popular":
        q = q.order("engagement_score", desc=True)
    else:
        q = q.order("curated_at", desc=True)

    offset = (page - 1) * per_page
    q = q.range(offset, offset + per_page - 1)
    result = q.execute()

    return [_row_to_card(r) for r in (result.data or [])]


@router.get("/search", response_model=list[ContentCard])
async def search_content(q: str = Query(..., min_length=2)):
    """Semantic search across curated content."""
    db = get_supabase()
    embedding = await generate_embedding(q)

    results = db.rpc("match_content", {
        "query_embedding": embedding,
        "match_threshold": 0.25,
        "match_count": 20,
    }).execute()

    return [ContentCard(
        id=r["id"], title=r["title"], content_type=r["content_type"],
        external_url=r["external_url"], thumbnail_url=r.get("thumbnail_url"),
        duration_seconds=r.get("duration_seconds"),
        creator_name=r.get("creator_name"), creator_slug=r.get("creator_slug"),
        quick_take=r.get("quick_take"), relevance_score=r.get("similarity", 0),
        topics=r.get("topics", []), themes=r.get("themes", []),
        skill_level=r.get("skill_level", "intermediate"),
        published_at=r.get("published_at"), curated_at=r.get("curated_at"),
    ) for r in (results.data or [])]


@router.get("/{content_id}", response_model=ContentDetail)
async def get_content_detail(content_id: str, user: dict | None = Depends(get_current_user)):
    db = get_supabase()

    row = db.table("content").select(
        "*, creators:creator_id(name, slug)"
    ).eq("id", content_id).eq("is_published", True).maybe_single().execute()

    if not row.data:
        raise HTTPException(status_code=404, detail="Content not found")

    r = row.data
    creator = r.pop("creators", None) or {}

    # Get tickers
    tickers = db.table("content_tickers").select("ticker, mention_context, sentiment, is_primary").eq("content_id", content_id).execute()

    # Enrich tickers with convergence scores
    enriched_tickers = []
    for t in (tickers.data or []):
        ticker_data = db.table("tickers").select("convergence_score, direction").eq("symbol", t["ticker"]).maybe_single().execute()
        td = ticker_data.data or {}
        enriched_tickers.append({
            **t,
            "convergence_score": td.get("convergence_score"),
            "convergence_direction": td.get("direction"),
        })

    # Get related content (same topics)
    related = db.table("content").select(CARD_SELECT).eq("is_published", True).neq(
        "id", content_id
    ).overlaps("topics", r.get("topics", [])).order("relevance_score", desc=True).limit(4).execute()

    related_cards = [_row_to_card(rel) for rel in (related.data or [])]

    # Track view if logged in
    if user:
        db.table("user_views").insert({
            "user_id": user["id"],
            "content_id": content_id,
        }).execute()

    # Transcript only for pro+ users
    transcript = None
    if user and user.get("tier") in ("pro", "elite", "admin"):
        transcript = r.get("transcript")

    return ContentDetail(
        id=r["id"], title=r["title"], content_type=r["content_type"],
        external_url=r["external_url"], thumbnail_url=r.get("thumbnail_url"),
        duration_seconds=r.get("duration_seconds"),
        creator_name=creator.get("name"), creator_slug=creator.get("slug"),
        quick_take=r.get("quick_take"), relevance_score=r.get("relevance_score", 0),
        topics=r.get("topics", []), themes=r.get("themes", []),
        skill_level=r.get("skill_level", "intermediate"),
        published_at=r.get("published_at"), curated_at=r["curated_at"],
        description=r.get("description"),
        key_insights=r.get("key_insights"),
        timestamps=r.get("timestamps"),
        tickers=enriched_tickers,
        related=related_cards,
        transcript=transcript,
    )


@router.get("/by-ticker/{symbol}", response_model=list[ContentCard])
async def content_by_ticker(symbol: str, page: int = Query(1, ge=1)):
    """Get content mentioning a specific ticker."""
    db = get_supabase()
    mentions = db.table("content_tickers").select("content_id").eq("ticker", symbol.upper()).execute()
    content_ids = [m["content_id"] for m in (mentions.data or [])]
    if not content_ids:
        return []

    offset = (page - 1) * 20
    results = db.table("content").select(CARD_SELECT).in_("id", content_ids).eq(
        "is_published", True
    ).order("curated_at", desc=True).range(offset, offset + 19).execute()

    return [_row_to_card(r) for r in (results.data or [])]


# ── Creators ─────────────────────────────────────────────────────────────────

@router.get("/creators", response_model=list[CreatorProfile])
async def list_creators():
    db = get_supabase()
    creators = db.table("creators").select("*").eq("is_active", True).order("quality_score", desc=True).execute()

    result = []
    for c in (creators.data or []):
        count = db.table("content").select("id", count="exact").eq("creator_id", c["id"]).eq("is_published", True).execute()
        result.append(CreatorProfile(
            id=c["id"], name=c["name"], slug=c["slug"], platform=c["platform"],
            avatar_url=c.get("avatar_url"), description=c.get("description"),
            quality_score=c["quality_score"], tags=c.get("tags", []),
            content_count=count.count or 0,
        ))
    return result


@router.get("/creators/{slug}", response_model=CreatorProfile)
async def get_creator(slug: str):
    db = get_supabase()
    c = db.table("creators").select("*").eq("slug", slug).maybe_single().execute()
    if not c.data:
        raise HTTPException(status_code=404, detail="Creator not found")
    count = db.table("content").select("id", count="exact").eq("creator_id", c.data["id"]).eq("is_published", True).execute()
    return CreatorProfile(
        id=c.data["id"], name=c.data["name"], slug=c.data["slug"], platform=c.data["platform"],
        avatar_url=c.data.get("avatar_url"), description=c.data.get("description"),
        quality_score=c.data["quality_score"], tags=c.data.get("tags", []),
        content_count=count.count or 0,
    )


# ── Bookmarks ────────────────────────────────────────────────────────────────

@router.post("/{content_id}/bookmark")
async def bookmark_content(content_id: str, user: dict = Depends(require_user)):
    db = get_supabase()
    db.table("user_bookmarks").upsert({
        "user_id": user["id"], "content_id": content_id,
    }, on_conflict="user_id,content_id").execute()
    return {"ok": True}


@router.delete("/{content_id}/bookmark")
async def remove_bookmark(content_id: str, user: dict = Depends(require_user)):
    db = get_supabase()
    db.table("user_bookmarks").delete().eq("user_id", user["id"]).eq("content_id", content_id).execute()
    return {"ok": True}


@router.get("/bookmarks", response_model=list[ContentCard])
async def get_bookmarks(user: dict = Depends(require_user)):
    db = get_supabase()
    bookmarks = db.table("user_bookmarks").select("content_id").eq("user_id", user["id"]).order("created_at", desc=True).execute()
    ids = [b["content_id"] for b in (bookmarks.data or [])]
    if not ids:
        return []
    results = db.table("content").select(CARD_SELECT).in_("id", ids).eq("is_published", True).execute()
    return [_row_to_card(r) for r in (results.data or [])]
