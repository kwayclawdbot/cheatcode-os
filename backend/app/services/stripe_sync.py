"""Stripe ↔ profiles reconciliation.

Two responsibilities:

  1. validate_price_ids() — call at boot. If any configured Stripe price_id
     is wrong (typo, archived, lives in a different account), crash the app
     immediately rather than serve broken checkout links to live customers.

  2. reconcile_subscriptions() — hourly cron. For every profile that has a
     stripe_customer_id, fetch its subscriptions from Stripe and force the
     local tier to match the source of truth. Catches missed webhooks,
     manual changes in the Stripe dashboard, dunning state changes that
     never fired a webhook, etc.

⚠️  STRIPE LIVE MODE — every Stripe API call here bills real customers.
"""

import logging

import stripe

from app.core.config import get_settings
from app.core.supabase import get_supabase
from app.services.tier_audit import set_user_tier

log = logging.getLogger("stripe_sync")

# Subscription statuses that map to a paid (active) tier.
_ACTIVE_STATUSES = {"active", "trialing"}
# Statuses that should drop the user back to free.
_INACTIVE_STATUSES = {"canceled", "incomplete_expired", "unpaid", "past_due", "paused"}


def validate_price_ids() -> None:
    """Verify every configured price_id exists in the connected Stripe account.

    Called at FastAPI startup. Crashes the app on misconfiguration so the
    bad config never reaches users.
    """
    s = get_settings()
    stripe.api_key = s.stripe_secret_key

    to_check = [("STRIPE_PRO_PRICE_ID", s.stripe_pro_price_id)]
    if s.stripe_elite_price_id:
        to_check.append(("STRIPE_ELITE_PRICE_ID", s.stripe_elite_price_id))

    for name, price_id in to_check:
        try:
            price = stripe.Price.retrieve(price_id)
        except stripe.error.StripeError as e:
            log.critical(
                "STARTUP FAILED: Stripe %s=%r is invalid: %s. "
                "Fix the env var in Railway dashboard before retrying.",
                name, price_id, e,
            )
            raise RuntimeError(f"Invalid Stripe price_id for {name}: {e}") from e

        if not getattr(price, "active", False):
            log.critical(
                "STARTUP FAILED: Stripe %s=%r exists but is archived/inactive. "
                "Either activate it in Stripe or update the env var.",
                name, price_id,
            )
            raise RuntimeError(f"Stripe price {name}={price_id} is inactive")

        log.info("stripe_sync: validated %s=%s (%s)", name, price_id, price.nickname or "")


async def reconcile_subscriptions() -> dict:
    """Pull every profile with a Stripe customer and align tier with Stripe truth.

    Returns a summary dict for the scheduler_runs telemetry table.
    """
    s = get_settings()
    stripe.api_key = s.stripe_secret_key
    db = get_supabase()

    profiles_query = (
        db.table("profiles")
        .select("id, tier, stripe_customer_id, stripe_subscription_id")
        .neq("stripe_customer_id", None)
    )
    profiles = profiles_query.execute().data or []

    checked = 0
    fixed = 0
    errors = 0

    for profile in profiles:
        customer_id = profile.get("stripe_customer_id")
        if not customer_id:
            continue
        checked += 1

        try:
            subs = stripe.Subscription.list(customer=customer_id, status="all", limit=10)
        except stripe.error.StripeError as e:
            log.warning("stripe_sync: list subs failed for %s: %s", customer_id, e)
            errors += 1
            continue

        # Pick the most recent active subscription, else most recent overall.
        active_sub = None
        for sub in subs.auto_paging_iter():
            if sub.status in _ACTIVE_STATUSES:
                active_sub = sub
                break
        if active_sub is None and subs.data:
            active_sub = subs.data[0]

        # Decide what tier the user *should* be at.
        if active_sub and active_sub.status in _ACTIVE_STATUSES:
            # Map the price_id back to a tier name.
            price_id = active_sub["items"]["data"][0]["price"]["id"] if active_sub["items"]["data"] else None
            if price_id == s.stripe_pro_price_id:
                expected_tier = "pro"
            elif s.stripe_elite_price_id and price_id == s.stripe_elite_price_id:
                expected_tier = "elite"
            else:
                # Unknown price — leave it alone, log loudly.
                log.warning(
                    "stripe_sync: user %s on unknown price %s (sub=%s)",
                    profile["id"], price_id, active_sub.id,
                )
                continue
            extra = {"stripe_subscription_id": active_sub.id}
        elif active_sub and active_sub.status in _INACTIVE_STATUSES:
            expected_tier = "free"
            extra = {"stripe_subscription_id": None}
        else:
            # No subscriptions at all — should be free.
            expected_tier = "free"
            extra = {"stripe_subscription_id": None}

        if profile.get("tier") != expected_tier:
            log.warning(
                "stripe_sync: drift detected for user %s — local=%s stripe=%s — fixing",
                profile["id"], profile.get("tier"), expected_tier,
            )
            set_user_tier(
                user_id=profile["id"],
                new_tier=expected_tier,
                changed_by="stripe_reconcile",
                reason="hourly reconcile drift",
                source_event_id=active_sub.id if active_sub else None,
                extra_updates=extra,
            )
            fixed += 1

    summary = {"checked": checked, "fixed": fixed, "errors": errors}
    log.info("stripe_sync: reconcile complete %s", summary)
    return summary
