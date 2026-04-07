import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { ENV } from "./env";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/**
 * Verify a Supabase JWT by calling the Supabase auth API.
 * Returns the Supabase user sub (UUID) and email on success, null on failure.
 */
async function verifySupabaseToken(
  token: string
): Promise<{ sub: string; email?: string; name?: string } | null> {
  if (!ENV.supabaseUrl || !token) return null;
  try {
    const res = await fetch(`${ENV.supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: ENV.supabaseAnonKey,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.id) return null;
    return {
      sub: data.id as string,
      email: data.email ?? undefined,
      name:
        data.user_metadata?.full_name ??
        data.user_metadata?.name ??
        undefined,
    };
  } catch {
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // 1. Try Supabase Bearer token from Authorization header (primary auth method)
  const authHeader = opts.req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const supabaseUser = await verifySupabaseToken(token);
      if (supabaseUser) {
        // Use Supabase UUID as openId so it's stable across sessions
        const openId = `supabase:${supabaseUser.sub}`;
        let dbUser = await db.getUserByOpenId(openId);
        if (!dbUser) {
          // Auto-provision user on first authenticated request
          await db.upsertUser({
            openId,
            name: supabaseUser.name ?? supabaseUser.email ?? null,
            email: supabaseUser.email ?? null,
            loginMethod: "supabase",
            lastSignedIn: new Date(),
          });
          dbUser = await db.getUserByOpenId(openId);
        } else {
          // Update last sign-in timestamp
          await db.upsertUser({ openId, lastSignedIn: new Date() });
        }
        user = dbUser ?? null;
      }
    } catch (error) {
      console.warn("[Auth] Supabase token verification failed:", error);
    }
  }

  // 2. Fall back to Manus OAuth session cookie if no Supabase token
  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
