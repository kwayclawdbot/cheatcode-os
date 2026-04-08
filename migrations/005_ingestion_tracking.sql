-- Ingestion lifecycle tracking.
--
-- Before: ingest_content was called inline from process_video in a bare
-- try/except. Failures were logged once and then silently orphaned:
-- content rows with is_published=true but without the "ingested" tag.
-- No visibility into why or how often ingestion failed.
--
-- After: every content row has an explicit ingestion_status that
-- transitions through pending → in_progress → succeeded|failed.
-- Failed rows carry the last error message and an attempt counter.
-- The admin dashboard can surface orphans with one query.

ALTER TABLE content
  ADD COLUMN IF NOT EXISTS ingestion_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (ingestion_status IN ('pending', 'in_progress', 'succeeded', 'failed')),
  ADD COLUMN IF NOT EXISTS ingestion_error TEXT,
  ADD COLUMN IF NOT EXISTS ingestion_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMPTZ;

-- Backfill: rows that already have the legacy "ingested" tag should
-- be treated as succeeded so they don't get reprocessed.
UPDATE content
   SET ingestion_status = 'succeeded',
       ingested_at = COALESCE(updated_at, created_at)
 WHERE tags @> ARRAY['ingested']::text[]
   AND ingestion_status = 'pending';

-- Everything else published but not ingested is pending (no-op since default).

-- Partial index for the hot path: finding work to do
CREATE INDEX IF NOT EXISTS idx_content_ingestion_pending
  ON content(ingestion_status, ingestion_attempts)
  WHERE ingestion_status IN ('pending', 'failed');
