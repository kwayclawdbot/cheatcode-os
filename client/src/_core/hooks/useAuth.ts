/**
 * useAuth — thin wrapper over the real Supabase auth hook.
 *
 * The previous implementation called `trpc.auth.me.useQuery()` which
 * hit the non-existent tRPC server at cheatcode-os-trpc-production.
 * On cold start the query threw during first render and broke React
 * hydration (white screen). This replacement delegates to the real
 * Supabase-based auth hook that the rest of the app already uses
 * (`client/src/hooks/useSupabaseAuth.ts`), returning the same shape
 * consumers expect.
 */
import { useCallback } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(_options?: UseAuthOptions) {
  const sb = useSupabaseAuth();

  const logout = useCallback(async () => {
    try {
      await sb.signOut();
    } catch {
      /* swallow — never let logout errors crash the app */
    }
  }, [sb]);

  return {
    user: sb.user ?? null,
    loading: sb.loading,
    error: null,
    isAuthenticated: Boolean(sb.user),
    refresh: async () => {},
    logout,
  };
}
