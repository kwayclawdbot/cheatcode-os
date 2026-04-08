"""Stripe payments — subscription management.

⚠️  STRIPE LIVE MODE — real money.
Every change to this file should be minimal, reviewed, and explicitly
logged. Do not add new Stripe API calls without specifying what they do
and why, because they bill real customers.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request
import stripe

from app.core.auth import require_user
from app.core.config import get_settings
from app.core.supabase import get_supabase, maybe_one

log = logging.getLogger("payments")

router = APIRouter(prefix="/payments", tags=["payments"])

# Valid Stripe subscription statuses that should downgrade a user to free tier.
# Docs: https://stripe.com/docs/api/subscriptions/object#subscription_object-status
_DOWNGRADE_STATUSES = {"past_due", "unpaid", "canceled", "incomplete_expired"}


@router.post("/create-checkout")
async def create_checkout_session(
    tier: str,  # "pro" or "elite"
    user: dict = Depends(require_user),
):
    s = get_settings()
    stripe.api_key = s.stripe_secret_key
    db = get_supabase()

    if tier not in ("pro", "elite"):
        raise HTTPException(400, "Invalid tier")

    price_id = s.stripe_pro_price_id if tier == "pro" else s.stripe_elite_price_id
    if not price_id:
        # Elite tier may not be set up yet — this is an expected state, not a bug.
        if tier == "elite":
            raise HTTPException(503, "Elite tier is not yet available. Check back soon.")
        raise HTTPException(500, "Stripe price not configured")

    # Get or create Stripe customer
    profile = maybe_one(
        db.table("profiles").select("stripe_customer_id, email").eq("id", user["id"])
    )
    if not profile.data:
        log.error("create_checkout: profile missing for user %s", user["id"])
        raise HTTPException(404, "Profile not found")

    customer_id = profile.data.get("stripe_customer_id")
    if not customer_id:
        customer = stripe.Customer.create(
            email=profile.data.get("email") or user.get("email"),
            metadata={"user_id": user["id"]},
        )
        customer_id = customer.id
        db.table("profiles").update(
            {"stripe_customer_id": customer_id}
        ).eq("id", user["id"]).execute()
        log.info("create_checkout: created Stripe customer %s for user %s", customer_id, user["id"])

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url="https://cheatcode.com/welcome?session_id={CHECKOUT_SESSION_ID}",
        cancel_url="https://cheatcode.com/pricing",
        metadata={"user_id": user["id"], "tier": tier},
    )
    log.info(
        "create_checkout: session %s created for user %s tier %s",
        session.id, user["id"], tier,
    )

    return {"url": session.url}


@router.post("/portal")
async def customer_portal(user: dict = Depends(require_user)):
    """Redirect to Stripe billing portal."""
    s = get_settings()
    stripe.api_key = s.stripe_secret_key
    db = get_supabase()

    profile = maybe_one(db.table("profiles").select("stripe_customer_id").eq("id", user["id"]))
    if not profile.data:
        raise HTTPException(404, "Profile not found")
    customer_id = profile.data.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(400, "No billing account on file")

    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url="https://cheatcode.com/settings",
    )
    return {"url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events.

    Signature verification is MANDATORY. If the webhook secret env var is
    missing, reject all webhooks — we'd rather drop a real event than
    accept a spoofed one that flips a user's tier to Elite for free.
    """
    s = get_settings()
    if not s.stripe_webhook_secret:
        log.critical(
            "stripe_webhook: STRIPE_WEBHOOK_SECRET is not set — rejecting all webhooks. "
            "Set it in Railway dashboard → Variables. "
            "See https://stripe.com/docs/webhooks/signatures"
        )
        raise HTTPException(500, "Webhook secret not configured")

    stripe.api_key = s.stripe_secret_key
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, s.stripe_webhook_secret)
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        log.warning("stripe_webhook: signature verification failed: %s", e)
        raise HTTPException(400, "Invalid webhook")

    event_type = event["type"]
    event_id = event.get("id", "unknown")
    log.info("stripe_webhook: event_id=%s type=%s", event_id, event_type)

    db = get_supabase()

    if event_type == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("user_id")
        tier = session.get("metadata", {}).get("tier", "pro")
        subscription_id = session.get("subscription")

        if user_id:
            db.table("profiles").update({
                "tier": tier,
                "stripe_subscription_id": subscription_id,
            }).eq("id", user_id).execute()
            log.info(
                "stripe_webhook: upgraded user %s to tier %s (sub=%s)",
                user_id, tier, subscription_id,
            )

    elif event_type in ("customer.subscription.deleted", "customer.subscription.paused"):
        subscription = event["data"]["object"]
        customer_id = subscription.get("customer")

        profile = maybe_one(db.table("profiles").select("id").eq("stripe_customer_id", customer_id))
        if profile.data:
            db.table("profiles").update({
                "tier": "free",
                "stripe_subscription_id": None,
            }).eq("id", profile.data["id"]).execute()
            log.info(
                "stripe_webhook: downgraded user %s to free (customer=%s, event=%s)",
                profile.data["id"], customer_id, event_type,
            )

    elif event_type == "customer.subscription.updated":
        subscription = event["data"]["object"]
        customer_id = subscription.get("customer")
        status = subscription.get("status")

        if status in _DOWNGRADE_STATUSES:
            profile = maybe_one(db.table("profiles").select("id").eq("stripe_customer_id", customer_id))
            if profile.data:
                db.table("profiles").update({"tier": "free"}).eq("id", profile.data["id"]).execute()
                log.info(
                    "stripe_webhook: downgraded user %s to free (status=%s)",
                    profile.data["id"], status,
                )

    return {"ok": True, "event_id": event_id}
