"""Kai Chat API — conversational AI analyst."""

import time
from datetime import datetime, date, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor

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


def _fetch_alert_rows(days: int) -> list[dict]:
    """Pull deduped (ticker, date, type) alerts from sent_alerts within the window.

    Reads via Supabase service key — same project as breakout-alert-system.
    """
    db = get_supabase()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    res = (
        db.table("sent_alerts")
        .select("id,ticker,alert_type,sent_at,alert_price,stop_price")
        .gte("sent_at", cutoff)
        .order("sent_at")
        .limit(5000)
        .execute()
    )
    rows = res.data or []
    # Dedupe by (ticker, date, alert_type) — keep earliest
    seen = {}
    for r in rows:
        key = (r["ticker"], r["sent_at"][:10], r["alert_type"])
        if key not in seen:
            seen[key] = r
    return list(seen.values())


def _score_one(alert: dict) -> dict:
    """Score one alert against yfinance daily OHLC."""
    import yfinance as yf

    ticker = alert["ticker"]
    sent_at = datetime.fromisoformat(alert["sent_at"].replace("Z", "+00:00"))
    alert_date = sent_at.date()
    alert_price = float(alert["alert_price"])
    direction = "short" if alert["alert_type"] in SHORT_TYPES else "long"
    stop = float(alert["stop_price"]) if alert.get("stop_price") else None

    try:
        df = yf.download(
            ticker,
            start=alert_date.isoformat(),
            end=(date.today() + timedelta(days=1)).isoformat(),
            progress=False,
            auto_adjust=False,
            threads=False,
        )
    except Exception:
        return {"ticker": ticker, "error": "fetch_failed"}

    if df is None or df.empty:
        return {"ticker": ticker, "error": "no_data"}

    peak_price = None
    peak_date = None
    stop_hit_date = None
    for idx, row in df.iterrows():
        bar_date = idx.date() if hasattr(idx, "date") else idx
        if bar_date < alert_date:
            continue
        try:
            high = float(row["High"])
            low = float(row["Low"])
        except (KeyError, TypeError):
            continue
        if high != high:  # NaN
            continue
        if direction == "long":
            if peak_price is None or high > peak_price:
                peak_price = high
                peak_date = bar_date
            if stop is not None and low <= stop and stop_hit_date is None:
                stop_hit_date = bar_date
        else:
            if peak_price is None or low < peak_price:
                peak_price = low
                peak_date = bar_date
            if stop is not None and high >= stop and stop_hit_date is None:
                stop_hit_date = bar_date

    if peak_price is None:
        return {"ticker": ticker, "error": "no_bars_after_alert"}

    if direction == "long":
        peak_pct = (peak_price / alert_price - 1) * 100
    else:
        peak_pct = (alert_price / peak_price - 1) * 100

    return {
        "ticker": ticker,
        "alert_type": alert["alert_type"],
        "direction": direction,
        "sent_at": alert["sent_at"],
        "alert_price": alert_price,
        "stop_price": stop,
        "peak_price": round(peak_price, 2),
        "peak_pct": round(peak_pct, 2),
        "peak_date": peak_date.isoformat(),
        "days_to_peak": (peak_date - alert_date).days,
        "stop_hit_date": stop_hit_date.isoformat() if stop_hit_date else None,
        "peak_before_stop": stop_hit_date is None or peak_date < stop_hit_date,
        "is_big_name": ticker in BIG_NAMES,
    }


@router.get("/wins")
async def kai_wins(days: int = 60, limit: int = 50):
    """Top Kai alert wins, scored live against Yahoo Finance OHLC.

    - Filters to alerts whose peak gain dominates max drawdown (peak before stop).
    - Direction-aware: shorts win when price drops.
    - Sort: big-name tickers first, then peak% desc.
    - Cached for 5 minutes per (days, limit) tuple.
    """
    cache_key = f"{days}:{limit}"
    now = time.time()
    hit = _WINS_CACHE.get(cache_key)
    if hit and hit[0] > now:
        return {"data": hit[1], "cached": True, "ttl_remaining": int(hit[0] - now)}

    alerts = _fetch_alert_rows(days)
    with ThreadPoolExecutor(max_workers=12) as pool:
        scored = list(pool.map(_score_one, alerts))

    # Filter: valid + peak_before_stop + peak dominates (winning trade)
    wins = [
        s for s in scored
        if "peak_pct" in s
        and s["peak_pct"] > 0
        and s.get("peak_before_stop")
    ]
    # Sort: big names first, then peak% desc
    wins.sort(key=lambda s: (not s["is_big_name"], -s["peak_pct"]))
    top = wins[:limit]

    _WINS_CACHE[cache_key] = (now + _WINS_TTL, top)
    return {"data": top, "cached": False, "scanned": len(alerts), "winners": len(wins)}
