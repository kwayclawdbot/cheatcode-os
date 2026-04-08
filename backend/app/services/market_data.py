"""Market Data Service — live prices via EODHD, cached and served to frontend.

Covers all four asset classes the frontend supports via EODHD's suffix
convention. Symbol normalisation MIRRORS the frontend logic in
client/src/components/shared/MiniSparkline.tsx so a symbol passed in
from anywhere — forex pair, crypto base, stock ticker, pre-suffixed —
reaches the right EODHD endpoint.

EODHD suffix table:
    .US      — US equities (AAPL.US, SPY.US, NVDA.US)
    .FOREX   — currency pairs (EURUSD.FOREX, GBPUSD.FOREX)
    .CC      — cryptocurrencies (BTC-USD.CC, ETH-USD.CC)
    .INDX    — market indices (SPX.INDX, NDX.INDX)
    .COMEX   — COMEX futures (GC.COMEX for gold)
    .NYMEX   — NYMEX futures (CL.NYMEX for crude)

Frontend asset class filters that must all work:
    - stocks   ✓ (US equities)
    - forex    ✓ (6-char pairs like EURUSD)
    - crypto   ✓ (bases like BTC, full form like BTC-USD)
    - futures  ✓ (treated as indices — SPY, QQQ, DIA proxies)
"""

import logging
import re
import time
from datetime import datetime, timezone

import httpx

from app.core.config import get_settings
from app.core.supabase import get_supabase

log = logging.getLogger("market_data")

# In-memory cache with 30-second TTL
_quote_cache: dict = {"data": {}, "expires": 0}
_market_summary_cache: dict = {"data": None, "expires": 0}


# ── Symbol normalisation (mirrors client/src/components/shared/MiniSparkline.tsx) ──

# Canonical crypto base symbols. Must match the frontend's CRYPTO_SYMBOLS set.
CRYPTO_SYMBOLS = frozenset({
    "BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "AVAX", "DOGE", "MATIC", "DOT",
    "LINK", "UNI", "AAVE", "LTC", "BCH", "ATOM", "FIL", "NEAR", "APT", "ARB",
    "OP", "SUI", "SEI", "TIA", "INJ", "PEPE", "WIF", "BONK", "JUP", "PYTH",
    "LDO", "RPL", "FXS", "CRV", "CVX", "BAL", "SUSHI", "COMP", "MKR", "SNX",
    "YFI", "DYDX", "GMX", "SHIB", "FLOKI", "ELON", "HOGE", "VOLT",
})

# Forex major pairs + common crosses (for display-name prettification).
_FOREX_PAIR_RE = re.compile(r"^[A-Z]{6}$")


def normalise_symbol(raw: str) -> tuple[str, str]:
    """Normalise a user-provided symbol for EODHD and return (eodhd_code, clean_display).

    Examples:
        "aapl"        → ("AAPL.US",       "AAPL")
        "$TSLA"       → ("TSLA.US",       "TSLA")
        "EURUSD"      → ("EURUSD.FOREX",  "EURUSD")
        "EUR/USD"     → ("EURUSD.FOREX",  "EURUSD")
        "BTC"         → ("BTC-USD.CC",    "BTC-USD")
        "BTC-USD"     → ("BTC-USD.CC",    "BTC-USD")
        "AAPL.US"     → ("AAPL.US",       "AAPL")
        "BTC-USD.CC"  → ("BTC-USD.CC",    "BTC-USD")
    """
    s = (raw or "").upper().replace("$", "").replace("/", "").strip()
    if not s:
        return ("", "")

    # Already suffixed — pass through, strip suffix for display
    if "." in s:
        base = s.split(".", 1)[0]
        return (s, base)

    # Crypto: base symbol → BTC-USD.CC form
    if s in CRYPTO_SYMBOLS:
        return (f"{s}-USD.CC", f"{s}-USD")
    if "-" in s:
        # Already "BTC-USD" style — just add .CC
        return (f"{s}.CC", s)

    # Forex: 6-char alpha pair
    if _FOREX_PAIR_RE.match(s):
        return (f"{s}.FOREX", s)

    # Default: US equity
    return (f"{s}.US", s)


def _display_symbol(eodhd_code: str) -> str:
    """Strip EODHD suffix for display-friendly symbol."""
    if "." in eodhd_code:
        return eodhd_code.split(".", 1)[0]
    return eodhd_code


# ── Tracked tickers (cron-synced hourly) ───────────────────────────────────

# US equities — indices + mega caps + sector plays
TRACKED_STOCKS = [
    "SPY", "QQQ", "DIA", "IWM",  # Major index ETFs
    "NVDA", "AAPL", "MSFT", "GOOGL", "META", "AMZN", "TSLA",  # Mega caps
    "AMD", "SMCI", "AVGO",  # AI/semis
    "CCJ", "NNE", "SMR", "CEG", "VST",  # Nuclear
    "KKR", "ARCC", "BX", "APO",  # Private credit
    "TLT", "GLD",  # Macro proxies
]

# Cryptocurrencies (EODHD .CC endpoint)
TRACKED_CRYPTO = [
    "BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "XRP-USD", "ADA-USD",
    "AVAX-USD", "DOGE-USD",
]

# Forex major pairs (EODHD .FOREX endpoint)
TRACKED_FOREX = [
    "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "NZDUSD", "USDCHF",
]

TRACKED_TICKERS = TRACKED_STOCKS + TRACKED_CRYPTO + TRACKED_FOREX


async def fetch_bulk_quotes(symbols: list[str] | None = None) -> dict[str, dict]:
    """Fetch real-time quotes from EODHD across all asset classes.

    Returns {display_symbol: quote_data} where display_symbol is the
    suffix-stripped form ("AAPL", "BTC-USD", "EURUSD") — safe to use as
    a dict key on the frontend without worrying about exchange suffixes.

    Handles stocks / crypto / forex / indices automatically via
    normalise_symbol(). Caches the default (no-arg) call for 30 seconds.
    """
    now = time.time()
    if _quote_cache["data"] and now < _quote_cache["expires"] and not symbols:
        return _quote_cache["data"]

    s = get_settings()
    if not s.eodhd_api_key:
        return {}

    tickers = symbols or TRACKED_TICKERS

    # Normalise every input into its EODHD form and build a reverse map so we
    # can attribute responses back to the original display symbol.
    suffixed: list[str] = []
    code_to_display: dict[str, str] = {}
    for t in tickers:
        eodhd_code, display = normalise_symbol(t)
        if not eodhd_code:
            continue
        suffixed.append(eodhd_code)
        code_to_display[eodhd_code.upper()] = display

    if not suffixed:
        return {}

    # EODHD real-time convention: first symbol in path, remaining as s= param.
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
                log.warning("EODHD returned %d (first=%s)", resp.status_code, first)
                return _quote_cache.get("data", {})

            raw = resp.json()
            if isinstance(raw, dict):
                raw = [raw]

            quotes: dict[str, dict] = {}
            for q in raw:
                code = (q.get("code") or "").upper()
                if not code:
                    continue
                # Attribute back to the original display symbol, falling back
                # to stripping the suffix if this row wasn't one we sent.
                display = code_to_display.get(code) or _display_symbol(code)
                try:
                    quotes[display] = {
                        "symbol": display,
                        "price": float(q.get("close") or 0),
                        "open": float(q.get("open") or 0),
                        "high": float(q.get("high") or 0),
                        "low": float(q.get("low") or 0),
                        "close": float(q.get("close") or 0),
                        "prev_close": float(q.get("previousClose") or 0),
                        "change": round(float(q.get("change") or 0), 4),
                        "change_pct": round(float(q.get("change_p") or 0), 4),
                        "volume": int(q.get("volume") or 0),
                        "timestamp": int(q.get("timestamp") or 0),
                    }
                except (ValueError, TypeError) as e:
                    log.warning("EODHD parse error for %s: %s", code, e)
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


async def sync_ticker_prices() -> dict:
    """Update ticker table with latest prices from EODHD.

    Universe strategy (respects EODHD rate limits):
      - ALL crypto (~2K symbols, small universe)
      - ALL forex (~900 symbols)
      - ALL indices (~1.6K symbols)
      - TRACKED_STOCKS curated list (~22 US majors)
      - Any stock/ETF with convergence_score > 0 (curation-covered)
    ~4.5K symbols total → ~90 EODHD calls at 50 symbols/batch.

    Stocks not in any of these buckets get their prices fetched on
    demand when a user hits /market/quote/:symbol (see fetch_bulk_quotes
    cache path). This keeps the recurring cron cost bounded.
    """
    db = get_supabase()

    # Build the sync set. Paginate all three "small universe" asset classes.
    sync_symbols: set[str] = set(TRACKED_STOCKS)

    for asset_class in ("crypto", "forex", "index"):
        offset = 0
        while True:
            res = (
                db.table("tickers")
                .select("symbol")
                .eq("asset_class", asset_class)
                .range(offset, offset + 999)
                .execute()
            )
            batch = res.data or []
            if not batch:
                break
            sync_symbols.update(r["symbol"] for r in batch)
            if len(batch) < 1000:
                break
            offset += 1000

    # Plus anything curation has touched (convergence_score > 0)
    curated = (
        db.table("tickers")
        .select("symbol")
        .gt("convergence_score", 0)
        .execute()
    )
    sync_symbols.update(r["symbol"] for r in (curated.data or []))

    all_symbols = sorted(sync_symbols)
    log.info("sync_ticker_prices: syncing %d symbols", len(all_symbols))
    if not all_symbols:
        return {"synced": 0}

    # Batch into 50-symbol EODHD calls. EODHD real-time endpoint accepts
    # one symbol in the path + remaining via `s=` param; in practice 50
    # is a safe batch size per call.
    BATCH_SIZE = 50
    updated = 0
    failed_batches = 0
    for i in range(0, len(all_symbols), BATCH_SIZE):
        batch = all_symbols[i:i + BATCH_SIZE]
        try:
            quotes = await fetch_bulk_quotes(batch)
        except Exception as e:
            log.warning("sync_ticker_prices: batch %d failed: %s", i, e)
            failed_batches += 1
            continue

        if not quotes:
            continue

        # Collect row updates for this batch
        update_rows = []
        for sym, q in quotes.items():
            update_rows.append({
                "symbol": sym,
                "last_price": q.get("price"),
                "price_change_pct": q.get("change_pct"),
                "last_volume": q.get("volume") or None,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
        if update_rows:
            try:
                db.table("tickers").upsert(update_rows, on_conflict="symbol").execute()
                updated += len(update_rows)
            except Exception as e:
                log.warning("sync_ticker_prices: upsert batch %d failed: %s", i, e)

    log.info(
        "sync_ticker_prices complete: %d updated across %d batches (%d failed)",
        updated, (len(all_symbols) + BATCH_SIZE - 1) // BATCH_SIZE, failed_batches,
    )
    return {
        "synced": updated,
        "total_symbols": len(all_symbols),
        "failed_batches": failed_batches,
    }


# In-memory cache for sparkline data (5-minute TTL)
_sparkline_cache: dict = {}
_SPARKLINE_TTL = 5 * 60  # 5 minutes


async def fetch_price_history(symbol: str, days: int = 30) -> list[dict]:
    """Fetch daily close prices from EODHD for sparkline charts.
    Returns list of {t: timestamp_ms, v: close_price} objects.
    Falls back to empty list if EODHD key is missing or request fails.
    """
    cache_key = f"{symbol}:{days}"
    now = time.time()
    cached = _sparkline_cache.get(cache_key)
    if cached and now < cached["expires"]:
        return cached["data"]

    s = get_settings()
    if not s.eodhd_api_key:
        log.warning("EODHD key missing — cannot fetch price history for %s", symbol)
        return []

    # Use the shared normaliser so the same symbol works across stocks,
    # forex, crypto, and pre-suffixed inputs.
    ticker_code, _display = normalise_symbol(symbol)
    if not ticker_code:
        return []

    from datetime import timedelta
    end_dt = datetime.now(timezone.utc)
    start_dt = end_dt - timedelta(days=days + 14)  # extra buffer for weekends/holidays

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://eodhistoricaldata.com/api/eod/{ticker_code}",
                params={
                    "api_token": s.eodhd_api_key,
                    "fmt": "json",
                    "from": start_dt.strftime("%Y-%m-%d"),
                    "to": end_dt.strftime("%Y-%m-%d"),
                    "period": "d",
                },
                timeout=10,
            )
            if resp.status_code != 200:
                log.warning("EODHD history returned %d for %s", resp.status_code, symbol)
                return []
            raw = resp.json()
            if not isinstance(raw, list) or len(raw) < 3:
                return []
            # Return last `days` data points as {t, v}
            data = [
                {"t": int(datetime.strptime(r["date"], "%Y-%m-%d").timestamp() * 1000), "v": float(r["close"])}
                for r in raw
                if r.get("close") is not None
            ]
            data = data[-days:]  # trim to requested window
            _sparkline_cache[cache_key] = {"data": data, "expires": now + _SPARKLINE_TTL}
            return data
    except Exception as exc:
        log.warning("EODHD price history error for %s: %s", symbol, exc)
        return []
