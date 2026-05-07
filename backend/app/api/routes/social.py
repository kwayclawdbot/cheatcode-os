"""Social Feed API — posts, comments, likes, follows."""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel
from datetime import datetime, timezone
from app.core.supabase import get_supabase, maybe_one
from app.core.auth import require_user, get_current_user
from app.services.gamification import award_xp, check_and_advance_belt

router = APIRouter(prefix="/social", tags=["social"])


# ── Models ───────────────────────────────────────────────────────────────────

class PostCreate(BaseModel):
    post_type: str  # trade_alert, trade_idea, pl_share, market_take, question
    sentiment: str | None = None
    ticker: str | None = None
    direction: str | None = None   # long | short
    timeframe: str | None = None
    entry_price: str | None = None
    target_price: str | None = None
    stop_price: str | None = None
    thesis: str | None = None
    body: str | None = None
    image_url: str | None = None
    tags: list[str] = []


class CommentCreate(BaseModel):
    body: str
    parent_id: str | None = None


# ── Feed ─────────────────────────────────────────────────────────────────────

@router.get("/feed")
async def get_feed(
    tab: str = "discover",  # following, discover, trending, kai
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    hide_agents: bool = Query(False),
    # Feed filters
    belt: str | None = Query(None, description="Minimum belt rank filter"),
    min_wr: float | None = Query(None, description="Minimum win rate %"),
    min_kai_score: int | None = Query(None, description="Minimum Kai score"),
    asset_class: str | None = Query(None, description="Asset class filter"),
    post_type: str | None = Query(None, description="Filter by post type"),
    user: dict | None = Depends(get_current_user),
):
    db = get_supabase()
    offset = (page - 1) * per_page

    q = db.table("feed_posts").select(
        "*, profiles:user_id(display_name, handle, avatar_url, trading_style, xp, is_agent, belt, alert_win_rate)"
    )

    agent_ids_to_exclude: set[str] = set()
    if hide_agents:
        agent_rows = db.table("profiles").select("id").eq("is_agent", True).execute()
        agent_ids_to_exclude = {r["id"] for r in (agent_rows.data or [])}

    # Belt filter — get user IDs meeting minimum belt requirement
    BELT_ORDER = ['white', 'yellow', 'orange', 'green', 'blue', 'purple', 'brown', 'black']
    belt_user_ids: set[str] | None = None
    if belt and belt in BELT_ORDER:
        belt_idx = BELT_ORDER.index(belt)
        qualifying_belts = BELT_ORDER[belt_idx:]
        belt_rows = db.table("profiles").select("id").in_("belt", qualifying_belts).execute()
        belt_user_ids = {r["id"] for r in (belt_rows.data or [])}

    # Win rate filter
    wr_user_ids: set[str] | None = None
    if min_wr is not None:
        wr_rows = db.table("profiles").select("id").gte("alert_win_rate", min_wr).execute()
        wr_user_ids = {r["id"] for r in (wr_rows.data or [])}

    # Post type filter
    if post_type:
        q = q.eq("post_type", post_type)

    # Kai score filter
    if min_kai_score is not None:
        q = q.gte("kai_score", min_kai_score)

    if tab == "following" and user:
        follows = db.table("follows").select("following_id").eq("follower_id", user["id"]).execute()
        following_ids = [f["following_id"] for f in (follows.data or [])]
        if following_ids:
            q = q.in_("user_id", following_ids)
        else:
            return []
    elif tab == "trending":
        q = q.order("likes_count", desc=True)
    else:
        q = q.order("created_at", desc=True)

    if tab != "trending":
        q = q.order("created_at", desc=True)

    result = q.range(offset, offset + per_page - 1).execute()

    posts = []
    for p in (result.data or []):
        if agent_ids_to_exclude and p.get("user_id") in agent_ids_to_exclude:
            continue
        # Belt filter
        if belt_user_ids is not None and p.get("user_id") not in belt_user_ids:
            continue
        # WR filter
        if wr_user_ids is not None and p.get("user_id") not in wr_user_ids:
            continue
        profile = p.pop("profiles", None) or {}
        # Check if current user liked/bookmarked
        user_liked = False
        user_bookmarked = False
        if user:
            interactions = db.table("post_interactions").select("interaction_type").eq(
                "user_id", user["id"]
            ).eq("post_id", p["id"]).execute()
            for i in (interactions.data or []):
                if i["interaction_type"] == "like":
                    user_liked = True
                if i["interaction_type"] == "bookmark":
                    user_bookmarked = True

        posts.append({
            **p,
            "user": {
                "name": profile.get("display_name", "Trader"),
                "handle": profile.get("handle", ""),
                "avatar_url": profile.get("avatar_url"),
                "style": profile.get("trading_style", ""),
                "xp": profile.get("xp", 0),
                "belt": profile.get("belt", "white"),
                "win_rate": profile.get("alert_win_rate", 0),
                "is_agent": bool(profile.get("is_agent", False)),
            },
            "user_liked": user_liked,
            "user_bookmarked": user_bookmarked,
        })

    return posts


@router.post("/posts")
async def create_post(post: PostCreate, background: BackgroundTasks, user: dict = Depends(require_user)):
    db = get_supabase()

    is_trade_alert = post.post_type in ("trade_alert", "trade_idea")
    tracking_active = is_trade_alert and bool(post.entry_price and post.target_price and post.stop_price)

    result = db.table("feed_posts").insert({
        "user_id": user["id"],
        "post_type": post.post_type,
        "sentiment": post.sentiment,
        "ticker": post.ticker.upper() if post.ticker else None,
        "direction": (post.direction or "long").lower() if is_trade_alert else None,
        "timeframe": post.timeframe,
        "entry_price": post.entry_price,
        "target_price": post.target_price,
        "stop_price": post.stop_price,
        "thesis": post.thesis,
        "body": post.body,
        "image_url": post.image_url,
        "tags": post.tags,
        "tracking_active": tracking_active,
    }).execute()

    created = result.data[0] if result.data else {}
    post_id = created.get("id")

    # Extract + validate $cashtags from thesis + body text.
    from app.services.trending import log_post_mentions
    mentioned_tickers: list[str] = []
    if post_id:
        combined_text = " ".join(filter(None, [post.thesis, post.body]))
        mentioned_tickers = log_post_mentions(
            combined_text, post_id=post_id, user_id=user["id"]
        )
        if post.ticker and post.ticker.upper() not in mentioned_tickers:
            extra = log_post_mentions(
                f"${post.ticker}", post_id=post_id, user_id=user["id"]
            )
            mentioned_tickers += extra

    # Update post count and last_alert_at
    updates: dict = {
        "post_count": db.table("feed_posts").select("id", count="exact").eq("user_id", user["id"]).execute().count or 0,
    }
    if is_trade_alert:
        updates["last_alert_at"] = datetime.now(timezone.utc).isoformat()
        updates["alert_count"] = (db.table("feed_posts").select("id", count="exact")
                                   .eq("user_id", user["id"])
                                   .in_("post_type", ["trade_alert", "trade_idea"])
                                   .execute().count or 0)

    db.table("profiles").update(updates).eq("id", user["id"]).execute()

    award_xp(user["id"], "post_create", {"post_type": post.post_type})
    if is_trade_alert:
        award_xp(user["id"], "alert_posted", {"ticker": post.ticker})

    # Background: score this alert with Kai
    if is_trade_alert and post_id and post.ticker:
        background.add_task(
            _score_alert_background,
            post_id=post_id,
            ticker=post.ticker,
            entry_price=post.entry_price,
            target_price=post.target_price,
            stop_price=post.stop_price,
            timeframe=post.timeframe,
            thesis=post.thesis,
            direction=post.direction or "long",
        )

    if created:
        created["validated_cashtags"] = mentioned_tickers
    return created


async def _score_alert_background(post_id: str, ticker: str, **kwargs):
    """Background task: score alert and write back to DB."""
    try:
        from app.services.kai_scorer import score_and_save
        await score_and_save(post_id=post_id, ticker=ticker, **kwargs)
    except Exception as e:
        import logging
        logging.getLogger("social").error("Background scoring failed for %s: %s", post_id, e)


@router.get("/posts/{post_id}")
async def get_post(post_id: str, user: dict | None = Depends(get_current_user)):
    db = get_supabase()
    p = maybe_one(db.table("feed_posts").select(
        "*, profiles:user_id(display_name, handle, avatar_url, trading_style, xp, belt, alert_win_rate)"
    ).eq("id", post_id))
    if not p.data:
        raise HTTPException(404, "Post not found")
    return p.data


# ── Preview Score (for composer Kai score preview) ────────────────────────

class PreviewScoreRequest(BaseModel):
    ticker: str
    direction: str | None = "long"
    entry_price: str | None = None
    target_price: str | None = None
    stop_price: str | None = None
    thesis: str | None = None


@router.post("/preview-score")
async def preview_score(req: PreviewScoreRequest, user: dict = Depends(require_user)):
    """Preview Kai score for a trade alert before posting."""
    from app.services.kai_scorer import score_alert
    result = await score_alert(
        ticker=req.ticker,
        entry_price=req.entry_price,
        target_price=req.target_price,
        stop_price=req.stop_price,
        timeframe=None,
        thesis=req.thesis,
        direction=req.direction,
    )
    return {"score": result["score"], "emoji": result["emoji"], "label": result["label"]}


@router.delete("/posts/{post_id}")
async def delete_post(post_id: str, user: dict = Depends(require_user)):
    db = get_supabase()
    db.table("feed_posts").delete().eq("id", post_id).eq("user_id", user["id"]).execute()
    return {"ok": True}


# ── Interactions ─────────────────────────────────────────────────────────────

@router.post("/posts/{post_id}/like")
async def like_post(post_id: str, user: dict = Depends(require_user)):
    db = get_supabase()
    db.table("post_interactions").upsert({
        "user_id": user["id"], "post_id": post_id, "interaction_type": "like",
    }, on_conflict="user_id,post_id,interaction_type").execute()
    return {"ok": True}


@router.delete("/posts/{post_id}/like")
async def unlike_post(post_id: str, user: dict = Depends(require_user)):
    db = get_supabase()
    db.table("post_interactions").delete().eq("user_id", user["id"]).eq("post_id", post_id).eq("interaction_type", "like").execute()
    return {"ok": True}


@router.post("/posts/{post_id}/bookmark")
async def bookmark_post(post_id: str, user: dict = Depends(require_user)):
    db = get_supabase()
    db.table("post_interactions").upsert({
        "user_id": user["id"], "post_id": post_id, "interaction_type": "bookmark",
    }, on_conflict="user_id,post_id,interaction_type").execute()
    return {"ok": True}


@router.post("/posts/{post_id}/repost")
async def repost(post_id: str, user: dict = Depends(require_user)):
    db = get_supabase()
    db.table("post_interactions").upsert({
        "user_id": user["id"], "post_id": post_id, "interaction_type": "repost",
    }, on_conflict="user_id,post_id,interaction_type").execute()
    db.table("feed_posts").update({
        "reposts_count": db.table("post_interactions").select("id", count="exact").eq("post_id", post_id).eq("interaction_type", "repost").execute().count or 0,
    }).eq("id", post_id).execute()
    return {"ok": True}


# ── Comments ─────────────────────────────────────────────────────────────────

@router.get("/posts/{post_id}/comments")
async def get_comments(post_id: str):
    db = get_supabase()
    result = db.table("post_comments").select(
        "*, profiles:user_id(display_name, handle, avatar_url, xp, is_agent)"
    ).eq("post_id", post_id).order("created_at").execute()
    return result.data or []


@router.post("/posts/{post_id}/comments")
async def create_comment(
    post_id: str,
    comment: CommentCreate,
    background: BackgroundTasks,
    user: dict = Depends(require_user),
):
    db = get_supabase()
    result = db.table("post_comments").insert({
        "post_id": post_id,
        "user_id": user["id"],
        "parent_id": comment.parent_id,
        "body": comment.body,
    }).execute()

    award_xp(user["id"], "comment_create")

    # Detect @Kai mention → trigger Kai reply in background
    body_lower = comment.body.lower()
    if "@kai" in body_lower:
        background.add_task(
            _trigger_kai_comment_reply,
            post_id=post_id,
            comment_body=comment.body,
            commenter_handle=user.get("handle", ""),
        )

    return result.data[0] if result.data else {}


async def _trigger_kai_comment_reply(post_id: str, comment_body: str, commenter_handle: str):
    """Background: Kai replies when @Kai is mentioned in a comment."""
    import logging
    log = logging.getLogger("kai_mention")
    db = get_supabase()
    try:
        # Get the original post for context
        post = maybe_one(db.table("feed_posts").select(
            "ticker,post_type,entry_price,target_price,stop_price,thesis,body,kai_score,kai_rationale,direction"
        ).eq("id", post_id))

        if not post.data:
            return

        p = post.data
        ticker = p.get("ticker", "")
        post_context = f"Post about ${ticker}: "
        if p.get("thesis"):
            post_context += p["thesis"]
        elif p.get("body"):
            post_context += p["body"]
        if p.get("kai_score"):
            post_context += f" [Kai score: {p['kai_score']}/100]"
        if p.get("kai_rationale"):
            post_context += f" [Kai take: {p['kai_rationale']}]"

        # Get Kai profile ID
        kai_profile = db.table("profiles").select("id").eq("handle", "kai").limit(1).execute()
        if not kai_profile.data:
            kai_profile = db.table("profiles").select("id").eq("tier", "admin").limit(1).execute()
        if not kai_profile.data:
            log.warning("No Kai profile found for @mention reply")
            return
        kai_id = kai_profile.data[0]["id"]

        # Generate response via kai_chat service
        from app.services.kai_chat import chat
        question = comment_body.replace("@Kai", "").replace("@kai", "").strip()
        if not question:
            question = f"What do you think about this {ticker} trade setup?"

        full_prompt = f"Context: {post_context}\n\nUser @{commenter_handle} asks: {question}"

        result = await chat(
            user_id=kai_id,
            message=full_prompt,
            conversation_id=None,
            user_tier="elite",
        )

        kai_reply = result.get("message", {}).get("content", "")
        if kai_reply:
            db.table("post_comments").insert({
                "post_id": post_id,
                "user_id": kai_id,
                "body": kai_reply,
                "is_kai_reply": True,
            }).execute()
            log.info("Kai replied to @mention on post %s", post_id)

    except Exception as e:
        log.error("Kai mention reply failed for post %s: %s", post_id, e)


# ── Follows ──────────────────────────────────────────────────────────────────

@router.post("/follow/{target_id}")
async def follow_user(target_id: str, user: dict = Depends(require_user)):
    if target_id == user["id"]:
        raise HTTPException(400, "Can't follow yourself")
    db = get_supabase()
    db.table("follows").upsert({
        "follower_id": user["id"], "following_id": target_id,
    }, on_conflict="follower_id,following_id").execute()
    award_xp(user["id"], "follow")
    return {"ok": True}


@router.delete("/follow/{target_id}")
async def unfollow_user(target_id: str, user: dict = Depends(require_user)):
    db = get_supabase()
    db.table("follows").delete().eq("follower_id", user["id"]).eq("following_id", target_id).execute()
    return {"ok": True}


@router.get("/followers/{user_id}")
async def get_followers(user_id: str):
    db = get_supabase()
    result = db.table("follows").select(
        "profiles:follower_id(id, display_name, handle, avatar_url, xp)"
    ).eq("following_id", user_id).execute()
    return [f.get("profiles") for f in (result.data or []) if f.get("profiles")]


@router.get("/following/{user_id}")
async def get_following(user_id: str):
    db = get_supabase()
    result = db.table("follows").select(
        "profiles:following_id(id, display_name, handle, avatar_url, xp)"
    ).eq("follower_id", user_id).execute()
    return [f.get("profiles") for f in (result.data or []) if f.get("profiles")]
