/**
 * Tests for the videoComments tRPC router.
 * Covers: list (public), post (protected), delete (ownership + admin), like (protected).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getVideoComments: vi.fn().mockResolvedValue([
    {
      id: 1,
      videoId: "abc123",
      userId: 42,
      username: "TraderJoe",
      avatarInitials: "TJ",
      avatarColor: "#12B76A",
      body: "Great breakdown of the setup!",
      replyToId: null,
      likeCount: 3,
      createdAt: new Date("2026-04-07T10:00:00Z"),
    },
  ]),
  saveVideoComment: vi.fn().mockImplementation(async (comment) => ({
    id: 99,
    ...comment,
    createdAt: new Date(),
  })),
  getVideoCommentById: vi.fn().mockImplementation(async (commentId: number) => {
    if (commentId === 1) {
      return {
        id: 1,
        videoId: "abc123",
        userId: 42,
        username: "TraderJoe",
        avatarInitials: "TJ",
        avatarColor: "#12B76A",
        body: "Great breakdown!",
        replyToId: null,
        likeCount: 3,
        createdAt: new Date(),
      };
    }
    return null;
  }),
  deleteVideoComment: vi.fn().mockResolvedValue(undefined),
  likeVideoComment: vi.fn().mockResolvedValue(4),
  // Other db exports used by other routers
  getUserByOpenId: vi.fn().mockResolvedValue(null),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getChatHistory: vi.fn().mockResolvedValue([]),
  saveChatMessage: vi.fn().mockResolvedValue(null),
  getWatchlist: vi.fn().mockResolvedValue([]),
  setWatchlist: vi.fn().mockResolvedValue(undefined),
  getVideoCommentById: vi.fn().mockImplementation(async (id: number) =>
    id === 1
      ? { id: 1, videoId: "abc123", userId: 42, username: "TraderJoe", avatarInitials: "TJ", avatarColor: "#12B76A", body: "Great!", replyToId: null, likeCount: 3, createdAt: new Date() }
      : null
  ),
}));

// ─── Mock ENV ─────────────────────────────────────────────────────────────────
vi.mock("./_core/env", () => ({
  ENV: {
    jwtSecret: "test-secret",
    oauthServerUrl: "https://api.manus.im",
    ownerOpenId: "owner-open-id",
    youtubeApiKey: "test-yt-key",
    eohdApiKey: "test-eod-key",
    railwayApiUrl: "https://railway.test",
    supabaseUrl: "https://test.supabase.co",
    supabaseAnonKey: "test-anon-key",
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeUser(id: number, role: "user" | "admin" = "user") {
  return {
    id,
    openId: `open-id-${id}`,
    name: `User ${id}`,
    email: `user${id}@test.com`,
    role,
    loginMethod: "supabase",
    lastSignedIn: new Date(),
    createdAt: new Date(),
  };
}

function authedCaller(userId: number, role: "user" | "admin" = "user") {
  return appRouter.createCaller({ user: makeUser(userId, role) } as any);
}

function publicCaller() {
  return appRouter.createCaller({ user: null } as any);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("videoComments.list", () => {
  it("returns comments for a video without auth", async () => {
    const caller = publicCaller();
    const result = await caller.videoComments.list({ videoId: "abc123" });
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].videoId).toBe("abc123");
  });
});

describe("videoComments.post", () => {
  it("allows authenticated users to post a comment", async () => {
    const caller = authedCaller(42);
    const result = await caller.videoComments.post({
      videoId: "abc123",
      body: "Solid analysis, watching this setup closely.",
    });
    expect(result.id).toBe(99);
    expect(result.body).toBe("Solid analysis, watching this setup closely.");
    expect(result.userId).toBe(42);
  });

  it("rejects unauthenticated comment post", async () => {
    const caller = publicCaller();
    await expect(
      caller.videoComments.post({ videoId: "abc123", body: "Hello" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects empty body", async () => {
    const caller = authedCaller(42);
    await expect(
      caller.videoComments.post({ videoId: "abc123", body: "   " })
    ).rejects.toBeDefined();
  });
});

describe("videoComments.delete", () => {
  it("allows comment owner to delete their own comment", async () => {
    // userId 42 owns comment id 1
    const caller = authedCaller(42);
    const result = await caller.videoComments.delete({ commentId: 1 });
    expect(result.success).toBe(true);
  });

  it("rejects deletion by non-owner non-admin", async () => {
    // userId 99 does NOT own comment id 1 (owned by 42)
    const caller = authedCaller(99);
    await expect(
      caller.videoComments.delete({ commentId: 1 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows admin to delete any comment", async () => {
    const caller = authedCaller(99, "admin");
    const result = await caller.videoComments.delete({ commentId: 1 });
    expect(result.success).toBe(true);
  });

  it("throws NOT_FOUND for non-existent comment", async () => {
    const caller = authedCaller(42);
    await expect(
      caller.videoComments.delete({ commentId: 9999 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("videoComments.like", () => {
  it("allows authenticated users to like a comment", async () => {
    const caller = authedCaller(42);
    const result = await caller.videoComments.like({ commentId: 1 });
    expect(result.likeCount).toBe(4);
  });

  it("rejects unauthenticated like", async () => {
    const caller = publicCaller();
    await expect(
      caller.videoComments.like({ commentId: 1 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
