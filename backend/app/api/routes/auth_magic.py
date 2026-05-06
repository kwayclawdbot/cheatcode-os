"""Magic-link claim — let SMS users create a web dashboard account.

Two endpoints:

  GET  /api/v1/auth/magic/{token}
       Validate token, return invite info (name, email, phone) or 4xx.

  POST /api/v1/auth/magic/{token}/claim    body: {password}
       Validate token, create (or update) Supabase Auth user with email +
       password, link auth.users.id → public.users.auth_user_id, mark the
       invite used, return ok. Frontend then calls supabase.auth
       .signInWithPassword(email, password) on the client to obtain a
       session and persist it.

Tokens originate from the SMS pipeline in `kai_agent/magic_invites.py` and
land in `public.kai_magic_invites`. Service-role only — RLS is enforced by
using the service-role Supabase client throughout.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.core.supabase import get_supabase, maybe_one

log = logging.getLogger(__name__)

router = APIRouter(prefix="/auth/magic", tags=["auth_magic"])


class MagicInviteInfo(BaseModel):
    valid: bool
    email: str
    phone: str
    name: str
    expires_at: str


class ClaimRequest(BaseModel):
    password: str = Field(..., min_length=8, max_length=128)


class ClaimResponse(BaseModel):
    ok: bool
    email: str
    auth_user_id: str
    user_id: int


def _fetch_invite(token: str) -> Optional[dict]:
    """Pull an invite by token. Returns None if not found, used, or expired."""
    db = get_supabase()
    row = maybe_one(
        db.table("kai_magic_invites")
        .select("token,user_id,email,phone,expires_at,used_at")
        .eq("token", token)
    ).data
    if not row:
        return None
    if row.get("used_at"):
        return None
    try:
        expires = datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00"))
    except Exception:
        return None
    if expires < datetime.now(timezone.utc):
        return None
    return row


@router.get("/{token}", response_model=MagicInviteInfo)
async def get_magic_invite(token: str):
    """Validate a magic token. Returns invite info for the claim form, or 410
    if the token is unknown / used / expired (the page should render a generic
    'this link is no longer valid' state, no leaking which case it was)."""
    invite = _fetch_invite(token)
    if not invite:
        raise HTTPException(status_code=410, detail="link_invalid")

    db = get_supabase()
    user_row = maybe_one(
        db.table("users").select("name,phone,email").eq("id", invite["user_id"])
    ).data or {}

    return MagicInviteInfo(
        valid=True,
        email=invite["email"],
        phone=invite["phone"],
        name=user_row.get("name") or "trader",
        expires_at=invite["expires_at"],
    )


@router.post("/{token}/claim", response_model=ClaimResponse)
async def claim_magic_invite(token: str, body: ClaimRequest, request: Request):
    """Claim flow:
      1. Validate token
      2. If an auth.users row already exists for the email → update its password
         (covers the case where this email was used in a prior signup attempt).
         Otherwise create a new auth.users row with email_confirm=True.
      3. Set public.users.auth_user_id = <new auth user id>
      4. Mark invite used (idempotent)

    The frontend should follow this with supabase.auth.signInWithPassword to
    actually obtain a session — the backend doesn't mint sessions itself.
    """
    invite = _fetch_invite(token)
    if not invite:
        raise HTTPException(status_code=410, detail="link_invalid")

    email = invite["email"]
    user_id = invite["user_id"]
    db = get_supabase()

    # Try to find an existing auth.users record by email so we can
    # transparently set the password without a "user already exists" error.
    auth_user_id: Optional[str] = None
    try:
        existing = db.auth.admin.list_users()
        # supabase-py returns either a list or an object with .users — handle both
        existing_users = getattr(existing, "users", None) or existing or []
        for u in existing_users:
            u_email = getattr(u, "email", None) or (u.get("email") if isinstance(u, dict) else None)
            if u_email and u_email.lower() == email.lower():
                auth_user_id = getattr(u, "id", None) or u.get("id")
                break
    except Exception as e:
        log.warning(f"list_users failed during claim: {e}")

    try:
        if auth_user_id:
            # Pre-existing auth user → update password so they can sign in
            db.auth.admin.update_user_by_id(
                auth_user_id,
                {"password": body.password, "email_confirm": True},
            )
            log.info(f"magic claim: reused existing auth user {auth_user_id} for {email}")
        else:
            created = db.auth.admin.create_user({
                "email": email,
                "password": body.password,
                "email_confirm": True,
            })
            new_user = getattr(created, "user", None) or created
            auth_user_id = getattr(new_user, "id", None) or new_user.get("id")
            log.info(f"magic claim: created auth user {auth_user_id} for {email}")
    except Exception as e:
        log.error(f"magic claim: auth user provisioning failed for {email}: {e}")
        raise HTTPException(status_code=500, detail="auth_provision_failed")

    if not auth_user_id:
        raise HTTPException(status_code=500, detail="auth_user_id_missing")

    # Link the SMS user record to the auth user
    try:
        db.table("users").update({
            "auth_user_id": auth_user_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", user_id).execute()
    except Exception as e:
        log.error(f"magic claim: failed to link users.auth_user_id for user {user_id}: {e}")
        # Don't fail the whole claim — the auth user exists, link is recoverable

    # Mark token used
    try:
        used_ip = request.client.host if request.client else None
        db.table("kai_magic_invites").update({
            "used_at": datetime.now(timezone.utc).isoformat(),
            "used_ip": used_ip,
        }).eq("token", token).execute()
    except Exception as e:
        log.warning(f"magic claim: mark_used failed for token={token[:8]}…: {e}")

    return ClaimResponse(
        ok=True,
        email=email,
        auth_user_id=str(auth_user_id),
        user_id=user_id,
    )
