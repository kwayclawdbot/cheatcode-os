/**
 * Validates that EODHD and YouTube API keys are set and functional.
 */
import { describe, it, expect } from "vitest";

describe("API Key Validation", () => {
  it("EODHD_API_KEY is set", () => {
    const key = process.env.EODHD_API_KEY;
    expect(key).toBeTruthy();
    expect(key!.length).toBeGreaterThan(5);
  });

  it("YOUTUBE_API_KEY is set", () => {
    const key = process.env.YOUTUBE_API_KEY;
    expect(key).toBeTruthy();
    expect(key!.length).toBeGreaterThan(5);
  });

  it("RAILWAY_API_URL is set", () => {
    const url = process.env.RAILWAY_API_URL;
    expect(url).toBeTruthy();
    expect(url).toContain("http");
  });

  it("EODHD API returns valid quote for AAPL", async () => {
    const key = process.env.EODHD_API_KEY;
    if (!key || key === "your-key") {
      console.warn("EODHD_API_KEY not configured, skipping live test");
      return;
    }
    const resp = await fetch(
      `https://eodhd.com/api/real-time/AAPL.US?api_token=${key}&fmt=json`
    );
    expect(resp.ok).toBe(true);
    const data = await resp.json();
    expect(data).toHaveProperty("close");
    expect(typeof data.close).toBe("number");
  }, 10000);

  it("YouTube API returns valid video metadata", async () => {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key || key === "your-key") {
      console.warn("YOUTUBE_API_KEY not configured, skipping live test");
      return;
    }
    // Use a known stable video ID
    const resp = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=dQw4w9WgXcQ&key=${key}`
    );
    expect(resp.ok).toBe(true);
    const data = await resp.json();
    expect(data).toHaveProperty("items");
    expect(Array.isArray(data.items)).toBe(true);
  }, 10000);
});
