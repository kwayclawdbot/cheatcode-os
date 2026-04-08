-- Isolated vault table for cheatcode-os ingestion output.
--
-- Applied via Supabase MCP on 2026-04-08.
--
-- Problem: the existing `vault_store` table is being used by another
-- personal-vault sync process to mirror the user's entire Obsidian vault
-- (02 - Agents, Kai, 03 - Infrastructure, 07 - Daily Notes, etc.) —
-- unrelated to cheatcode-os. An audit showed 317 rows in vault_store,
-- ZERO of which were under "06 - Knowledge Base/CheatCode OS/...".
--
-- cheatcode-os writing to the same table would either collide with that
-- personal sync or pollute the user's vault with website ingestion output.
--
-- Solution: a dedicated `cheatcode_vault` table with the same (path, content,
-- updated_at) shape but completely isolated from `vault_store`. The backend
-- ingestion engine writes HERE. The scripts/vault_sync.py sync agent on
-- the user's Mac reads from HERE.
--
-- Scope enforcement: a CHECK constraint on cheatcode_vault.path requires
-- every row to start with "06 - Knowledge Base/CheatCode OS/". Any bug
-- that tries to write outside the cheatcode-os scope fails loudly at the
-- DB level instead of silently polluting.

CREATE TABLE IF NOT EXISTS cheatcode_vault (
    path TEXT PRIMARY KEY
        CHECK (path LIKE '06 - Knowledge Base/CheatCode OS/%'),
    content TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cheatcode_vault_updated
    ON cheatcode_vault(updated_at DESC);

-- RLS: service role only. This table is internal — never exposed via the
-- anon key. The backend writes via service role; the sync agent reads via
-- service role (credentials in scripts/.env, not committed).
ALTER TABLE cheatcode_vault ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cheatcode_vault_service_only ON cheatcode_vault;
CREATE POLICY cheatcode_vault_service_only ON cheatcode_vault
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);
