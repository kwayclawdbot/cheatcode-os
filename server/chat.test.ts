/**
 * Tests for the chat tRPC router.
 *
 * Verifies:
 * 1. chat.history returns messages for a channel (public procedure)
 * 2. chat.send requires authentication (protectedProcedure)
 * 3. chat.send persists a message when user is authenticated
 */

import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getChatHistory: vi.fn(async (channelId: string) => {
    if (channelId === "stocks-general") {
      return [
        {
          id: 1,
          channelId: "stocks-general",
          userId: 42,
          username: "TraderKai",
          avatarInitials: "TK",
          avatarColor: "#4DC820",
          badge: "Pro",
          body: "NVDA breaking out 👀",
          createdAt: new Date("2024-01-01T09:32:00Z"),
        },
      ];
    }
    return [];
  }),
  saveChatMessage: vi.fn(async () => ({ insertId: 1 })),
  // Other db exports used by other routers
  getUserByOpenId: vi.fn(async () => null),
  upsertUser: vi.fn(async () => {}),
  getWatchlist: vi.fn(async () => []),
  setWatchlist: vi.fn(async () => {}),
}));

// ─── Context helpers ──────────────────────────────────────────────────────────
function makeCtx(user: TrpcContext["user"] | null = null): TrpcContext {
  return {
    user: user as TrpcContext["user"],
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const mockUser: NonNullable<TrpcContext["user"]> = {
  id: 42,
  openId: "supabase:test-uuid",
  name: "Test User",
  email: "test@example.com",
  role: "user",
  loginMethod: "supabase",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

// ─── chat.history (public) ────────────────────────────────────────────────────
describe("chat.history", () => {
  it("returns messages for a valid channel", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.chat.history({ channelId: "stocks-general" });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0]).toMatchObject({
      channelId: "stocks-general",
      username: "TraderKai",
      body: "NVDA breaking out 👀",
    });
  });

  it("returns empty array for unknown channel", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.chat.history({ channelId: "unknown-channel" });
    expect(result).toEqual([]);
  });

  it("rejects empty channelId", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.chat.history({ channelId: "" })
    ).rejects.toThrow();
  });
});

// ─── chat.send (protected) ────────────────────────────────────────────────────
describe("chat.send", () => {
  it("throws UNAUTHORIZED when user is not authenticated", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(
      caller.chat.send({
        channelId: "stocks-general",
        body: "Hello world",
        username: "TestUser",
        avatarInitials: "TU",
        avatarColor: "#4DC820",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("persists message when user is authenticated", async () => {
    const caller = appRouter.createCaller(makeCtx(mockUser));
    const result = await caller.chat.send({
      channelId: "stocks-general",
      body: "NVDA to the moon!",
      username: "TestUser",
      avatarInitials: "TU",
      avatarColor: "#4DC820",
      badge: "Pro",
    });
    expect(result).toEqual({ ok: true });
  });

  it("rejects messages exceeding 1000 characters", async () => {
    const caller = appRouter.createCaller(makeCtx(mockUser));
    await expect(
      caller.chat.send({
        channelId: "stocks-general",
        body: "x".repeat(1001),
        username: "TestUser",
        avatarInitials: "TU",
        avatarColor: "#4DC820",
      })
    ).rejects.toThrow();
  });
});
