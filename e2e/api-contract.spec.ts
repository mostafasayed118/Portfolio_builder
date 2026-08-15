import { test, expect } from "@playwright/test";

/**
 * API contract tests against a running api-server.
 *
 * Defaults to the local dev server (http://localhost:3001); set E2E_API_BASE
 * to point at a deployed environment (e.g. https://portfolio-builder-api-six.vercel.app).
 *
 * These run under the dedicated `api` Playwright project only (see
 * playwright.config.ts), so they execute exactly once per run.
 *
 * Coverage:
 *   - liveness endpoint shape
 *   - public blog endpoints (list + 404 on unknown slug)
 *   - CSRF token issuance
 *   - admin endpoints: authorized with x-admin-key, rejected without
 */

// Overridable so the same suite can run against any environment:
//   E2E_API_BASE=https://… E2E_ADMIN_KEY=… playwright test
const API_BASE = process.env.E2E_API_BASE ?? "http://localhost:3001";
const ADMIN_KEY = process.env.E2E_ADMIN_KEY ?? "dev-admin-key-12345";

test.describe("API contracts", () => {
  test("GET /api/healthz → 200 with liveness payload", async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/healthz`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(typeof body.timestamp).toBe("string");
    expect(typeof body.uptime).toBe("number");
  });

  test("GET /api/v1/posts → 200 with list shape", async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/v1/posts`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.data)).toBe(true);
    expect(typeof body.data.total).toBe("number");
  });

  test("GET /api/v1/posts/:unknown-slug → 404", async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/v1/posts/not-a-real-slug-xyz`);
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test("GET /api/v1/csrf-token → 200 with token + session cookie", async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/v1/csrf-token`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.csrfToken).toBe("string");
    expect(body.csrfToken.length).toBeGreaterThan(10);
    const cookie = res.headers()["set-cookie"] ?? "";
    expect(cookie.toLowerCase()).toContain("x-csrf-token");
  });

  test("admin GET endpoints return 200 with the admin key", async ({ request }) => {
    for (const ep of [
      "/api/v1/admin/posts",
      "/api/v1/admin/skills",
      "/api/v1/admin/messages",
      "/api/v1/admin/projects",
      "/api/v1/admin/cv/settings",
    ]) {
      const res = await request.get(`${API_BASE}${ep}`, {
        headers: { "x-admin-key": ADMIN_KEY },
      });
      expect(res.status(), `${ep} should be 200 with key`).toBe(200);
      const body = await res.json();
      expect(body.success, `${ep} should report success`).toBe(true);
    }
  });

  test("admin GET /api/v1/admin/posts returns the paginated list shape", async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/v1/admin/posts`, {
      headers: { "x-admin-key": ADMIN_KEY },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data.data)).toBe(true);
    expect(typeof body.data.pagination.total).toBe("number");
    expect(typeof body.data.pagination.limit).toBe("number");
  });

  test("admin GET endpoints are rejected with 401 without the key", async ({ request }) => {
    for (const ep of ["/api/v1/admin/posts", "/api/v1/admin/skills", "/api/v1/admin/messages"]) {
      const res = await request.get(`${API_BASE}${ep}`);
      expect(res.status(), `${ep} should be 401 without key`).toBe(401);
    }
  });
});
