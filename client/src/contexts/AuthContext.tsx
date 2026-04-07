import { createContext, useContext, type ReactNode } from "react";
import { useSupabaseAuth, type AuthState } from "@/hooks/useSupabaseAuth";

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useSupabaseAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
