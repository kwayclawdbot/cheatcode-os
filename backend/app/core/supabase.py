from dataclasses import dataclass
from supabase import create_client, Client
from app.core.config import get_settings

_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        s = get_settings()
        _client = create_client(s.supabase_url, s.supabase_service_key)
    return _client


@dataclass
class _SafeResult:
    data: dict | None = None


def maybe_one(query) -> _SafeResult:
    """Safe wrapper for .maybe_single().execute() — always returns object with .data."""
    result = query.maybe_single().execute()
    if result is None:
        return _SafeResult(None)
    return result
