"""Auth middleware — validates Supabase JWT and resolves user tier."""

from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
from app.core.config import get_settings
from app.core.supabase import get_supabase

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict | None:
    """Returns user dict with id, email, tier or None for anonymous."""
    if not credentials:
        return None
    token = credentials.credentials
    s = get_settings()
    # Verify JWT via Supabase auth
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{s.supabase_url}/auth/v1/user",
                headers={"Authorization": f"Bearer {token}", "apikey": s.supabase_anon_key},
            )
            if resp.status_code != 200:
                return None
            user_data = resp.json()
    except Exception:
        return None

    user_id = user_data.get("id")
    if not user_id:
        return None

    # Fetch tier from profiles table
    db = get_supabase()
    result = db.table("profiles").select("tier, display_name, avatar_url").eq("id", user_id).maybe_single().execute()
    profile = result.data or {}

    return {
        "id": user_id,
        "email": user_data.get("email"),
        "tier": profile.get("tier", "free"),
        "display_name": profile.get("display_name"),
        "avatar_url": profile.get("avatar_url"),
    }


async def require_user(user: dict | None = Depends(get_current_user)) -> dict:
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


async def require_pro(user: dict = Depends(require_user)) -> dict:
    if user["tier"] not in ("pro", "elite", "admin"):
        raise HTTPException(status_code=403, detail="Pro subscription required")
    return user


async def require_elite(user: dict = Depends(require_user)) -> dict:
    if user["tier"] not in ("elite", "admin"):
        raise HTTPException(status_code=403, detail="Elite subscription required")
    return user
