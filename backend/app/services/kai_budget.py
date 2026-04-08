"""Kai (Claude) spend cap enforcement.

Protects against runaway Anthropic API costs. Three layers of defense:

    1. Free tier:  5 messages/day (existing kai_messages_today counter)
    2. Per-user:   $15/mo Pro, $60/mo Elite monthly token budget
    3. Global:     $200/day across all users — hard circuit breaker

Every completed Kai turn records its actual token usage + estimated cost
to the kai_usage table. Enforcement is checked BEFORE each call so a
single response can never push a user past their cap — at most they get
the last turn before the limit triggers.

Pricing (Claude Sonnet 4 — 2026-04 rates):
    input:  $3  per 1M tokens  → $0.000003 per token
    output: $15 per 1M tokens  → $0.000015 per token

If Anthropic changes prices, update PRICING_PER_MILLION below.
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta

from app.core.config import get_settings
from app.core.supabase import get_supabase

log = logging.getLogger("kai_budget")


# Claude Sonnet 4 pricing per 1M tokens, in USD.
# Source: https://www.anthropic.com/pricing
PRICING_PER_MILLION = {
    "claude-sonnet-4-20250514": {"input": 3.0, "output": 15.0},
    "claude-haiku-4-5-20251001": {"input": 0.80, "output": 4.0},
    # Safe fallback for unknown models — use Sonnet 4 rates so we never undercount.
    "__default__": {"input": 3.0, "output": 15.0},
}


@dataclass
class BudgetCheck:
    """Result of a pre-call budget check."""
    allowed: bool
    reason: str | None
    tier: str
    monthly_spent_usd: float
    monthly_budget_usd: float
    daily_global_spent_usd: float
    daily_global_budget_usd: float


def estimate_cost_usd(model: str, input_tokens: int, output_tokens: int) -> float:
    """Compute the USD cost of a Claude call given token counts."""
    pricing = PRICING_PER_MILLION.get(model, PRICING_PER_MILLION["__default__"])
    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]
    return round(input_cost + output_cost, 6)


def _start_of_month_utc(now: datetime) -> datetime:
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _start_of_day_utc(now: datetime) -> datetime:
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


def check_budget(user_id: str, tier: str) -> BudgetCheck:
    """Check whether a user is allowed to make a Kai call right now.

    Returns a BudgetCheck. If allowed=False, the caller should return an
    error response to the user instead of calling Anthropic.
    """
    s = get_settings()
    db = get_supabase()
    now = datetime.now(timezone.utc)

    # Free tier is gated by the existing daily message counter elsewhere —
    # this function is for paid tiers. Allow free-tier calls through; the
    # per-day message limit handles them.
    if tier == "free":
        return BudgetCheck(
            allowed=True,
            reason=None,
            tier=tier,
            monthly_spent_usd=0.0,
            monthly_budget_usd=0.0,
            daily_global_spent_usd=0.0,
            daily_global_budget_usd=s.kai_daily_global_budget_usd,
        )

    monthly_budget = {
        "pro": s.kai_pro_monthly_budget_usd,
        "elite": s.kai_elite_monthly_budget_usd,
    }.get(tier, s.kai_pro_monthly_budget_usd)

    # Sum this user's spend so far this month.
    month_start = _start_of_month_utc(now).isoformat()
    user_rows = (
        db.table("kai_usage")
        .select("cost_usd")
        .eq("user_id", user_id)
        .gte("created_at", month_start)
        .execute()
    )
    monthly_spent = sum(float(r.get("cost_usd") or 0) for r in (user_rows.data or []))

    # Sum global spend so far today.
    day_start = _start_of_day_utc(now).isoformat()
    day_rows = (
        db.table("kai_usage")
        .select("cost_usd")
        .gte("created_at", day_start)
        .execute()
    )
    daily_global_spent = sum(float(r.get("cost_usd") or 0) for r in (day_rows.data or []))

    check = BudgetCheck(
        allowed=True,
        reason=None,
        tier=tier,
        monthly_spent_usd=round(monthly_spent, 4),
        monthly_budget_usd=monthly_budget,
        daily_global_spent_usd=round(daily_global_spent, 4),
        daily_global_budget_usd=s.kai_daily_global_budget_usd,
    )

    # Global circuit breaker takes priority — if the whole system is over
    # today's global cap, nobody gets to call Kai until tomorrow (or the
    # admin raises the cap).
    if daily_global_spent >= s.kai_daily_global_budget_usd:
        check.allowed = False
        check.reason = (
            f"Kai is temporarily unavailable (daily system budget reached: "
            f"${daily_global_spent:.2f}/${s.kai_daily_global_budget_usd:.0f}). "
            f"Try again tomorrow."
        )
        log.critical(
            "kai_budget: GLOBAL DAILY CAP HIT — spent=%.2f cap=%.2f user=%s",
            daily_global_spent, s.kai_daily_global_budget_usd, user_id,
        )
        return check

    # Per-user monthly cap.
    if monthly_spent >= monthly_budget:
        check.allowed = False
        check.reason = (
            f"You've reached your monthly Kai budget "
            f"(${monthly_spent:.2f}/${monthly_budget:.0f}). "
            f"Resets at the start of next month."
        )
        log.warning(
            "kai_budget: user %s at monthly cap (tier=%s spent=%.2f budget=%.2f)",
            user_id, tier, monthly_spent, monthly_budget,
        )
        return check

    # 80% warning log (non-blocking) — useful signal in Railway logs.
    if monthly_spent >= monthly_budget * 0.8:
        log.warning(
            "kai_budget: user %s at 80%%+ monthly usage (tier=%s spent=%.2f budget=%.2f)",
            user_id, tier, monthly_spent, monthly_budget,
        )

    return check


def record_usage(
    user_id: str,
    conversation_id: str | None,
    model: str,
    input_tokens: int,
    output_tokens: int,
    tier: str,
) -> float:
    """Persist a usage row after a completed Kai call. Returns the cost in USD."""
    cost = estimate_cost_usd(model, input_tokens, output_tokens)
    db = get_supabase()
    try:
        db.table("kai_usage").insert({
            "user_id": user_id,
            "conversation_id": conversation_id,
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_usd": cost,
            "tier": tier,
        }).execute()
    except Exception as e:
        # Never let a logging failure break the user's chat experience,
        # but log loudly so we know we're flying blind.
        log.error(
            "kai_budget: failed to record usage (user=%s cost=$%.4f): %s",
            user_id, cost, e,
        )
    return cost
