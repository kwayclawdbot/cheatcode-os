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

import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

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
