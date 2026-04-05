"""Social Feed API — posts, comments, likes, follows."""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime, timezone
from app.core.supabase import get_supabase, maybe_one
from app.core.auth import require_user, get_current_user
from app.services.gamification import award_xp

router = APIRouter(prefix="/social", tags=["social"])


# ── Models ───────────────────────────────────────────────────────────────────

class PostCreate(BaseModel):
    post_type: str  # trade_idea, pl_share, market_take, chart_post
    sentiment: str | None = None
    ticker: str | None = None
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
    tab: str = "discover",  # following, discover, trending, live
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    user: dict | None = Depends(get_current_user),
):
    db = get_supabase()
    offset = (page - 1) * per_page

    q = db.table("feed_posts").select(
        "*, profiles:user_id(display_name, handle, avatar_url, trading_style, xp)"
    )

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
            },
            "user_liked": user_liked,
            "user_bookmarked": user_bookmarked,
        })

    return posts


@router.post("/posts")
async def create_post(post: PostCreate, user: dict = Depends(require_user)):
    db = get_supabase()

    result = db.table("feed_posts").insert({
        "user_id": user["id"],
        "post_type": post.post_type,
        "sentiment": post.sentiment,
        "ticker": post.ticker,
        "timeframe": post.timeframe,
        "entry_price": post.entry_price,
        "target_price": post.target_price,
        "stop_price": post.stop_price,
        "thesis": post.thesis,
        "body": post.body,
        "image_url": post.image_url,
        "tags": post.tags,
    }).execute()

    # Update post count
    db.table("profiles").update({
        "post_count": db.table("feed_posts").select("id", count="exact").eq("user_id", user["id"]).execute().count or 0,
    }).eq("id", user["id"]).execute()

    award_xp(user["id"], "post_create", {"post_type": post.post_type})

    return result.data[0] if result.data else {}


@router.get("/posts/{post_id}")
async def get_post(post_id: str, user: dict | None = Depends(get_current_user)):
    db = get_supabase()
    p = maybe_one(db.table("feed_posts").select(
        "*, profiles:user_id(display_name, handle, avatar_url, trading_style, xp)"
    ).eq("id", post_id))
    if not p.data:
        raise HTTPException(404, "Post not found")
    return p.data


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
        "*, profiles:user_id(display_name, handle, avatar_url, xp)"
    ).eq("post_id", post_id).order("created_at").execute()
    return result.data or []


@router.post("/posts/{post_id}/comments")
async def create_comment(post_id: str, comment: CommentCreate, user: dict = Depends(require_user)):
    db = get_supabase()
    result = db.table("post_comments").insert({
        "post_id": post_id,
        "user_id": user["id"],
        "parent_id": comment.parent_id,
        "body": comment.body,
    }).execute()

    award_xp(user["id"], "comment_create")
    return result.data[0] if result.data else {}


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
