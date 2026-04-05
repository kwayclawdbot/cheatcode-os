"""Trading Journal API — log trades, Kai analysis, P&L tracking."""

import json
import anthropic
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from app.core.supabase import get_supabase, maybe_one
from app.core.auth import require_user
from app.core.config import get_settings
from app.services.gamification import award_xp

router = APIRouter(prefix="/journal", tags=["journal"])


class JournalEntryCreate(BaseModel):
    ticker: str
    direction: str  # long | short
    entry_price: float
    exit_price: float | None = None
    size: float | None = None
    stop_loss: float | None = None
    target: float | None = None
    outcome: str | None = None  # win | loss | breakeven | open
    pnl: float | None = None
    risk_reward: float | None = None
    setup: str | None = None
    pre_notes: str | None = None
    post_notes: str | None = None
    emotions: list[str] = []
    rules_followed: bool = True
    rule_violation: str | None = None
    screenshot_url: str | None = None


@router.get("/entries")
async def list_entries(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    ticker: str | None = None,
    outcome: str | None = None,
    user: dict = Depends(require_user),
):
    db = get_supabase()
    offset = (page - 1) * per_page
    q = db.table("journal_entries").select("*").eq("user_id", user["id"]).order("date", desc=True)
    if ticker:
        q = q.eq("ticker", ticker.upper())
    if outcome:
        q = q.eq("outcome", outcome)
    result = q.range(offset, offset + per_page - 1).execute()
    return result.data or []


@router.post("/entries")
async def create_entry(entry: JournalEntryCreate, user: dict = Depends(require_user)):
    db = get_supabase()

    # Calculate P&L if not provided
    pnl = entry.pnl
    if pnl is None and entry.exit_price and entry.size:
        multiplier = 1 if entry.direction == "long" else -1
        pnl = (entry.exit_price - entry.entry_price) * entry.size * multiplier

    # Calculate R:R if not provided
    rr = entry.risk_reward
    if rr is None and entry.stop_loss and entry.target and entry.entry_price:
        risk = abs(entry.entry_price - entry.stop_loss)
        reward = abs(entry.target - entry.entry_price)
        rr = round(reward / risk, 2) if risk > 0 else None

    # Determine outcome
    outcome = entry.outcome
    if not outcome and pnl is not None:
        outcome = "win" if pnl > 0 else ("loss" if pnl < 0 else "breakeven")

    result = db.table("journal_entries").insert({
        "user_id": user["id"],
        "ticker": entry.ticker.upper(),
        "direction": entry.direction,
        "entry_price": entry.entry_price,
        "exit_price": entry.exit_price,
        "size": entry.size,
        "stop_loss": entry.stop_loss,
        "target": entry.target,
        "outcome": outcome,
        "pnl": pnl,
        "risk_reward": rr,
        "setup": entry.setup,
        "pre_notes": entry.pre_notes,
        "post_notes": entry.post_notes,
        "emotions": entry.emotions,
        "rules_followed": entry.rules_followed,
        "rule_violation": entry.rule_violation,
        "screenshot_url": entry.screenshot_url,
    }).execute()

    entry_id = result.data[0]["id"] if result.data else None

    # Update profile trade stats
    _update_trade_stats(user["id"])

    # Award XP
    award_xp(user["id"], "journal_entry", {"ticker": entry.ticker})

    # Generate Kai analysis asynchronously
    if entry_id and entry.exit_price:
        kai_text = await _generate_kai_analysis(entry, pnl, rr, outcome)
        if kai_text:
            db.table("journal_entries").update({"kai_analysis": kai_text}).eq("id", entry_id).execute()

    return result.data[0] if result.data else {}


@router.put("/entries/{entry_id}")
async def update_entry(entry_id: str, updates: dict, user: dict = Depends(require_user)):
    db = get_supabase()
    # Verify ownership
    existing = maybe_one(db.table("journal_entries").select("id").eq("id", entry_id).eq("user_id", user["id"]))
    if not existing.data:
        raise HTTPException(404, "Entry not found")

    db.table("journal_entries").update(updates).eq("id", entry_id).execute()
    _update_trade_stats(user["id"])
    return {"ok": True}


@router.delete("/entries/{entry_id}")
async def delete_entry(entry_id: str, user: dict = Depends(require_user)):
    db = get_supabase()
    db.table("journal_entries").delete().eq("id", entry_id).eq("user_id", user["id"]).execute()
    _update_trade_stats(user["id"])
    return {"ok": True}


@router.get("/stats")
async def get_journal_stats(user: dict = Depends(require_user)):
    """P&L summary, win rate, streaks, emotional patterns."""
    db = get_supabase()
    entries = db.table("journal_entries").select("*").eq("user_id", user["id"]).order("date", desc=True).execute()
    data = entries.data or []

    if not data:
        return {"total_trades": 0, "win_rate": None, "total_pnl": 0}

    wins = sum(1 for e in data if e.get("outcome") == "win")
    losses = sum(1 for e in data if e.get("outcome") == "loss")
    total = wins + losses
    total_pnl = sum(e.get("pnl", 0) or 0 for e in data)
    avg_win = 0
    avg_loss = 0
    win_pnls = [e["pnl"] for e in data if e.get("outcome") == "win" and e.get("pnl")]
    loss_pnls = [e["pnl"] for e in data if e.get("outcome") == "loss" and e.get("pnl")]
    if win_pnls:
        avg_win = sum(win_pnls) / len(win_pnls)
    if loss_pnls:
        avg_loss = sum(loss_pnls) / len(loss_pnls)

    # Emotion frequency
    emotion_counts = {}
    for e in data:
        for em in (e.get("emotions") or []):
            emotion_counts[em] = emotion_counts.get(em, 0) + 1

    # Rule compliance
    rules_followed = sum(1 for e in data if e.get("rules_followed"))

    # Calendar heatmap data (last 90 days)
    calendar = {}
    for e in data:
        d = e.get("date", "")
        if d not in calendar:
            calendar[d] = {"pnl": 0, "trades": 0, "wins": 0}
        calendar[d]["pnl"] += e.get("pnl", 0) or 0
        calendar[d]["trades"] += 1
        if e.get("outcome") == "win":
            calendar[d]["wins"] += 1

    return {
        "total_trades": len(data),
        "wins": wins,
        "losses": losses,
        "win_rate": round(wins / total * 100, 1) if total > 0 else None,
        "total_pnl": round(total_pnl, 2),
        "avg_win": round(avg_win, 2),
        "avg_loss": round(avg_loss, 2),
        "profit_factor": round(abs(avg_win / avg_loss), 2) if avg_loss != 0 else None,
        "rules_compliance": round(rules_followed / len(data) * 100, 1) if data else None,
        "top_emotions": sorted(emotion_counts.items(), key=lambda x: -x[1])[:5],
        "calendar": calendar,
    }


@router.post("/entries/{entry_id}/kai-analysis")
async def request_kai_analysis(entry_id: str, user: dict = Depends(require_user)):
    """Request Kai to analyze a specific journal entry."""
    db = get_supabase()
    entry = maybe_one(db.table("journal_entries").select("*").eq("id", entry_id).eq("user_id", user["id"]))
    if not entry.data:
        raise HTTPException(404, "Entry not found")

    e = entry.data
    kai_text = await _generate_kai_analysis(
        type("E", (), e)(),  # quick namespace
        e.get("pnl"), e.get("risk_reward"), e.get("outcome")
    )

    if kai_text:
        db.table("journal_entries").update({"kai_analysis": kai_text}).eq("id", entry_id).execute()
    return {"analysis": kai_text}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _update_trade_stats(user_id: str):
    """Recalculate and update profile trade stats."""
    db = get_supabase()
    entries = db.table("journal_entries").select("outcome, pnl").eq("user_id", user_id).execute()
    data = entries.data or []
    total = len(data)
    wins = sum(1 for e in data if e.get("outcome") == "win")
    closed = sum(1 for e in data if e.get("outcome") in ("win", "loss", "breakeven"))
    win_rate = round(wins / closed * 100, 1) if closed > 0 else None

    db.table("profiles").update({
        "total_trades": total,
        "win_rate": win_rate,
    }).eq("id", user_id).execute()


async def _generate_kai_analysis(entry, pnl, rr, outcome) -> str | None:
    """Have Kai analyze a completed trade."""
    s = get_settings()
    try:
        client = anthropic.Anthropic(api_key=s.anthropic_api_key)
        prompt = f"""You are Kai, a clinical trading analyst. Analyze this trade journal entry briefly (3-4 sentences max).

Ticker: {getattr(entry, 'ticker', '')}
Direction: {getattr(entry, 'direction', '')}
Entry: {getattr(entry, 'entry_price', '')} → Exit: {getattr(entry, 'exit_price', '')}
P&L: {pnl} | R:R: {rr} | Outcome: {outcome}
Setup: {getattr(entry, 'setup', 'N/A')}
Pre-trade notes: {getattr(entry, 'pre_notes', 'N/A')}
Post-trade notes: {getattr(entry, 'post_notes', 'N/A')}
Emotions: {getattr(entry, 'emotions', [])}
Rules followed: {getattr(entry, 'rules_followed', True)}
Rule violation: {getattr(entry, 'rule_violation', 'N/A')}

Give a concise analysis: what they did well, what could improve, and one pattern to watch. Be direct, no fluff."""

        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.content[0].text
    except Exception:
        return None
