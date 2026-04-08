"""Scheduler job telemetry.

Wraps each APScheduler job so every run records its start/end/status/duration
to the `scheduler_runs` table (see migration 008). Previously, job failures
were logged to stdout and silently moved on — you'd find out content stopped
flowing 3 days later when a user complained. Now every run is queryable via
the admin endpoint GET /api/v1/admin/runs.

Usage:
    from app.core.telemetry import with_telemetry

    scheduler.add_job(
        with_telemetry(run_curation_cycle, "curation"),
        "cron", hour=6, minute=0, id="curation",
    )

The wrapper is transparent: the original function's return value becomes
the `result_summary` JSONB column (truncated if huge). Exceptions are caught,
logged, persisted, AND re-raised so APScheduler still sees the failure and
its own retry/restart policy can kick in.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from functools import wraps
from typing import Any, Awaitable, Callable

from app.core.supabase import get_supabase

log = logging.getLogger("telemetry")

# Result payloads above this size are truncated before being stored in the
# scheduler_runs.result_summary JSONB column to avoid bloating the table.
_MAX_RESULT_BYTES = 10 * 1024  # 10 KB


def _serialize_result(result: Any) -> dict | None:
    """Best-effort conversion of a job result into a JSONB-safe payload."""
    if result is None:
        return None
    try:
        if isinstance(result, dict):
            payload = result
        elif isinstance(result, (list, tuple)):
            payload = {"items": list(result), "count": len(result)}
        elif isinstance(result, (int, float, str, bool)):
            payload = {"value": result}
        else:
            payload = {"repr": repr(result)[:500]}

        encoded = json.dumps(payload, default=str)
        if len(encoded) > _MAX_RESULT_BYTES:
            return {"truncated": True, "preview": encoded[:_MAX_RESULT_BYTES]}
        return payload
    except (TypeError, ValueError):
        return {"unserializable": True, "repr": repr(result)[:500]}


def with_telemetry(
    fn: Callable[..., Awaitable[Any]],
    job_id: str,
) -> Callable[..., Awaitable[Any]]:
    """Wrap an async scheduler job so every run lands in scheduler_runs."""

    @wraps(fn)
    async def wrapped(*args, **kwargs):
        db = get_supabase()
        started = datetime.now(timezone.utc)
        run_row_id: int | None = None

        # Insert a "running" row first so a crash mid-job is still visible.
        try:
            ins = db.table("scheduler_runs").insert({
                "job_id": job_id,
                "started_at": started.isoformat(),
                "status": "running",
            }).execute()
            if ins.data:
                run_row_id = ins.data[0]["id"]
        except Exception as e:
            # If telemetry insert itself fails, don't break the job — just log.
            log.error("telemetry insert failed for job %s: %s", job_id, e)

        try:
            result = await fn(*args, **kwargs)
        except Exception as e:
            finished = datetime.now(timezone.utc)
            duration = (finished - started).total_seconds()
            log.error(
                "scheduler job %s FAILED after %.2fs: %s",
                job_id, duration, e, exc_info=True,
            )
            if run_row_id is not None:
                try:
                    db.table("scheduler_runs").update({
                        "status": "failed",
                        "completed_at": finished.isoformat(),
                        "duration_seconds": round(duration, 3),
                        "error_message": f"{type(e).__name__}: {str(e)[:1000]}",
                    }).eq("id", run_row_id).execute()
                except Exception as tel_e:
                    log.error("telemetry update failed for job %s: %s", job_id, tel_e)
            raise

        finished = datetime.now(timezone.utc)
        duration = (finished - started).total_seconds()
        log.info("scheduler job %s succeeded in %.2fs", job_id, duration)

        if run_row_id is not None:
            try:
                db.table("scheduler_runs").update({
                    "status": "succeeded",
                    "completed_at": finished.isoformat(),
                    "duration_seconds": round(duration, 3),
                    "result_summary": _serialize_result(result),
                }).eq("id", run_row_id).execute()
            except Exception as e:
                log.error("telemetry update failed for job %s: %s", job_id, e)

        return result

    return wrapped
