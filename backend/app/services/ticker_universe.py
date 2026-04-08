"""Ticker universe seeder — pulls the preset ticker list from EODHD.

The universe is NOT built organically from user posts. It's seeded once
(and periodically refreshed) from EODHD's exchange-symbol-list endpoint
for each supported asset class. Users can only $cashtag tickers that
already exist in this universe.

Asset classes:
    stocks  → EODHD /exchange-symbol-list/US  (Common Stock + ETF types)
    crypto  → EODHD /exchange-symbol-list/CC
    forex   → EODHD /exchange-symbol-list/FOREX
    index   → EODHD /exchange-symbol-list/INDX

Sizing expectations:
    stocks ≈ 6,000 rows after filtering (NASDAQ + NYSE common stock + ETFs)
    crypto ≈ 3,000 rows but we filter to USD-quoted only (~500)
    forex  ≈ 70 major + cross pairs
    index  ≈ 400 global indices
    Total  ≈ 7,000 tickers

Call once via POST /api/v1/admin/tickers/seed-universe, then re-run
monthly to pick up new listings / de-listings.
"""

import logging
from datetime import datetime, timezone

import httpx

from app.core.config import get_settings
from app.core.supabase import get_supabase

log = logging.getLogger("ticker_universe")

EODHD_BASE = "https://eodhistoricaldata.com/api/exchange-symbol-list"

# EODHD "Type" values we care about for US stocks.
# Drops things like "Preferred Stock", "Warrant", "Right", "Unit".
US_ALLOWED_TYPES = {"Common Stock", "ETF", "Fund", "Mutual Fund"}


async def _fetch_exchange(code: str) -> list[dict]:
    """Fetch a single exchange symbol list from EODHD."""
    s = get_settings()
    url = f"{EODHD_BASE}/{code}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            url,
            params={"api_token": s.eodhd_api_key, "fmt": "json"},
            timeout=60,  # 8000-row payloads take a few seconds
        )
        if resp.status_code != 200:
            log.error("EODHD %s list failed: HTTP %d", code, resp.status_code)
            return []
        data = resp.json()
        if not isinstance(data, list):
            log.error("EODHD %s list returned non-list", code)
            return []
        return data


def _to_row(item: dict, asset_class: str) -> dict | None:
    """Convert an EODHD exchange-symbol-list entry to a `tickers` row."""
    code = (item.get("Code") or "").strip().upper()
    name = (item.get("Name") or "").strip()
    if not code:
        return None

    row = {
        "symbol": code,
        "name": name[:200] if name else code,
        "asset_class": asset_class,
        "sector": None,
        "industry": None,
        "convergence_score": 0,  # No intelligence until curation finds it
        "is_auto_created": False,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    return row


async def seed_universe() -> dict:
    """Fetch the full ticker universe from EODHD and upsert into tickers table.

    Returns a summary dict with per-asset-class counts and total upserted rows.
    Idempotent — safe to re-run. Existing rows are updated (name, asset_class);
    intelligence fields (convergence_score, daily_analysis, etc.) are not
    touched so an intelligence-scored ticker doesn't lose its state on reseed.
    """
    db = get_supabase()
    summary: dict = {"by_asset_class": {}, "total_upserted": 0, "errors": []}

    # ── US stocks ETFs (large list, filter by Type) ─────────────────────────
    try:
        raw = await _fetch_exchange("US")
        stock_rows: list[dict] = []
        etf_rows: list[dict] = []
        for item in raw:
            itype = (item.get("Type") or "").strip()
            if itype not in US_ALLOWED_TYPES:
                continue
            asset_class = "etf" if itype in ("ETF", "Fund", "Mutual Fund") else "stocks"
            row = _to_row(item, asset_class)
            if not row:
                continue
            (etf_rows if asset_class == "etf" else stock_rows).append(row)

        if stock_rows:
            # Batched upsert — Supabase REST has a 1000-row limit per call
            for i in range(0, len(stock_rows), 500):
                batch = stock_rows[i:i + 500]
                db.table("tickers").upsert(batch, on_conflict="symbol").execute()
            summary["by_asset_class"]["stocks"] = len(stock_rows)
            summary["total_upserted"] += len(stock_rows)
            log.info("seed_universe: upserted %d stocks", len(stock_rows))

        if etf_rows:
            for i in range(0, len(etf_rows), 500):
                batch = etf_rows[i:i + 500]
                db.table("tickers").upsert(batch, on_conflict="symbol").execute()
            summary["by_asset_class"]["etf"] = len(etf_rows)
            summary["total_upserted"] += len(etf_rows)
            log.info("seed_universe: upserted %d ETFs", len(etf_rows))
    except Exception as e:
        log.error("seed_universe US failed: %s", e, exc_info=True)
        summary["errors"].append(f"US: {e}")

    # ── Crypto (filter to USD-quoted only so we're not storing 3000 bases) ──
    try:
        raw = await _fetch_exchange("CC")
        crypto_rows: list[dict] = []
        for item in raw:
            code = (item.get("Code") or "").strip().upper()
            # EODHD crypto codes are e.g. "BTC-USD", "ETH-USD"
            if not code.endswith("-USD"):
                continue
            row = _to_row(item, "crypto")
            if row:
                crypto_rows.append(row)
        if crypto_rows:
            for i in range(0, len(crypto_rows), 500):
                batch = crypto_rows[i:i + 500]
                db.table("tickers").upsert(batch, on_conflict="symbol").execute()
            summary["by_asset_class"]["crypto"] = len(crypto_rows)
            summary["total_upserted"] += len(crypto_rows)
            log.info("seed_universe: upserted %d crypto", len(crypto_rows))
    except Exception as e:
        log.error("seed_universe CC failed: %s", e, exc_info=True)
        summary["errors"].append(f"CC: {e}")

    # ── Forex ───────────────────────────────────────────────────────────────
    try:
        raw = await _fetch_exchange("FOREX")
        forex_rows: list[dict] = []
        for item in raw:
            code = (item.get("Code") or "").strip().upper()
            # Only 6-char pairs (EURUSD) — drops weird derived codes
            if len(code) != 6 or not code.isalpha():
                continue
            row = _to_row(item, "forex")
            if row:
                forex_rows.append(row)
        if forex_rows:
            db.table("tickers").upsert(forex_rows, on_conflict="symbol").execute()
            summary["by_asset_class"]["forex"] = len(forex_rows)
            summary["total_upserted"] += len(forex_rows)
            log.info("seed_universe: upserted %d forex", len(forex_rows))
    except Exception as e:
        log.error("seed_universe FOREX failed: %s", e, exc_info=True)
        summary["errors"].append(f"FOREX: {e}")

    # ── Global indices ──────────────────────────────────────────────────────
    try:
        raw = await _fetch_exchange("INDX")
        idx_rows: list[dict] = []
        for item in raw:
            row = _to_row(item, "index")
            if row:
                idx_rows.append(row)
        if idx_rows:
            for i in range(0, len(idx_rows), 500):
                batch = idx_rows[i:i + 500]
                db.table("tickers").upsert(batch, on_conflict="symbol").execute()
            summary["by_asset_class"]["index"] = len(idx_rows)
            summary["total_upserted"] += len(idx_rows)
            log.info("seed_universe: upserted %d indices", len(idx_rows))
    except Exception as e:
        log.error("seed_universe INDX failed: %s", e, exc_info=True)
        summary["errors"].append(f"INDX: {e}")

    log.info(
        "seed_universe complete: %d total rows upserted across %d asset classes",
        summary["total_upserted"], len(summary["by_asset_class"]),
    )
    return summary


def ticker_exists(symbol: str) -> bool:
    """Check if a ticker is in the preset universe. Used for cashtag validation."""
    db = get_supabase()
    result = db.table("tickers").select("symbol").eq("symbol", symbol.upper()).limit(1).execute()
    return bool(result.data)
