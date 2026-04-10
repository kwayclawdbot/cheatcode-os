"""Company profile lazy fetcher.

Pulls a one-time company profile (description, sector, industry, website,
country, employees) from EODHD Fundamentals on first ticker page view, then
caches it on the `tickers` row forever. EODHD bills per call but the
fundamentals endpoint is cheap (~1 call) and we never re-fetch — so the
total cost is bounded by `# of distinct tickers anyone has ever viewed`.

Returns the in-DB row when available; only hits EODHD when description is
missing AND we haven't tried recently. Crypto / forex / index symbols skip
the fetch entirely (no fundamentals available).
"""

from datetime import datetime, timezone, timedelta
import logging

import httpx

from app.core.config import get_settings
from app.core.supabase import get_supabase, maybe_one

log = logging.getLogger("company_profile")

# Don't refetch a missed lookup more than once per day to avoid hammering
# EODHD when an unknown symbol is browsed repeatedly.
_REFRESH_COOLDOWN = timedelta(hours=24)


async def get_company_profile(symbol: str) -> dict | None:
    """Return the company profile for a ticker.

    Lazy-fetches from EODHD Fundamentals on first request and persists the
    result back to the tickers row. Subsequent calls are fully free.
    """
    db = get_supabase()
    sym = symbol.upper().strip()

    row = maybe_one(
        db.table("tickers")
        .select("symbol, name, sector, industry, market_cap, market_cap_tier, "
                "asset_class, description, website, country, employees, "
                "company_profile_fetched_at")
        .eq("symbol", sym)
    )
    data = row.data or None

    # Build the always-available subset from what we already have on the row.
    base_profile = _build_profile(data) if data else {"symbol": sym}

    # Skip the EODHD fetch entirely for non-equity assets — there's no
    # fundamentals payload to retrieve and the call would just 404.
    asset_class = (data or {}).get("asset_class") or "stocks"
    if asset_class not in ("stocks", "etf"):
        return base_profile

    if data and data.get("description"):
        return base_profile  # already cached

    # Cooldown: avoid hammering EODHD if we tried recently and got nothing.
    last = data.get("company_profile_fetched_at") if data else None
    if last:
        try:
            last_dt = datetime.fromisoformat(last.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) - last_dt < _REFRESH_COOLDOWN:
                return base_profile
        except (ValueError, TypeError):
            pass

    # Fetch fundamentals.
    fundamentals = await _fetch_eodhd_fundamentals(sym)
    if not fundamentals:
        # Mark the attempt so we don't immediately retry.
        try:
            db.table("tickers").update({
                "company_profile_fetched_at": datetime.now(timezone.utc).isoformat(),
            }).eq("symbol", sym).execute()
        except Exception:
            pass
        return base_profile

    address = fundamentals.get("AddressData") if isinstance(fundamentals.get("AddressData"), dict) else {}
    update_payload = {
        "description": (fundamentals.get("Description") or "")[:4000] or None,
        "sector": fundamentals.get("Sector") or (data or {}).get("sector"),
        "industry": fundamentals.get("Industry") or (data or {}).get("industry"),
        "website": fundamentals.get("WebURL"),
        "country": (address or {}).get("Country"),
        "employees": _safe_int(fundamentals.get("FullTimeEmployees")),
        "company_profile_fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    update_payload = {k: v for k, v in update_payload.items() if v is not None}

    try:
        db.table("tickers").update(update_payload).eq("symbol", sym).execute()
    except Exception as e:
        log.warning("company_profile: persist failed for %s: %s", sym, e)

    # Re-read the row so the response includes everything we just wrote.
    row2 = maybe_one(
        db.table("tickers")
        .select("symbol, name, sector, industry, market_cap, market_cap_tier, "
                "asset_class, description, website, country, employees")
        .eq("symbol", sym)
    )
    return _build_profile(row2.data or {**(data or {}), **update_payload, "symbol": sym})


def _build_profile(row: dict) -> dict:
    return {
        "symbol": row.get("symbol"),
        "name": row.get("name"),
        "sector": row.get("sector"),
        "industry": row.get("industry"),
        "market_cap": row.get("market_cap"),
        "market_cap_tier": row.get("market_cap_tier"),
        "asset_class": row.get("asset_class") or "stocks",
        "description": row.get("description"),
        "website": row.get("website"),
        "country": row.get("country"),
        "employees": row.get("employees"),
    }


def _safe_int(v) -> int | None:
    try:
        if v is None or v == "":
            return None
        return int(float(v))
    except (ValueError, TypeError):
        return None


async def _fetch_eodhd_fundamentals(symbol: str) -> dict | None:
    """One EODHD Fundamentals call for the General::Description block."""
    s = get_settings()
    if not s.eodhd_api_key:
        return None
    code = f"{symbol}.US"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://eodhistoricaldata.com/api/fundamentals/{code}",
                params={"api_token": s.eodhd_api_key, "fmt": "json"},
                timeout=10,
            )
            if resp.status_code != 200:
                return None
            data = resp.json()
            if not isinstance(data, dict):
                return None
            general = data.get("General") or {}
            return general
    except Exception as e:
        log.warning("eodhd fundamentals fetch failed for %s: %s", symbol, e)
        return None
