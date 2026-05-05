// useKaiEntitlement — gates K.AI module access at the app layer
// (RLS gates it again at the database layer; this hook just controls UX).

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { checkKaiEntitlement } from "@/lib/kai/queries";

export type KaiEntitlementState = "loading" | "allowed" | "denied" | "unauthenticated";

export function useKaiEntitlement(): KaiEntitlementState {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [state, setState] = useState<KaiEntitlementState>("loading");

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setState("unauthenticated");
      return;
    }
    let cancelled = false;
    setState("loading");
    checkKaiEntitlement()
      .then((ok) => {
        if (!cancelled) setState(ok ? "allowed" : "denied");
      })
      .catch(() => {
        if (!cancelled) setState("denied");
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated]);

  return state;
}
