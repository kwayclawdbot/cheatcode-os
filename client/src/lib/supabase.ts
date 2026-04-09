import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Vite bakes env vars at build time. If either is missing in the build env
// (Vercel dashboard) the bundle ships with `undefined` here and createClient
// would synchronously throw on first import — that was the white-screen bug
// of 2026-04-08. Throw a clear, attributable error instead.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "[Supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set at build time. " +
      "Add them in the Vercel dashboard → Settings → Environment Variables and redeploy.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    name?: string;
  };
};
