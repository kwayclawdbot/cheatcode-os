"""Database migration runner.

Runs SQL files from migrations/ in alphabetical order against the Supabase
PostgreSQL database. Tracks applied migrations in a `schema_migrations` table
so re-deploys are idempotent.

Requires DATABASE_URL env var (direct postgres connection, not the Supabase
REST URL). Grab it from Supabase Dashboard → Project Settings → Database →
Connection string → URI (use "Session" mode for migrations, not Transaction).

Called from lifespan() on service startup, BEFORE the scheduler runs. If
migrations fail, the service refuses to start (fail-loud) — better to catch
a broken deploy on Railway than serve a service that will crash on first
database write.
"""

import logging
import os
from pathlib import Path

import psycopg

log = logging.getLogger("migrations")

# Location of migrations/ — this file lives at backend/app/core/migrations.py,
# so backend_root = this_file.parents[2] and migrations_dir = backend_root/migrations.
# Inside the Docker image, migrations are copied to /app/migrations (same relative
# layout since the Dockerfile's WORKDIR is /app and it does `COPY app/ app/`).
MIGRATIONS_DIR = Path(__file__).resolve().parents[2] / "migrations"


def _ensure_tracking_table(conn: psycopg.Connection) -> None:
    """Create schema_migrations table if it doesn't exist."""
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                filename TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """)
    conn.commit()


def _applied_migrations(conn: psycopg.Connection) -> set[str]:
    """Return the set of migration filenames already applied."""
    with conn.cursor() as cur:
        cur.execute("SELECT filename FROM schema_migrations")
        return {row[0] for row in cur.fetchall()}


def _pending_migrations(migrations_dir: Path, applied: set[str]) -> list[Path]:
    """Return sorted list of *.sql files not yet in the applied set."""
    if not migrations_dir.exists():
        log.warning("Migrations directory not found: %s", migrations_dir)
        return []

    all_files = sorted(migrations_dir.glob("*.sql"))
    return [f for f in all_files if f.name not in applied]


def _apply_one(conn: psycopg.Connection, path: Path) -> None:
    """Execute one migration file + record it. All or nothing."""
    sql = path.read_text()
    if not sql.strip():
        log.warning("Empty migration file, skipping: %s", path.name)
        return

    log.info("Applying migration: %s", path.name)
    with conn.cursor() as cur:
        cur.execute(sql)
        cur.execute(
            "INSERT INTO schema_migrations (filename) VALUES (%s) ON CONFLICT DO NOTHING",
            (path.name,),
        )
    conn.commit()
    log.info("Applied: %s", path.name)


def run_migrations(database_url: str | None = None, migrations_dir: Path | None = None) -> dict:
    """Apply all pending migrations. Idempotent.

    Args:
        database_url: Postgres connection string. Defaults to DATABASE_URL env var.
        migrations_dir: Override path to migrations/. Defaults to repo migrations/.

    Returns:
        {"applied": [filenames], "skipped": int, "total": int}

    Raises:
        RuntimeError: If DATABASE_URL is missing or connection fails. Fails
            loudly so Railway marks the deploy as broken instead of starting
            a service that will crash on first write.
    """
    url = database_url or os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "DATABASE_URL env var is required for migrations. "
            "Grab it from Supabase Dashboard → Project Settings → Database → "
            "Connection string → URI (Session mode) and add it to Railway env vars."
        )

    mig_dir = migrations_dir or MIGRATIONS_DIR
    log.info("Running migrations from %s", mig_dir)

    with psycopg.connect(url, autocommit=False) as conn:
        _ensure_tracking_table(conn)
        applied = _applied_migrations(conn)
        pending = _pending_migrations(mig_dir, applied)

        if not pending:
            log.info("Migrations up to date (%d already applied)", len(applied))
            return {"applied": [], "skipped": len(applied), "total": len(applied)}

        log.info("Found %d pending migration(s): %s", len(pending), [p.name for p in pending])

        applied_now = []
        for path in pending:
            _apply_one(conn, path)
            applied_now.append(path.name)

        total = len(applied) + len(applied_now)
        log.info("Migrations complete: %d applied now, %d total", len(applied_now), total)
        return {
            "applied": applied_now,
            "skipped": len(applied),
            "total": total,
        }
