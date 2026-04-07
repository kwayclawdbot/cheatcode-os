import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import type { AuthState } from "@/hooks/useSupabaseAuth";

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
