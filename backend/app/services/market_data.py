"""Market Data Service — live prices via EODHD, cached and served to frontend."""

import time
import logging
from datetime import datetime, timezone

import httpx
from app.core.config import get_settings
from app.core.supabase import get_supabase

log = logging.getLogger("market_data")

# In-memory cache with 30-second TTL
_quote_cache: dict = {"data": {}, "expires": 0}
_market_summary_cache: dict = {"data": None, "expires": 0}

TRACKED_TICKERS = [
    "SPY", "QQQ", "DIA", "IWM",  # Indices
    "NVDA", "AAPL", "MSFT", "GOOGL", "META", "AMZN", "TSLA",  # Mega caps
    "AMD", "SMCI", "AVGO",  # AI/Semis
    "CCJ", "NNE", "SMR", "CEG", "VST",  # Nuclear
    "KKR", "ARCC", "BX", "APO",  # Private credit
    "TLT", "GLD", "BTC-USD",  # Macro
]


async def fetch_bulk_quotes(symbols: list[str] | None = None) -> dict[str, dict]:
    """Fetch real-time quotes from EODHD. Returns {symbol: quote_data}."""
    now = time.time()
    if _quote_cache["data"] and now < _quote_cache["expires"] and not symbols:
        return _quote_cache["data"]

    s = get_settings()
    if not s.eodhd_api_key:
        return {}

    tickers = symbols or TRACKED_TICKERS
    # EODHD: first symbol in path, rest as s= parameter
    suffixed = [f"{t}.US" if not any(c in t for c in ["-", "."]) else t for t in tickers]
    first = suffixed[0]
    rest = ",".join(suffixed[1:]) if len(suffixed) > 1 else ""

    try:
        async with httpx.AsyncClient() as client:
            params = {"api_token": s.eodhd_api_key, "fmt": "json"}
            if rest:
                params["s"] = rest
            resp = await client.get(
                f"https://eodhistoricaldata.com/api/real-time/{first}",
                params=params,
                timeout=10,
            )
            if resp.status_code != 200:
                log.warning("EODHD returned %d", resp.status_code)
                return _quote_cache.get("data", {})

            raw = resp.json()
            # Handle single vs multiple results
            if isinstance(raw, dict):
                raw = [raw]

            quotes = {}
            for q in raw:
                code = q.get("code", "").replace(".US", "")
                if not code:
                    continue
                try:
                    quotes[code] = {
                        "symbol": code,
                        "price": float(q.get("close") or 0),
                        "open": float(q.get("open") or 0),
                        "high": float(q.get("high") or 0),
                        "low": float(q.get("low") or 0),
                        "close": float(q.get("close") or 0),
                        "prev_close": float(q.get("previousClose") or 0),
                        "change": round(float(q.get("change") or 0), 2),
                        "change_pct": round(float(q.get("change_p") or 0), 2),
                        "volume": int(q.get("volume") or 0),
                        "timestamp": int(q.get("timestamp") or 0),
                    }
                except (ValueError, TypeError):
                    continue

            if not symbols:
                _quote_cache["data"] = quotes
                _quote_cache["expires"] = now + 30  # 30s cache

            return quotes

    except Exception as e:
        log.error("EODHD fetch failed: %s", e)
        return _quote_cache.get("data", {})


async def get_market_summary() -> dict:
    """Get market overview: index performance, breadth, top movers."""
    now = time.time()
    if _market_summary_cache["data"] and now < _market_summary_cache["expires"]:
        return _market_summary_cache["data"]

    quotes = await fetch_bulk_quotes()
    if not quotes:
        return {"indices": [], "gainers": [], "losers": [], "sentiment": "neutral", "timestamp": datetime.now(timezone.utc).isoformat()}

    # Index performance
    indices = []
    for sym in ["SPY", "QQQ", "DIA", "IWM"]:
        q = quotes.get(sym)
        if q:
            indices.append({
                "symbol": sym,
                "name": {"SPY": "S&P 500", "QQQ": "Nasdaq 100", "DIA": "Dow Jones", "IWM": "Russell 2000"}.get(sym, sym),
                "price": q["price"],
                "change": q["change"],
                "change_pct": q["change_pct"],
            })

    # Top movers (biggest absolute % change)
    stock_quotes = {k: v for k, v in quotes.items() if k not in ["SPY", "QQQ", "DIA", "IWM", "TLT", "GLD", "BTC-USD"]}
    sorted_movers = sorted(stock_quotes.values(), key=lambda q: abs(q["change_pct"]), reverse=True)

    gainers = [q for q in sorted_movers if q["change_pct"] > 0][:5]
    losers = [q for q in sorted_movers if q["change_pct"] < 0][:5]

    # Simple sentiment from index direction
    spy = quotes.get("SPY", {})
    qqq = quotes.get("QQQ", {})
    spy_chg = spy.get("change_pct", 0)
    qqq_chg = qqq.get("change_pct", 0)

    if spy_chg > 0.5 and qqq_chg > 0.5:
        sentiment = "bullish"
    elif spy_chg < -0.5 and qqq_chg < -0.5:
        sentiment = "bearish"
    elif abs(spy_chg) > 1 or abs(qqq_chg) > 1:
        sentiment = "choppy"
    else:
        sentiment = "neutral"

    summary = {
        "indices": indices,
        "gainers": gainers,
        "losers": losers,
        "sentiment": sentiment,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    _market_summary_cache["data"] = summary
    _market_summary_cache["expires"] = now + 30

    return summary


async def sync_ticker_prices():
    """Update ticker table with latest prices from EODHD."""
    db = get_supabase()
    tickers = db.table("tickers").select("symbol").execute()
    symbols = [t["symbol"] for t in (tickers.data or [])]

    if not symbols:
        return 0

    quotes = await fetch_bulk_quotes(symbols)

    updated = 0
    for sym, q in quotes.items():
        db.table("tickers").update({
            "last_price": q["price"],
            "price_change_pct": q["change_pct"],
            "volume_ratio": None,  # TODO: compare to avg volume
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("symbol", sym).execute()
        updated += 1

    log.info("Synced prices for %d tickers", updated)
    return updated
