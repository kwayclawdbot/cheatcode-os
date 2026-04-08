-- Value Score: user-facing "is this video worth watching" metric (0-100)
-- Separate from relevance_score (internal, market-timing) and
-- convergence_score (ticker intelligence, not video-related).
--
-- Stable across time (educational content scores the same today as next month)
-- with 6 components: creator quality, insight density, transcript density,
-- skill clarity, engagement quality, and recency (with educational bypass).

ALTER TABLE content
  ADD COLUMN IF NOT EXISTS value_score INTEGER
    CHECK (value_score IS NULL OR (value_score >= 0 AND value_score <= 100)),
  ADD COLUMN IF NOT EXISTS value_score_components JSONB,
  ADD COLUMN IF NOT EXISTS view_count BIGINT,
  ADD COLUMN IF NOT EXISTS like_count BIGINT,
  ADD COLUMN IF NOT EXISTS word_count INTEGER;

-- Feed ranking + "top rated" discovery
CREATE INDEX IF NOT EXISTS idx_content_value_score
  ON content(value_score DESC NULLS LAST)
  WHERE is_published = true;
