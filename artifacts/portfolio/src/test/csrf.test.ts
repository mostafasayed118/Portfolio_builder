import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearCsrfCache, getCsrfToken } from "@/lib/csrf";

/**
 * Mirrors the admin app's envelope-aware extraction contract
 * (artifacts/admin/src/lib/csrf.ts): the /csrf-token response may be the
 * canonical `{ success: true, data: { csrfToken } }` envelope or the legacy
 * bare `{ csrfToken }` shape — both must yield the token.
 */

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("portfolio CSRF token extraction", () => {
  beforeEach(() => {
    clearCsrfCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearCsrfCache();
  });

  it("extracts the token from the legacy bare shape", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ csrfToken: "tok-legacy" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getCsrfToken()).resolves.toBe("tok-legacy");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/csrf-token"),
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("extracts the token from the canonical response envelope", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: true, data: { csrfToken: "tok-envelope" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getCsrfToken()).resolves.toBe("tok-envelope");
  });

  it("unwraps nested envelopes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: true, data: { data: { csrfToken: "tok-nested" } } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getCsrfToken()).resolves.toBe("tok-nested");
  });

  it("caches the token and skips refetching within the TTL", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: true, data: { csrfToken: "tok-cached" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getCsrfToken()).resolves.toBe("tok-cached");
    await expect(getCsrfToken()).resolves.toBe("tok-cached");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refetches on forceRefresh even when cached", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(jsonResponse({ success: true, data: { csrfToken: "tok-1" } })));
    vi.stubGlobal("fetch", fetchMock);

    await getCsrfToken();
    await expect(getCsrfToken(true)).resolves.toBe("tok-1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects when the token is missing from the response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ success: true, data: {} })));

    await expect(getCsrfToken()).rejects.toThrow(
      "Unable to establish secure session — please refresh the page",
    );
  });

  it("rejects on non-200 responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, 500)));

    await expect(getCsrfToken()).rejects.toThrow(
      "Unable to establish secure session — please refresh the page",
    );
  });
});
