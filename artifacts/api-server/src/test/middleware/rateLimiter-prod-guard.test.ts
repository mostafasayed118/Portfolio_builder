import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";

describe("Rate limiter DISABLE_RATE_LIMIT prod guard (Group A security fix)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function buildAppWithFreshLimiter(nodeEnv: string, disableFlag: string) {
    vi.stubEnv("NODE_ENV", nodeEnv);
    vi.stubEnv("DISABLE_RATE_LIMIT", disableFlag);
    const { generalLimiter } = await import("../../middleware/rateLimiter");
    const testApp = express();
    testApp.use(generalLimiter);
    testApp.get("/limited", (_req, res) => {
      res.json({ ok: true });
    });
    return testApp;
  }

  it("FAIL-OPEN BUG GUARD: DISABLE_RATE_LIMIT=true in production must NOT disable limiting (101st+ request -> 429)", async () => {
    const { default: supertest } = await import("supertest");
    const testApp = await buildAppWithFreshLimiter("production", "true");
    let lastStatus = 200;
    for (let i = 0; i < 105; i++) {
      const res = await supertest(testApp).get("/limited");
      lastStatus = res.status;
      if (lastStatus === 429) break;
    }
    expect(lastStatus).toBe(429);
  }, 30000);

  it("DISABLE_RATE_LIMIT=true outside production still skips limiting (dev convenience preserved)", async () => {
    const { default: supertest } = await import("supertest");
    const testApp = await buildAppWithFreshLimiter("development", "true");
    for (let i = 0; i < 105; i++) {
      const res = await supertest(testApp).get("/limited");
      expect(res.status).toBe(200);
    }
  }, 30000);

  it("logs an error when DISABLE_RATE_LIMIT is ignored in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DISABLE_RATE_LIMIT", "true");
    await import("../../middleware/rateLimiter");
    const { logger } = await import("../../lib/logger");
    expect(vi.mocked(logger.error).mock.calls.length).toBeGreaterThan(0);
  });
});
