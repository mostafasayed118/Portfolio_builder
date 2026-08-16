import { describe, it, expect } from "vitest";
import { classifyResponse, summarize } from "./check-gemini-health.mjs";

describe("classifyResponse", () => {
  it("classifies a 200 as success", () => {
    expect(classifyResponse(200, JSON.stringify({ success: true }), 42)).toMatchObject({
      outcome: "success",
      status: 200,
      durationMs: 42,
      geminiStatus: null,
    });
  });

  it("classifies a 500 with a Gemini status as a gemini-error", () => {
    const body = JSON.stringify({ success: false, message: "Gemini API 503: high demand" });
    expect(classifyResponse(500, body, 3000)).toMatchObject({
      outcome: "gemini-error",
      status: 500,
      geminiStatus: 503,
    });
  });

  it("classifies a 500 quota error with the 429 status", () => {
    const body = JSON.stringify({ success: false, message: "Gemini API 429: quota exceeded" });
    expect(classifyResponse(500, body, 2500).geminiStatus).toBe(429);
  });

  it("classifies a timeout 500", () => {
    expect(classifyResponse(500, "The operation was aborted due to timeout", 20000)).toMatchObject({
      outcome: "timeout",
      geminiStatus: null,
    });
  });

  it("classifies other 4xx/5xx as other-error", () => {
    expect(classifyResponse(401, '{"success":false}', 10)).toMatchObject({ outcome: "other-error", status: 401 });
  });
});

describe("summarize", () => {
  const sample = [
    { endpoint: "suggest-tags", outcome: "success", status: 200, durationMs: 100, geminiStatus: null },
    { endpoint: "suggest-tags", outcome: "gemini-error", status: 500, durationMs: 200, geminiStatus: 503 },
    { endpoint: "suggest-tags", outcome: "gemini-error", status: 500, durationMs: 300, geminiStatus: 429 },
    { endpoint: "generate-description", outcome: "success", status: 200, durationMs: 400, geminiStatus: null },
  ];

  it("computes totals, availability, and latency percentiles", () => {
    const s = summarize(sample);
    expect(s.totals).toEqual({ total: 4, success: 2, errors: 2 });
    expect(s.availabilityPct).toBe(50);
    // sorted [100, 200, 300, 400]; floor(0.5 * 4) = index 2 → 300
    expect(s.p50Ms).toBe(300);
    expect(s.p95Ms).toBe(400); // floor(0.95 * 4) = 3 → last
  });

  it("groups by endpoint and lists Gemini statuses", () => {
    const s = summarize(sample);
    const tags = s.rows.find((r) => r.endpoint === "suggest-tags");
    expect(tags).toMatchObject({ total: 3, success: 1, errors: 2, availabilityPct: 33.3 });
    expect(tags.gemini).toContain("503");
    expect(tags.gemini).toContain("429");
    expect(s.geminiStatuses).toContain("503");
    expect(s.geminiStatuses).toContain("429");
  });
});
