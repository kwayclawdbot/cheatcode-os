-- Kai usage tracking for per-user monthly budgets + global daily circuit breaker.
--
-- Applied via Supabase MCP on 2026-04-08 (see git commit for details).
-- Kept in version control as schema history / audit trail.
--
-- Every Kai chat turn records token counts + estimated cost. Enforcement
-- happens in app code (backend/app/services/kai_budget.py) before each
-- Anthropic API call:
--   - Free tier: 5 messages/day (existing kai_messages_today counter)
--   - Pro tier:  $15/month per user (kai_pro_monthly_budget_usd env var)
--   - Elite:     $60/month per user (kai_elite_monthly_budget_usd env var)
--   - Global:    $200/day across all users (kai_daily_global_budget_usd)
--
-- Cost is computed from Claude Sonnet pricing at request time:
--   input: $3 per 1M tokens, output: $15 per 1M tokens
-- If Anthropic changes prices, update app/services/kai_budget.py.

CREATE TABLE IF NOT EXISTS kai_usage (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES kai_conversations(id) ON DELETE SET NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL CHECK (input_tokens >= 0),
    output_tokens INTEGER NOT NULL CHECK (output_tokens >= 0),
    cost_usd NUMERIC(10, 6) NOT NULL CHECK (cost_usd >= 0),
    tier TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kai_usage_user_month
    ON kai_usage(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kai_usage_daily_global
    ON kai_usage(created_at DESC);

-- RLS: users can only see their own usage rows, admins via service role
ALTER TABLE kai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kai_usage_self_read ON kai_usage;
CREATE POLICY kai_usage_self_read ON kai_usage
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS kai_usage_service_write ON kai_usage;
CREATE POLICY kai_usage_service_write ON kai_usage
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
