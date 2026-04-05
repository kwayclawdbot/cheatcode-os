"""Kai Chat API — conversational AI analyst."""

from fastapi import APIRouter, Depends
from app.core.auth import get_current_user, require_user
from app.core.supabase import get_supabase, maybe_one
from app.models.content import KaiChatRequest, KaiChatResponse, KaiMessage
from app.services.kai_chat import chat

router = APIRouter(prefix="/kai", tags=["kai"])


@router.post("/chat", response_model=KaiChatResponse)
async def kai_chat(req: KaiChatRequest, user: dict = Depends(require_user)):
    result = await chat(
        user_id=user["id"],
        message=req.message,
        conversation_id=req.conversation_id,
        user_tier=user["tier"],
    )
    return KaiChatResponse(
        conversation_id=result["conversation_id"],
        message=KaiMessage(**result["message"]),
        remaining_messages=result.get("remaining_messages"),
    )


@router.get("/conversations")
async def list_conversations(user: dict = Depends(require_user)):
    db = get_supabase()
    result = db.table("kai_conversations").select(
        "id, title, message_count, created_at, updated_at"
    ).eq("user_id", user["id"]).order("updated_at", desc=True).limit(20).execute()
    return result.data or []


@router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(conversation_id: str, user: dict = Depends(require_user)):
    db = get_supabase()
    # Verify ownership
    conv = maybe_one(db.table("kai_conversations").select("id").eq("id", conversation_id).eq("user_id", user["id"]))
    if not conv.data:
        return []
    messages = db.table("kai_messages").select(
        "id, role, content, sources, created_at"
    ).eq("conversation_id", conversation_id).order("created_at").execute()
    return messages.data or []


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, user: dict = Depends(require_user)):
    db = get_supabase()
    db.table("kai_conversations").delete().eq("id", conversation_id).eq("user_id", user["id"]).execute()
    return {"ok": True}
