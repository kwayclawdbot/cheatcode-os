-- Phase B of the production rebuild (2026-04-08, applied via Supabase MCP):
--   1. Enable RLS on every public-data table that was wide-open via anon key
--   2. Create scheduler_runs table for job telemetry (used by Phase D)
--   3. Add missing indexes on hot query paths
--
-- RLS model for public-data tables (creators, tickers, themes, predictions,
-- radar_snapshots, content_tickers, kb_chunks):
--   - Anyone (authenticated or anon) can READ
--   - Only service_role can WRITE
-- This matches the existing PostgREST behavior where these tables were
-- readable via the anon key, but locks down writes which were previously
-- possible.
--
-- curation_queue is internal-only: service_role for everything.

-- ── 1. RLS on public-read tables ────────────────────────────────────────────

ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS creators_public_read ON creators;
CREATE POLICY creators_public_read ON creators
    FOR SELECT USING (true);
DROP POLICY IF EXISTS creators_service_write ON creators;
CREATE POLICY creators_service_write ON creators
    FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE tickers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tickers_public_read ON tickers;
CREATE POLICY tickers_public_read ON tickers
    FOR SELECT USING (true);
DROP POLICY IF EXISTS tickers_service_write ON tickers;
CREATE POLICY tickers_service_write ON tickers
    FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS themes_public_read ON themes;
CREATE POLICY themes_public_read ON themes
    FOR SELECT USING (true);
DROP POLICY IF EXISTS themes_service_write ON themes;
CREATE POLICY themes_service_write ON themes
    FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS predictions_public_read ON predictions;
CREATE POLICY predictions_public_read ON predictions
    FOR SELECT USING (true);
DROP POLICY IF EXISTS predictions_service_write ON predictions;
CREATE POLICY predictions_service_write ON predictions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE radar_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS radar_public_read ON radar_snapshots;
CREATE POLICY radar_public_read ON radar_snapshots
    FOR SELECT USING (true);
DROP POLICY IF EXISTS radar_service_write ON radar_snapshots;
CREATE POLICY radar_service_write ON radar_snapshots
    FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE content_tickers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS content_tickers_public_read ON content_tickers;
CREATE POLICY content_tickers_public_read ON content_tickers
    FOR SELECT USING (true);
DROP POLICY IF EXISTS content_tickers_service_write ON content_tickers;
CREATE POLICY content_tickers_service_write ON content_tickers
    FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE kb_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kb_chunks_public_read ON kb_chunks;
CREATE POLICY kb_chunks_public_read ON kb_chunks
    FOR SELECT USING (true);
DROP POLICY IF EXISTS kb_chunks_service_write ON kb_chunks;
CREATE POLICY kb_chunks_service_write ON kb_chunks
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 2. Internal-only table: curation_queue ──────────────────────────────────

ALTER TABLE curation_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS curation_queue_service_only ON curation_queue;
CREATE POLICY curation_queue_service_only ON curation_queue
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 3. Scheduler job telemetry ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scheduler_runs (
    id BIGSERIAL PRIMARY KEY,
    job_id TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'succeeded', 'failed')),
    duration_seconds NUMERIC(10, 3),
    result_summary JSONB,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_scheduler_runs_job_recent
    ON scheduler_runs(job_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_scheduler_runs_failed
    ON scheduler_runs(started_at DESC)
    WHERE status = 'failed';

ALTER TABLE scheduler_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS scheduler_runs_service_only ON scheduler_runs;
CREATE POLICY scheduler_runs_service_only ON scheduler_runs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 4. Missing indexes on hot query paths ───────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_content_tickers_content_id
    ON content_tickers(content_id);

CREATE INDEX IF NOT EXISTS idx_content_tickers_ticker
    ON content_tickers(ticker);

CREATE INDEX IF NOT EXISTS idx_content_published_date
    ON content(published_at DESC)
    WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_content_creator
    ON content(creator_id)
    WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_tickers_convergence
    ON tickers(convergence_score DESC)
    WHERE convergence_score >= 40;

CREATE INDEX IF NOT EXISTS idx_kai_messages_conv_time
    ON kai_messages(conversation_id, created_at);
