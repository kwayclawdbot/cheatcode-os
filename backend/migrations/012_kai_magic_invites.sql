-- 012_kai_magic_invites.sql
-- One-time magic-link invites for SMS users to claim a web dashboard account.
-- Service-role only — no client-side RLS policies. Tokens are URL-safe random
-- strings generated server-side; presence in this table = user can claim.
--
-- Applied: 2026-05-06 via Supabase MCP

CREATE TABLE public.kai_magic_invites (
  token       text PRIMARY KEY,
  user_id     bigint NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  phone       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  used_ip     text
);

CREATE INDEX idx_kai_magic_invites_user_id ON public.kai_magic_invites(user_id);
CREATE INDEX idx_kai_magic_invites_phone   ON public.kai_magic_invites(phone);

ALTER TABLE public.kai_magic_invites ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.kai_magic_invites IS
  'One-time magic-link invites for SMS users to claim a web dashboard account. Service-role only — no client policies.';
