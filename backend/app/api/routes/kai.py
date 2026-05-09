"""Kai Chat API — conversational AI analyst."""

import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from app.core.auth import get_current_user, require_user
from app.core.supabase import get_supabase, maybe_one
from app.models.content import KaiChatRequest, KaiChatResponse, KaiMessage
from app.services.kai_chat import chat

router = APIRouter(prefix="/kai", tags=["kai"])

SHORT_TYPES = {"breakdown", "kai_orb_bearish", "kai_short", "short_idea"}
BIG_NAMES = set(
    "AMD NVDA MU MRVL AVGO AMZN AAPL GOOGL META MSFT TSLA NFLX "
    "COIN SOFI PLTR RBLX RIVN F BAC JPM GS MS WFC C UNH "
    "BE OSCR WDC AXP NKE ORCL INTC QCOM AMAT KLAC LRCX ARM ASML TSM "
    "BABA SMCI DELL UBER LYFT DIS SHOP SQ PYPL SNAP PINS HOOD "
    "CRM ADBE NOW SNOW DDOG NET CRWD PANW ZS MDB OKTA TWLO "
    "BA GE CAT DE XOM CVX OXY NEM SPY QQQ ADI COP EOG SLB "
    "JNJ PFE MRNA LLY CVS WBA ABBV MRK BMY TXN "
    "WMT TGT COST HD LOW MCD SBUX CMG KO PEP PG".split()
)

# Module-level cache for /kai/wins. {key: (expires_at, payload)}
_WINS_CACHE: dict[str, tuple[float, list]] = {}
_WINS_TTL = 300  # 5 minutes


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


def _score_from_db(days: int) -> tuple[list[dict], int]:
    """Score Kai wins from Supabase using alert_performance.peak_30d_price.

    Fast path — no external API calls. Daily-fresh as of cron-update-performance.
    Fixes stale rows by taking MAX peak across same-ticker alerts that share a peak date.
    """
    db = get_supabase()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    # Pull sent_alerts within window
    sa_res = (
        db.table("sent_alerts")
        .select("id,ticker,alert_type,sent_at,alert_price,stop_price")
        .gte("sent_at", cutoff)
        .order("sent_at")
        .limit(5000)
        .execute()
    )
    alerts = sa_res.data or []
    if not alerts:
        return [], 0

    # Pull alert_performance for those alerts
    alert_ids = [a["id"] for a in alerts]
    # Supabase has a query length cap; chunk in batches of 200
    perf_by_id = {}
    for i in range(0, len(alert_ids), 200):
        chunk = alert_ids[i:i + 200]
        ap_res = (
            db.table("alert_performance")
            .select("alert_id,max_gain_pct,max_loss_pct,peak_at_utc,peak_30d_price")
            .in_("alert_id", chunk)
            .execute()
        )
        for p in (ap_res.data or []):
            perf_by_id[p["alert_id"]] = p

    # Dedupe alerts by (ticker, date, alert_type) — keep first
    seen = {}
    for a in alerts:
        key = (a["ticker"], a["sent_at"][:10], a["alert_type"])
        if key not in seen:
            seen[key] = a
    deduped = list(seen.values())

    # Bucket peaks by (ticker, peak_date) so stale single-row peaks get upgraded
    peak_by_ticker_date: dict[tuple[str, str], float] = {}
    for a in deduped:
        p = perf_by_id.get(a["id"])
        if not p or p.get("peak_30d_price") is None:
            continue
        peak_date = (p.get("peak_at_utc") or a["sent_at"])[:10]
        key = (a["ticker"], peak_date)
        prev = peak_by_ticker_date.get(key, 0)
        if p["peak_30d_price"] > prev:
            peak_by_ticker_date[key] = p["peak_30d_price"]

    scored = []
    for a in deduped:
        p = perf_by_id.get(a["id"])
        if not p or p.get("peak_30d_price") is None:
            continue
        max_gain = p.get("max_gain_pct") or 0
        max_loss = p.get("max_loss_pct") or 0
        direction = "short" if a["alert_type"] in SHORT_TYPES else "long"
        alert_price = float(a["alert_price"])
        peak_at = p.get("peak_at_utc")
        peak_date_str = (peak_at or a["sent_at"])[:10]

        if direction == "long":
            true_peak = peak_by_ticker_date.get((a["ticker"], peak_date_str), p["peak_30d_price"])
            peak_price = round(float(true_peak), 2)
            peak_pct = round((true_peak / alert_price - 1) * 100, 2)
            # Peak dominates: upside > drawdown
            if max_gain <= abs(max_loss):
                continue
        else:
            # short: peak = lowest price; use max_loss_pct (negative) as the drop
            peak_price = round(alert_price * (1 + max_loss / 100.0), 2)
            peak_pct = round(-max_loss, 2)
            if abs(max_loss) <= max_gain:
                continue

        if peak_pct <= 0:
            continue

        sent_dt = datetime.fromisoformat(a["sent_at"].replace("Z", "+00:00"))
        alert_date = sent_dt.date()
        try:
            peak_d = datetime.fromisoformat(peak_at.replace("Z", "+00:00")).date() if peak_at else alert_date
        except Exception:
            peak_d = alert_date
        days_to_peak = max((peak_d - alert_date).days, 0)

        scored.append({
            "ticker": a["ticker"],
            "alert_type": a["alert_type"],
            "direction": direction,
            "sent_at": a["sent_at"],
            "alert_price": alert_price,
            "stop_price": float(a["stop_price"]) if a.get("stop_price") else None,
            "peak_price": peak_price,
            "peak_pct": peak_pct,
            "peak_date": peak_d.isoformat(),
            "days_to_peak": days_to_peak,
            "stop_hit_date": None,
            "peak_before_stop": True,
            "is_big_name": a["ticker"] in BIG_NAMES,
        })
    return scored, len(deduped)


@router.get("/wins")
def kai_wins(days: int = 60, limit: int = 50):
    """Top Kai alert wins (peak before stop) sourced from alert_performance.

    Uses the peak_30d_price already maintained by cron-update-performance, with a
    fix that takes MAX peak across same-ticker alerts sharing a peak date so stale
    single-row scoring doesn't underreport. Big-name tickers sort first.

    One row per ticker — the best alert (highest peak %, i.e. cheapest entry on
    the same peak) is canonical, and every other alert date for that ticker in
    the window is attached as `alert_dates`.

    Cached 5 minutes per (days, limit).
    """
    cache_key = f"{days}:{limit}"
    now = time.time()
    hit = _WINS_CACHE.get(cache_key)
    if hit and hit[0] > now:
        return {"data": hit[1], "cached": True, "ttl_remaining": int(hit[0] - now)}

    wins, scanned = _score_from_db(days)
    # Sort so the best (highest peak%) row per ticker comes first
    wins.sort(key=lambda s: -s["peak_pct"])

    by_ticker: dict[str, dict] = {}
    extra_dates: dict[str, list[str]] = defaultdict(list)
    for w in wins:
        t = w["ticker"]
        date_str = w["sent_at"][:10]
        if t not in by_ticker:
            by_ticker[t] = w
        else:
            extra_dates[t].append(date_str)

    grouped = []
    for t, best in by_ticker.items():
        all_dates = sorted({best["sent_at"][:10], *extra_dates[t]})
        grouped.append({**best, "alert_dates": all_dates, "alert_count": len(all_dates)})

    grouped.sort(key=lambda s: (not s["is_big_name"], -s["peak_pct"]))
    top = grouped[:limit]
    _WINS_CACHE[cache_key] = (now + _WINS_TTL, top)
    return {"data": top, "cached": False, "scanned": scanned, "winners": len(grouped)}


# Per-ticker detail cache. {ticker_upper: (expires_at, payload)}
_TICKER_CACHE: dict[str, tuple[float, dict]] = {}
_TICKER_TTL = 600  # 10 minutes


def _fetch_ohlc(ticker: str, days_back: int = 90) -> tuple[list[dict], str | None]:
    """Fetch daily OHLC for a single ticker via yfinance.

    Returns (bars, error_string). error_string is None on success.
    """
    try:
        import yfinance as yf
    except Exception as e:
        return [], f"yfinance import: {e}"
    from datetime import date as _date
    start = (_date.today() - timedelta(days=days_back)).isoformat()
    end = (_date.today() + timedelta(days=1)).isoformat()
    try:
        df = yf.download(
            ticker,
            start=start,
            end=end,
            progress=False,
            auto_adjust=False,
            threads=False,
        )
    except Exception as e:
        return [], f"download: {e}"
    if df is None or df.empty:
        return [], "empty dataframe"
    bars = []
    # Multi-ticker download returns columns as MultiIndex (Price, Ticker).
    # For a single-ticker call yfinance still sometimes returns this shape;
    # flatten by selecting the ticker level if present.
    try:
        if hasattr(df.columns, "nlevels") and df.columns.nlevels > 1:
            df = df.xs(ticker, axis=1, level=-1)
    except Exception:
        pass
    for idx, row in df.iterrows():
        try:
            d = idx.date() if hasattr(idx, "date") else idx
            high = float(row["High"])
            low = float(row["Low"])
            if high != high or low != low:  # NaN guard
                continue
            vol_raw = row["Volume"]
            bars.append({
                "date": d.isoformat(),
                "open": float(row["Open"]),
                "high": high,
                "low": low,
                "close": float(row["Close"]),
                "volume": int(vol_raw) if vol_raw == vol_raw else 0,
            })
        except Exception:
            continue
    return bars, None if bars else "no parsable rows"


@router.get("/wins/{ticker}")
def kai_win_detail(ticker: str):
    """Enriched per-ticker detail for /kai/wins click-through.

    Bundles all sent_alerts in the last 60 days for this ticker, the perf
    snapshot for the best alert, the original thesis text, and 90 days of
    OHLC for charting. Cached 10 minutes per ticker.
    """
    ticker = ticker.upper()
    now = time.time()
    hit = _TICKER_CACHE.get(ticker)
    if hit and hit[0] > now:
        return {**hit[1], "cached": True, "ttl_remaining": int(hit[0] - now)}

    db = get_supabase()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=60)).isoformat()

    sa_res = (
        db.table("sent_alerts")
        .select("id,ticker,alert_type,sent_at,alert_price,stop_price,humanized_message,setup_label,quality_score,catalyst_type,sector")
        .eq("ticker", ticker)
        .gte("sent_at", cutoff)
        .order("sent_at")
        .execute()
    )
    alerts = sa_res.data or []
    if not alerts:
        return {"ticker": ticker, "error": "no alerts in last 60 days"}

    # Dedupe alerts by (date, alert_type) — keep the first sent that day
    seen_keys = set()
    deduped_alerts = []
    for a in alerts:
        key = (a["sent_at"][:10], a["alert_type"])
        if key in seen_keys:
            continue
        seen_keys.add(key)
        deduped_alerts.append(a)
    alerts = deduped_alerts

    alert_ids = [a["id"] for a in alerts]
    perf_by_id: dict[int, dict] = {}
    for i in range(0, len(alert_ids), 200):
        chunk = alert_ids[i:i + 200]
        ap_res = (
            db.table("alert_performance")
            .select("alert_id,max_gain_pct,max_loss_pct,peak_at_utc,peak_30d_price,gain_5min,gain_15min,gain_30min,gain_1hour,gain_1day,gain_3day,gain_1week,current_price")
            .in_("alert_id", chunk)
            .execute()
        )
        for p in (ap_res.data or []):
            perf_by_id[p["alert_id"]] = p

    direction = "short" if alerts[0]["alert_type"] in SHORT_TYPES else "long"

    # True peak across all alerts of this ticker (fixes stale single-row scoring).
    # For longs we take the max peak_30d_price; for shorts we take the min low
    # implied by max_loss_pct.
    true_peak_price = None
    true_peak_at = None
    for a in alerts:
        p = perf_by_id.get(a["id"])
        if not p:
            continue
        if direction == "long":
            pk = p.get("peak_30d_price")
            if pk is not None and (true_peak_price is None or pk > true_peak_price):
                true_peak_price = float(pk)
                true_peak_at = p.get("peak_at_utc")
        else:
            ml = p.get("max_loss_pct") or 0
            implied_low = float(a["alert_price"]) * (1 + ml / 100.0)
            if true_peak_price is None or implied_low < true_peak_price:
                true_peak_price = implied_low
                true_peak_at = p.get("peak_at_utc")

    # Pick the alert with the best peak% measured against the TRUE peak.
    # For longs: cheapest entry wins. For shorts: highest entry wins.
    best_alert = None
    best_peak_pct = -float("inf")
    for a in alerts:
        ap = float(a["alert_price"])
        if true_peak_price is None:
            continue
        if direction == "long":
            pct = (true_peak_price / ap - 1) * 100
        else:
            pct = (ap / true_peak_price - 1) * 100
        if pct > best_peak_pct:
            best_peak_pct = pct
            best_alert = {
                "alert": a,
                "perf": perf_by_id.get(a["id"], {}),
                "peak_price": true_peak_price,
                "peak_pct": pct,
                "peak_at": true_peak_at,
            }

    if best_alert is None:
        best_alert = {"alert": alerts[0], "perf": perf_by_id.get(alerts[0]["id"], {}), "peak_price": None, "peak_pct": None, "peak_at": None}

    a = best_alert["alert"]
    p = best_alert["perf"]
    sent_dt = datetime.fromisoformat(a["sent_at"].replace("Z", "+00:00"))
    peak_at = best_alert.get("peak_at") or p.get("peak_at_utc")
    try:
        peak_d = datetime.fromisoformat(peak_at.replace("Z", "+00:00")).date() if peak_at else None
    except Exception:
        peak_d = None
    days_to_peak = (peak_d - sent_dt.date()).days if peak_d else None

    payload = {
        "ticker": ticker,
        "direction": direction,
        "is_big_name": ticker in BIG_NAMES,
        "best": {
            "sent_at": a["sent_at"],
            "alert_type": a["alert_type"],
            "alert_price": float(a["alert_price"]),
            "stop_price": float(a["stop_price"]) if a.get("stop_price") else None,
            "peak_price": round(best_alert["peak_price"], 2) if best_alert["peak_price"] is not None else None,
            "peak_pct": round(best_alert["peak_pct"], 2) if best_alert["peak_pct"] is not None else None,
            "peak_date": peak_d.isoformat() if peak_d else None,
            "days_to_peak": days_to_peak,
            "thesis": a.get("humanized_message"),
            "setup_label": a.get("setup_label"),
            "quality_score": a.get("quality_score"),
            "catalyst": a.get("catalyst_type"),
            "sector": a.get("sector"),
        },
        "performance": {
            "gain_5min": p.get("gain_5min"),
            "gain_15min": p.get("gain_15min"),
            "gain_30min": p.get("gain_30min"),
            "gain_1hour": p.get("gain_1hour"),
            "gain_1day": p.get("gain_1day"),
            "gain_3day": p.get("gain_3day"),
            "gain_1week": p.get("gain_1week"),
            "current_price": float(p["current_price"]) if p.get("current_price") else None,
        },
        "all_alerts": [
            {
                "sent_at": x["sent_at"],
                "alert_type": x["alert_type"],
                "alert_price": float(x["alert_price"]),
                "setup_label": x.get("setup_label"),
            }
            for x in alerts
        ],
    }
    bars, ohlc_err = _fetch_ohlc(ticker, days_back=90)
    payload["ohlc"] = bars
    if ohlc_err:
        payload["ohlc_error"] = ohlc_err

    _TICKER_CACHE[ticker] = (now + _TICKER_TTL, payload)
    return {**payload, "cached": False}
