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


# ── Bulk EOD price sync (cheap, covers entire universe) ──────────────────

# Yesterday-close cache per exchange. Populated on first sync of the day,
# reused across all subsequent syncs until it's 12h old. Yesterday's close
# doesn't change intraday, so fetching it once is enough even for hourly
# 24/7 crypto/forex syncs.
_prev_close_cache: dict[str, dict] = {
    # exchange_code: {"data": {code: close}, "expires": epoch_seconds}
}
_PREV_CLOSE_TTL_SECONDS = 12 * 60 * 60  # 12 hours


async def _fetch_bulk_for_date(exchange: str, date_str: str | None) -> list[dict]:
    """Low-level bulk fetch. `date_str` None = latest trading day."""
    s = get_settings()
    if not s.eodhd_api_key:
        return []

    params: dict[str, str] = {
        "api_token": s.eodhd_api_key,
        "fmt": "json",
        "filter": "extended",
    }
    if date_str:
        params["date"] = date_str

    url = f"https://eodhistoricaldata.com/api/eod-bulk-last-day/{exchange}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params, timeout=120)
        if resp.status_code != 200:
            log.error("_fetch_bulk_for_date(%s date=%s): HTTP %d", exchange, date_str, resp.status_code)
            return []
        raw = resp.json()
        if not isinstance(raw, list):
            return []
        return raw


async def _get_prev_close_map(exchange: str, reference_date: str | None = None) -> dict[str, float]:
    """Return {code: prev_close_price} for the most recent trading day
    BEFORE `reference_date`. If reference_date is None, uses Python's
    date.today(). This matters for markets that are closed — e.g.,
    on a Tuesday morning EODHD's latest US data is from Monday, so
    "yesterday" must be computed from Monday (the data date) not
    Tuesday (the wall-clock date).

    Cached for 12 hours per (exchange, reference_date) key.
    """
    import time
    from datetime import date, datetime, timedelta

    if reference_date:
        try:
            ref = datetime.strptime(reference_date, "%Y-%m-%d").date()
        except ValueError:
            ref = date.today()
    else:
        ref = date.today()

    cache_key = f"{exchange}:{ref.isoformat()}"
    now = time.time()
    cached = _prev_close_cache.get(cache_key)
    if cached and now < cached["expires"]:
        return cached["data"]

    # Walk back up to 6 days from the reference date to skip weekends
    # and holidays. Start at days_back=1 so we always ask for something
    # strictly before ref.
    prev_map: dict[str, float] = {}
    used_date: str | None = None
    for days_back in range(1, 7):
        prev_date = (ref - timedelta(days=days_back)).strftime("%Y-%m-%d")
        raw = await _fetch_bulk_for_date(exchange, prev_date)
        if raw:
            # Guard: if EODHD silently ignored our date param and returned
            # today's data, skip it — we'd end up comparing today to today.
            sample_date = (raw[0].get("date") or "") if raw else ""
            if sample_date and sample_date == ref.isoformat():
                continue  # got the same day as ref — try further back
            for row in raw:
                code = (row.get("code") or "").upper()
                close = row.get("close")
                try:
                    if code and close:
                        prev_map[code] = float(close)
                except (ValueError, TypeError):
                    continue
            if prev_map:
                used_date = sample_date or prev_date
                log.info(
                    "prev_close_map(%s ref=%s): %d entries from %s",
                    exchange, ref.isoformat(), len(prev_map), used_date,
                )
                break

    _prev_close_cache[cache_key] = {
        "data": prev_map,
        "expires": now + _PREV_CLOSE_TTL_SECONDS,
    }
    return prev_map


async def fetch_bulk_eod(exchange: str) -> list[dict]:
    """Fetch latest close + computed change_pct for every symbol on an
    EODHD exchange. Uses 2 API calls: today's bulk + yesterday's bulk
    (yesterday is cached 12h per exchange).

    exchange: 'US' | 'CC' | 'FOREX' | 'INDX'

    Returns normalised rows:
        {code, close, change_pct, volume, avg_volume, ema_50d, ema_200d,
         hi_250d, lo_250d, date}

    EODHD's extended-filter response does NOT include change_p or prev_close
    — it gives us avgvol_14d/50d/200d, ema_50d/200d, hi_250d/lo_250d
    instead. We fetch yesterday's bulk separately to compute the daily
    change_pct ourselves.
    """
    # Step 1: today's bulk (EODHD returns the latest available trading day)
    today_raw = await _fetch_bulk_for_date(exchange, None)
    if not today_raw:
        log.warning("fetch_bulk_eod(%s): no today data", exchange)
        return []

    # Step 2: yesterday's close map — computed relative to the DATE in
    # today's response, not Python's wall-clock date. This handles the
    # "market closed overnight" case where today's data is actually
    # yesterday's wall-clock date.
    reference_date = None
    if today_raw and today_raw[0].get("date"):
        reference_date = today_raw[0].get("date")
    prev_map = await _get_prev_close_map(exchange, reference_date=reference_date)

    results: list[dict] = []
    computed_with_prev = 0
    for row in today_raw:
        code = (row.get("code") or "").upper()
        if not code:
            continue
        try:
            close = float(row.get("close") or 0)
        except (ValueError, TypeError):
            continue
        if close <= 0:
            continue

        prev_close = prev_map.get(code)
        if prev_close and prev_close > 0:
            change_pct = round((close - prev_close) / prev_close * 100, 4)
            computed_with_prev += 1
        else:
            # No yesterday data — fall back to intraday (close vs open).
            # Better than zero, and reflects today's actual trading.
            try:
                open_price = float(row.get("open") or 0)
                change_pct = round((close - open_price) / open_price * 100, 4) if open_price > 0 else 0
            except (ValueError, TypeError):
                change_pct = 0

        try:
            volume = int(row.get("volume") or 0)
        except (ValueError, TypeError):
            volume = 0

        # EODHD gives 14d/50d/200d average volumes — use 14d as our
        # 20d-ish baseline for the volume_anomaly trending score.
        def _f(key):
            try:
                v = row.get(key)
                return float(v) if v not in (None, "") else None
            except (ValueError, TypeError):
                return None

        market_cap = _f("MarketCapitalization") or 0
        results.append({
            "code": code,
            "close": close,
            "change_pct": change_pct,
            "volume": volume,
            "avg_volume": _f("avgvol_14d"),
            "ema_50d": _f("ema_50d"),
            "ema_200d": _f("ema_200d"),
            "hi_250d": _f("hi_250d"),
            "lo_250d": _f("lo_250d"),
            "market_cap": int(market_cap) if market_cap else None,
            "date": row.get("date"),
        })

    log.info(
        "fetch_bulk_eod(%s): %d rows (%d with true day-over-day, %d with intraday fallback)",
        exchange, len(results), computed_with_prev, len(results) - computed_with_prev,
    )
    return results


async def sync_eod_prices(exchanges: list[str] | None = None) -> dict:
    """Bulk EOD sync across one or more EODHD exchanges.

    Default exchanges = all 4 (US, CC, FOREX, INDX) = ~4 API calls,
    covers the entire 33K-ticker universe. This should be the ONLY
    regularly-scheduled price sync.

    Mapping of EODHD code → tickers.symbol:
        US       → stocks and ETFs (EODHD returns symbol like "AAPL")
        CC       → crypto (EODHD returns "BTC-USD" style)
        FOREX    → forex (EODHD returns "EURUSD" style)
        INDX     → indices (EODHD returns various codes)

    We only update tickers that already exist in our table (from the
    preset universe) — unknown symbols in the EODHD response are
    ignored, and existing tickers not in the response keep their
    previous data (we never null out prices).
    """
    exchanges = exchanges or ["US", "CC", "FOREX", "INDX"]
    db = get_supabase()

    # Load all ticker symbols that exist in our universe so we only
    # write data for symbols we care about.
    known_symbols: set[str] = set()
    offset = 0
    while True:
        res = db.table("tickers").select("symbol").range(offset, offset + 999).execute()
        batch = res.data or []
        if not batch:
            break
        known_symbols.update(r["symbol"] for r in batch)
        if len(batch) < 1000:
            break
        offset += 1000

    log.info("sync_eod_prices: universe has %d known symbols", len(known_symbols))

    total_updated = 0
    per_exchange: dict[str, int] = {}
    now_iso = datetime.now(timezone.utc).isoformat()

    for exchange in exchanges:
        rows = await fetch_bulk_eod(exchange)
        if not rows:
            per_exchange[exchange] = 0
            continue

        # Filter to symbols we know about, build upsert payload.
        # We also populate volume_avg_20d from EODHD's avgvol_14d so the
        # volume_anomaly component of trending scoring starts working
        # without a separate backfill job.
        update_rows = []
        for r in rows:
            sym = r["code"]
            if sym not in known_symbols:
                continue
            if r["close"] <= 0:
                continue  # skip bad data
            row_update = {
                "symbol": sym,
                "last_price": r["close"],
                "price_change_pct": r["change_pct"],
                "last_volume": r["volume"] or None,
                "updated_at": now_iso,
            }
            if r.get("avg_volume") is not None and r["avg_volume"] > 0:
                row_update["volume_avg_20d"] = int(r["avg_volume"])
            mc = r.get("market_cap")
            if mc and mc > 0:
                row_update["market_cap"] = mc
                # Standard market cap tiers (USD):
                #   mega   ≥ 200B
                #   large  10B–200B
                #   mid    2B–10B
                #   small  300M–2B
                #   micro  50M–300M
                #   nano   < 50M
                if mc >= 200_000_000_000:
                    tier = "mega"
                elif mc >= 10_000_000_000:
                    tier = "large"
                elif mc >= 2_000_000_000:
                    tier = "mid"
                elif mc >= 300_000_000:
                    tier = "small"
                elif mc >= 50_000_000:
                    tier = "micro"
                else:
                    tier = "nano"
                row_update["market_cap_tier"] = tier
            update_rows.append(row_update)

        # Upsert in 500-row batches (Supabase REST payload limits).
        written = 0
        for i in range(0, len(update_rows), 500):
            chunk = update_rows[i:i + 500]
            try:
                db.table("tickers").upsert(chunk, on_conflict="symbol").execute()
                written += len(chunk)
            except Exception as e:
                log.warning("sync_eod_prices(%s): upsert chunk %d failed: %s", exchange, i, e)

        per_exchange[exchange] = written
        total_updated += written
        log.info("sync_eod_prices(%s): %d tickers updated", exchange, written)

    log.info("sync_eod_prices complete: %d total updated (%d API calls)", total_updated, len(exchanges))
    return {
        "total_updated": total_updated,
        "per_exchange": per_exchange,
        "api_calls": len(exchanges),
    }


async def sync_eod_prices_24_7() -> dict:
    """Hourly sync for 24/7 asset classes (crypto + forex). 2 API calls."""
    return await sync_eod_prices(["CC", "FOREX"])


# Legacy alias kept for compatibility with anything that still imports it —
# now backed by the bulk approach instead of per-symbol fetches.
sync_ticker_prices = sync_eod_prices


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
