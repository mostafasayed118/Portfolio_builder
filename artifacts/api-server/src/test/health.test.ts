import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "../app";
import { _setOverride, _resetOverrides } from "../lib/env";

describe("GET /api/healthz — liveness check", () => {
  beforeEach(() => {
    // env.NODE_ENV falls back to "development" if unset, so this is
    // mostly defensive: the test runner's process.env should already
    // have NODE_ENV=test, but the test still works either way.
    _setOverride("NODE_ENV", "development");
  });
  afterEach(() => {
    _resetOverrides();
  });

  it("returns 200 with the spec response shape", async () => {
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
    // ISO 8601 timestamp — sanity-check the format
    expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    // uptime is a non-negative float
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
  });

  it("does NOT include the legacy db / api nested objects", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.body).not.toHaveProperty("db");
    expect(res.body).not.toHaveProperty("api");
  });

  it("returns identical status for two back-to-back calls (no caching, no state)", async () => {
    const res1 = await request(app).get("/api/healthz");
    const res2 = await request(app).get("/api/healthz");
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body.status).toBe("ok");
    expect(res2.body.status).toBe("ok");
  });

  it("reports the configured environment", async () => {
    _setOverride("NODE_ENV", "production");
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
    expect(res.body.environment).toBe("production");
  });

  it("does NOT require any Authorization header", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
  });

  it("does NOT require CSRF token (this is a state-mutating-method-free endpoint)", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
  });

  it("sets the request-id header (monitoring tools correlate logs via this)", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.headers["x-request-id"]).toBeDefined();
  });

  it("sets security headers from helmet", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("serves no scripts, so script-src is the strictest value 'none'", async () => {
    const res = await request(app).get("/api/healthz");
    const csp = res.headers["content-security-policy"] as string;
    expect(csp).toBeDefined();
    // Only script-src matters here — style-src legitimately keeps
    // 'unsafe-inline' (styles cannot execute code). Match the exact
    // directive (not script-src-attr, which also starts with "script-src").
    const scriptSrc = csp
      .split(";")
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith("script-src "));
    expect(scriptSrc).toBe("script-src 'none'");
  });
});

describe("HEAD /api/healthz — liveness check (used by Docker / k8s / load balancers)", () => {
  it("returns 200 with no body", async () => {
    const res = await request(app).head("/api/healthz");
    expect(res.status).toBe(200);
    // HEAD must not return a body per RFC 9110 §9.3.2. supertest
    // discards the response body for HEAD requests at the HTTP
    // client level, so `res.text` is `undefined` (not "") and the
    // parsed `res.body` is an empty object — that's the load-bearing
    // assertion. The `Content-Length` header is unreliable because
    // the global `compression()` middleware may pre-compute a value
    // from the equivalent GET response, so we don't assert on it.
    expect(res.body).toEqual({});
  });

  it("sets the request-id header on HEAD too", async () => {
    const res = await request(app).head("/api/healthz");
    expect(res.headers["x-request-id"]).toBeDefined();
  });
});

describe("/api/v1/healthz — documented deployment health check (alias of /api/healthz)", () => {
  it("returns 200 with the same spec response shape", async () => {
    const res = await request(app).get("/api/v1/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "ok",
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        environment: expect.any(String),
      }),
    );
  });

  it("supports HEAD with no body (Docker / k8s / load balancers)", async () => {
    const res = await request(app).head("/api/v1/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
  });

  it("is served before the v1 rate limiter, so it is not throttled", async () => {
    for (let i = 0; i < 105; i++) {
      const res = await request(app).get("/api/v1/healthz");
      expect(res.status).toBe(200);
    }
  });
});

describe("404 handling", () => {
  it("returns 404 for unknown routes", async () => {
    const res = await request(app).get("/api/nonexistent");
    expect(res.status).toBe(404);
  });
});
