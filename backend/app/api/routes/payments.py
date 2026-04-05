"""Stripe payments — subscription management."""

from fastapi import APIRouter, Depends, HTTPException, Request
import stripe
from app.core.config import get_settings
from app.core.auth import require_user
from app.core.supabase import get_supabase, maybe_one

router = APIRouter(prefix="/payments", tags=["payments"])


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
        raise HTTPException(500, "Stripe price not configured")

    # Get or create Stripe customer
    profile = db.table("profiles").select("stripe_customer_id, email").eq("id", user["id"]).single().execute()
    customer_id = profile.data.get("stripe_customer_id")

    if not customer_id:
        customer = stripe.Customer.create(
            email=profile.data.get("email") or user.get("email"),
            metadata={"user_id": user["id"]},
        )
        customer_id = customer.id
        db.table("profiles").update({"stripe_customer_id": customer_id}).eq("id", user["id"]).execute()

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url="https://cheatcode.com/welcome?session_id={CHECKOUT_SESSION_ID}",
        cancel_url="https://cheatcode.com/pricing",
        metadata={"user_id": user["id"], "tier": tier},
    )

    return {"url": session.url}


@router.post("/portal")
async def customer_portal(user: dict = Depends(require_user)):
    """Redirect to Stripe billing portal."""
    s = get_settings()
    stripe.api_key = s.stripe_secret_key
    db = get_supabase()

    profile = db.table("profiles").select("stripe_customer_id").eq("id", user["id"]).single().execute()
    customer_id = profile.data.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(400, "No billing account")

    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url="https://cheatcode.com/settings",
    )
    return {"url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events."""
    s = get_settings()
    stripe.api_key = s.stripe_secret_key
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, s.stripe_webhook_secret)
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(400, "Invalid webhook")

    db = get_supabase()

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("user_id")
        tier = session.get("metadata", {}).get("tier", "pro")
        subscription_id = session.get("subscription")

        if user_id:
            db.table("profiles").update({
                "tier": tier,
                "stripe_subscription_id": subscription_id,
            }).eq("id", user_id).execute()

    elif event["type"] in ("customer.subscription.deleted", "customer.subscription.paused"):
        subscription = event["data"]["object"]
        customer_id = subscription.get("customer")

        # Find user by stripe customer ID
        profile = maybe_one(db.table("profiles").select("id").eq("stripe_customer_id", customer_id))
        if profile.data:
            db.table("profiles").update({
                "tier": "free",
                "stripe_subscription_id": None,
            }).eq("id", profile.data["id"]).execute()

    elif event["type"] == "customer.subscription.updated":
        subscription = event["data"]["object"]
        customer_id = subscription.get("customer")
        status = subscription.get("status")

        if status in ("past_due", "unpaid", "canceled"):
            profile = maybe_one(db.table("profiles").select("id").eq("stripe_customer_id", customer_id))
            if profile.data:
                db.table("profiles").update({"tier": "free"}).eq("id", profile.data["id"]).execute()

    return {"ok": True}
