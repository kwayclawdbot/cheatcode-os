-- Prevent duplicate content inserts on retry.
--
-- Applied via Supabase MCP on 2026-04-08.
--
-- Before: if process_video() in curation.py succeeded in INSERT but the
-- network cut before the response reached Railway, the scheduler retry
-- would insert the same YouTube video again. No ON CONFLICT clause meant
-- the DB had no defense — just duplicate rows with different UUIDs.
--
-- This migration:
--   1. Dedupes any existing duplicate (source_platform, external_id) rows,
--      keeping the most recent by created_at.
--   2. Adds a partial unique index so future inserts fail loudly on dupes.
--   3. Backfills ingestion_attempts=0 on any NULL rows so the orphan-
--      picking query (WHERE ingestion_attempts < 5) doesn't miss them.
--
-- Curation code (curation.py::process_video) is updated in the same
-- commit to use .upsert(..., on_conflict="source_platform,external_id")
-- so retries are safely idempotent.

DO $$
DECLARE
    dup_count INT;
BEGIN
    SELECT COUNT(*) INTO dup_count FROM (
        SELECT source_platform, external_id, COUNT(*)
        FROM content
        WHERE source_platform IS NOT NULL AND external_id IS NOT NULL
        GROUP BY source_platform, external_id
        HAVING COUNT(*) > 1
    ) d;

    IF dup_count > 0 THEN
        RAISE NOTICE 'Found % duplicate groups — keeping newest, deleting older', dup_count;
        DELETE FROM content
        WHERE id IN (
            SELECT id FROM (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY source_platform, external_id
                           ORDER BY created_at DESC NULLS LAST, id DESC
                       ) AS rn
                FROM content
                WHERE source_platform IS NOT NULL AND external_id IS NOT NULL
            ) ranked
            WHERE rn > 1
        );
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_content_platform_external
    ON content(source_platform, external_id)
    WHERE source_platform IS NOT NULL AND external_id IS NOT NULL;

UPDATE content
   SET ingestion_attempts = 0
 WHERE ingestion_attempts IS NULL;
