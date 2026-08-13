import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "../../app";
import { _setOverride, _resetOverrides } from "../../lib/env";

describe("GET /api/healthz — liveness check (no DB, no cache)", () => {
  beforeEach(() => {
    _setOverride("NODE_ENV", "development");
  });
  afterEach(() => {
    _resetOverrides();
    vi.useRealTimers();
  });

  it("returns 200 with the spec response shape: { status, timestamp, uptime, environment }", async () => {
    const res = await request(app).get("/api/healthz");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "ok",
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        environment: expect.any(String),
      }),
    );
    // ISO 8601 timestamp
    expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    // uptime is a non-negative float
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
  });

  it("does NOT include the legacy db / api nested objects", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.body).not.toHaveProperty("db");
    expect(res.body).not.toHaveProperty("api");
  });

  it("reports the configured environment", async () => {
    _setOverride("NODE_ENV", "production");
    const res = await request(app).get("/api/healthz");
    expect(res.body.environment).toBe("production");
  });

  it("returns identical status for two back-to-back calls (no caching, no state)", async () => {
    const res1 = await request(app).get("/api/healthz");
    const res2 = await request(app).get("/api/healthz");
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body.status).toBe("ok");
    expect(res2.body.status).toBe("ok");
  });
});

describe("HEAD /api/healthz", () => {
  it("returns 200 with no body", async () => {
    const res = await request(app).head("/api/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
  });
});

describe("Legacy /api/v1/healthz mount was removed", () => {
  it("returns 404 for the old v1 path (proves the route was moved to /api)", async () => {
    const res = await request(app).get("/api/v1/healthz");
    expect(res.status).toBe(404);
  });
});
