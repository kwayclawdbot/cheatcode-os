export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

// Login URL resolver.
//
// Historical context: originally this built a Manus OAuth portal URL from
// VITE_OAUTH_PORTAL_URL + VITE_APP_ID. CheatCode OS has since migrated to
// Supabase auth, so the in-app `/auth` route IS the login flow. The env
// vars are no longer set in Vercel and any call to the old portal would
// 404 anyway. Falls back to `/auth` cleanly — safe to call at render time
// (previous version threw on missing env vars and crashed the page).
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // Supabase-auth path (current): just point at the in-app auth page.
  if (!oauthPortalUrl || !appId) {
    return "/auth";
  }

  // Legacy Manus OAuth portal path — kept for backwards compat if anyone
  // ever re-sets those env vars in a deployment.
  try {
    const redirectUri = `${window.location.origin}/api/oauth/callback`;
    const state = btoa(redirectUri);
    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");
    return url.toString();
  } catch {
    return "/auth";
  }
};
