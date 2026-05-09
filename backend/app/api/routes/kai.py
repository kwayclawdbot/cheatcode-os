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
