"""Event tracking API — logs all user behavior."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.supabase import get_supabase
from app.core.auth import require_user
from app.services.gamification import award_xp

router = APIRouter(prefix="/events", tags=["events"])


class EventBatch(BaseModel):
    events: list[dict]  # [{event_type, payload, timestamp?}]


@router.post("/track")
async def track_events(batch: EventBatch, user: dict = Depends(require_user)):
    """Batch-ingest user events. Called by frontend every ~10 seconds."""
    db = get_supabase()
    user_id = user["id"]

    xp_map = {
        "video_view": "video_view",
        "video_complete": "video_complete",
        "ticker_lookup": "ticker_lookup",
        "search": None,
        "page_visit": None,
        "bookmark": "bookmark",
    }

    total_xp = 0
    rows = []
    for event in batch.events:
        rows.append({
            "user_id": user_id,
            "event_type": event.get("event_type", "unknown"),
            "payload": event.get("payload", {}),
        })

        # Award XP for trackable actions
        xp_action = xp_map.get(event.get("event_type"))
        if xp_action:
            total_xp += award_xp(user_id, xp_action, event.get("payload"))

    if rows:
        db.table("user_events").insert(rows).execute()

    return {"tracked": len(rows), "xp_earned": total_xp}


@router.get("/history")
async def get_event_history(
    event_type: str | None = None,
    limit: int = 50,
    user: dict = Depends(require_user),
):
    db = get_supabase()
    q = db.table("user_events").select("*").eq("user_id", user["id"]).order("created_at", desc=True).limit(limit)
    if event_type:
        q = q.eq("event_type", event_type)
    result = q.execute()
    return result.data or []
