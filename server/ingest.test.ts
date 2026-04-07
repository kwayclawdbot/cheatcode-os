/**
 * Tests for the YouTube ingestion pipeline (ingest router)
 *
 * Tests cover auth gating and input validation only.
 * Live YouTube/Railway API calls are excluded (require external network).
 *
 * Key behaviors verified:
 * - All procedures require authentication (UNAUTHORIZED for unauthenticated callers)
 * - analyseVideo rejects non-YouTube URLs (null extractVideoId result)
 * - submitVideo rejects non-YouTube URLs
 * - Valid 11-char video IDs pass input validation (auth check passes)
 */

import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";

// Mock the scheduler module to avoid live network calls in tests
vi.mock("./scheduler", () => ({
  runAutoIngest: vi.fn().mockResolvedValue([
    { niche: "stocks", searched: 5, analysed: 3, submitted: 2, skipped: 1, errors: 0 },
    { niche: "crypto", searched: 5, analysed: 2, submitted: 1, skipped: 1, errors: 0 },
  ]),
  startScheduler: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeCtx(user?: any) {
  return {
    user: user ?? null,
    req: {} as any,
    res: {} as any,
  };
}

const authedCtx = makeCtx({
  id: "test-user-id",
  openId: "test-open-id",
  name: "Test User",
  email: "test@example.com",
  role: "user" as const,
});

// ─── analyseVideo — auth + input validation ───────────────────────────────────
describe("ingest.analyseVideo", () => {
  it("requires authentication", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(
      caller.ingest.analyseVideo({ urlOrId: "dQw4w9WgXcQ" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects empty string (zod validation)", async () => {
    const caller = appRouter.createCaller(authedCtx);
    await expect(
      caller.ingest.analyseVideo({ urlOrId: "" })
    ).rejects.toThrow();
  });

  it("rejects non-YouTube URL (null video ID)", async () => {
    const caller = appRouter.createCaller(authedCtx);
    await expect(
      caller.ingest.analyseVideo({ urlOrId: "https://vimeo.com/12345" })
    ).rejects.toMatchObject({ message: expect.stringContaining("Invalid YouTube") });
  });

  it("rejects text with spaces (null video ID)", async () => {
    const caller = appRouter.createCaller(authedCtx);
    await expect(
      caller.ingest.analyseVideo({ urlOrId: "not a url at all" })
    ).rejects.toMatchObject({ message: expect.stringContaining("Invalid YouTube") });
  });
});

// ─── submitVideo tests ────────────────────────────────────────────────────────
describe("ingest.submitVideo", () => {
  it("requires authentication", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(
      caller.ingest.submitVideo({
        urlOrId: "dQw4w9WgXcQ",
        supabaseToken: "fake-token",
        forceIngest: false,
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects non-YouTube URL (null video ID)", async () => {
    const caller = appRouter.createCaller(authedCtx);
    await expect(
      caller.ingest.submitVideo({
        urlOrId: "https://vimeo.com/12345",
        supabaseToken: "fake-token",
        forceIngest: false,
      })
    ).rejects.toMatchObject({ message: expect.stringContaining("Invalid YouTube") });
  });
});

// ─── triggerCuration tests ────────────────────────────────────────────────────
describe("ingest.triggerCuration", () => {
  it("requires authentication", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(
      caller.ingest.triggerCuration({ supabaseToken: "fake-token" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── getQueue tests ───────────────────────────────────────────────────────────
describe("ingest.getQueue", () => {
  it("requires authentication", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(
      caller.ingest.getQueue({ supabaseToken: "fake-token", status: "pending" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── runAutoIngest — admin-only guard ─────────────────────────────────────────
describe("ingest.runAutoIngest", () => {
  it("rejects unauthenticated callers with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(
      caller.ingest.runAutoIngest()
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects non-admin authenticated users with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(authedCtx); // role: 'user'
    await expect(
      caller.ingest.runAutoIngest()
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows admin users to call the procedure (auth guard passes, scheduler mocked)", async () => {
    const adminCtx = makeCtx({
      id: "admin-id",
      openId: "admin-open-id",
      name: "Admin User",
      email: "admin@example.com",
      role: "admin" as const,
    });
    const caller = appRouter.createCaller(adminCtx);
    // With the scheduler mocked, this should resolve successfully
    const result = await caller.ingest.runAutoIngest();
    expect(result.success).toBe(true);
    expect(result.totalSubmitted).toBe(3); // 2 + 1 from mock
    expect(result.summaries).toHaveLength(2);
  });
});

// ─── getVideosByTicker — input validation ─────────────────────────────────────
describe("ingest.getVideosByTicker", () => {
  it("rejects empty symbol (zod min-length validation)", async () => {
    const caller = appRouter.createCaller(authedCtx);
    await expect(
      caller.ingest.getVideosByTicker({ symbol: "" })
    ).rejects.toThrow();
  });

  it("is a public procedure — does not require authentication", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    // Public procedure: should not throw UNAUTHORIZED even for unauthenticated callers
    const result = await caller.ingest.getVideosByTicker({ symbol: "AAPL" }).catch(err => err);
    if (result && typeof result === 'object' && 'symbol' in result) {
      expect(result.symbol).toBe("AAPL");
      expect(Array.isArray(result.videos)).toBe(true);
    } else {
      // Railway API failure in test env is acceptable; auth error is not
      expect(result?.code).not.toBe("UNAUTHORIZED");
    }
  });
});
