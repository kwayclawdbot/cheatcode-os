-- 014_kai_link_auth_user_phone_fallback.sql
-- R4 — Add phone fallback to kai_link_auth_user().
--
-- The original linker (in production Supabase, sibling to is_kai_subscriber)
-- matches auth.users.email → public.users.email. Today only 3 of 110 active
-- SMS subscribers are linked; many never gave an email during onboarding
-- (phone-only signup) OR signed up to the web with a different email than
-- the SMS one.
--
-- This version tries email first (original behavior) and falls back to phone
-- match by normalized digits — so a Supabase Phone Auth signup OR a manually
-- entered phone in the claim flow will also resolve to the SMS user row.
--
-- Additive: function is replaced via CREATE OR REPLACE, callers unchanged.
-- The `kai_link_auth_user()` shape stays `() -> boolean`.
--
-- Applied: <date> via Supabase MCP. Rollback at bottom.

CREATE OR REPLACE FUNCTION public.kai_link_auth_user()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
declare
  v_uid     uuid := auth.uid();
  v_email   text;
  v_phone   text;
  v_updated int := 0;
begin
  if v_uid is null then
    return false;
  end if;

  select email, phone into v_email, v_phone
  from auth.users where id = v_uid;

  -- (1) Email match — original behavior.
  if v_email is not null then
    update public.users
      set auth_user_id = v_uid
      where lower(email) = lower(v_email)
        and auth_user_id is null;
    get diagnostics v_updated = row_count;
    if v_updated > 0 then
      return true;
    end if;
  end if;

  -- (2) Phone fallback — normalize to digits + leading '+', then exact-match.
  -- auth.users.phone is populated by Supabase Phone Auth; we also accept it
  -- via the claim page even when the auth provider is email-only.
  if v_phone is not null and v_phone <> '' then
    update public.users
      set auth_user_id = v_uid
      where regexp_replace(coalesce(phone, ''), '[^0-9+]', '', 'g')
          = regexp_replace(v_phone, '[^0-9+]', '', 'g')
        and auth_user_id is null;
    get diagnostics v_updated = row_count;
    if v_updated > 0 then
      return true;
    end if;
  end if;

  return false;
end;
$function$;

COMMENT ON FUNCTION public.kai_link_auth_user() IS
  'Bridges auth.users.id → public.users.auth_user_id by email match, falling '
  'back to phone (digit-normalized) so phone-only SMS users can claim a web '
  'account without an email match.';

-- ── Rollback ────────────────────────────────────────────────────────────
-- (revert to email-only version)
-- CREATE OR REPLACE FUNCTION public.kai_link_auth_user()
-- RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
-- SET search_path TO 'public', 'auth' AS $$
-- declare v_uid uuid := auth.uid(); v_email text; v_updated int;
-- begin
--   if v_uid is null then return false; end if;
--   select email into v_email from auth.users where id = v_uid;
--   if v_email is null then return false; end if;
--   update public.users set auth_user_id = v_uid
--     where lower(email) = lower(v_email) and auth_user_id is null;
--   get diagnostics v_updated = row_count;
--   return v_updated > 0;
-- end; $$;
