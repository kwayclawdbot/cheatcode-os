"""Single funnel for every change to profiles.tier.

Use set_user_tier() — never write `profiles.tier` directly. It:

  1. Reads the current tier (so we can record old → new).
  2. Updates profiles.tier (service-role bypasses the protected-column trigger).
  3. Writes a tier_changes audit row.
  4. Returns the updated profile dict.

Used by:
  - admin.py PUT /admin/members/{user_id}/tier        (changed_by="admin:<uuid>")
  - payments.py /webhook (Stripe events)              (changed_by="stripe_webhook")
  - stripe_sync.py reconcile cron                     (changed_by="stripe_reconcile")
"""

import logging

from app.core.supabase import get_supabase, maybe_one

log = logging.getLogger("tier_audit")

VALID_TIERS = ("free", "pro", "elite", "admin")


def set_user_tier(
    user_id: str,
    new_tier: str,
    changed_by: str,
    reason: str | None = None,
    source_event_id: str | None = None,
    extra_updates: dict | None = None,
) -> dict | None:
    """Update profiles.tier and append a tier_changes audit row.

    Returns the updated profile row, or None if the user does not exist.
    Raises ValueError on an invalid tier.
    """
    if new_tier not in VALID_TIERS:
        raise ValueError(f"Invalid tier: {new_tier!r}")

    db = get_supabase()
    current = maybe_one(db.table("profiles").select("id, tier").eq("id", user_id))
    if not current.data:
        log.warning("set_user_tier: profile %s not found (changed_by=%s)", user_id, changed_by)
        return None

    old_tier = current.data.get("tier")
    if old_tier == new_tier and not extra_updates:
        # Idempotent no-op — still log so we can see reconcile pings in the audit
        # log without thrashing profiles.updated_at.
        db.table("tier_changes").insert({
            "user_id": user_id,
            "old_tier": old_tier,
            "new_tier": new_tier,
            "changed_by": changed_by,
            "reason": reason or "noop",
            "source_event_id": source_event_id,
        }).execute()
        return current.data

    update_payload = {"tier": new_tier}
    if extra_updates:
        update_payload.update(extra_updates)

    result = db.table("profiles").update(update_payload).eq("id", user_id).execute()
    if not result.data:
        log.error("set_user_tier: update returned no rows for %s", user_id)
        return None

    db.table("tier_changes").insert({
        "user_id": user_id,
        "old_tier": old_tier,
        "new_tier": new_tier,
        "changed_by": changed_by,
        "reason": reason,
        "source_event_id": source_event_id,
    }).execute()

    log.info(
        "tier_audit: user=%s %s → %s by=%s reason=%s",
        user_id, old_tier, new_tier, changed_by, reason or "-",
    )
    return result.data[0]
