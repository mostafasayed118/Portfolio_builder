import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  setAuthTokenGetter,
  setCsrfTokenGetter,
  setAuthMissingHandler,
} from "@workspace/api-client-react";

// A token long enough to pass the defensive shape check used by the admin
// auth-token layer (`isTokenLikelyValid` requires length >= 16, no whitespace).
const VALID_TOKEN = "clerk-jwt-token-1234567890";

describe("api-client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    setAuthTokenGetter(null);
    setCsrfTokenGetter(null);
    setAuthMissingHandler(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("includes Authorization header with clerk token (capital A, exact casing)", async () => {
    setAuthTokenGetter(async () => VALID_TOKEN);

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const { api } = await import("./api-client");
    await api.hero.get();

    expect(mockFetch).toHaveBeenCalled();
    const init = mockFetch.mock.calls[0][1] as RequestInit;
    // Exact header name — server reads "Authorization" verbatim
    expect(init.headers).toMatchObject({
      Authorization: `Bearer ${VALID_TOKEN}`,
    });
  });

  it("includes CSRF token for POST requests", async () => {
    setAuthTokenGetter(async () => VALID_TOKEN);
    setCsrfTokenGetter(async () => "csrf-123");

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const { api } = await import("./api-client");
    await api.skills.create({ name: "TypeScript" } as never);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const init = mockFetch.mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({
      "x-csrf-token": "csrf-123",
    });
  });

  it("does NOT include CSRF token for GET requests", async () => {
    setAuthTokenGetter(async () => VALID_TOKEN);
    setCsrfTokenGetter(async () => "csrf-123");

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const { api } = await import("./api-client");
    await api.hero.get();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const init = mockFetch.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["x-csrf-token"]).toBeUndefined();
  });

  it("ABORTS the request when the token getter returns null — fetch is never called", async () => {
    setAuthTokenGetter(async () => null);

    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const { api } = await import("./api-client");
    const result = await api.hero.get();

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      message: "Authentication required — please sign in again.",
    });
  });

  it("handles timeout via abort (with a valid token)", async () => {
    vi.useFakeTimers();
    setAuthTokenGetter(async () => VALID_TOKEN);

    const abortError = new Error("The operation was aborted.");
    const mockFetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(abortError));
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    const { api } = await import("./api-client");
    const promise = api.hero.get();

    // Advance past the 15s timeout
    await vi.advanceTimersByTimeAsync(16000);
    const result = await promise;

    expect(result).toEqual({ success: false, message: "Request timed out" });
    vi.useRealTimers();
  });

  it("handles network error (with a valid token)", async () => {
    setAuthTokenGetter(async () => VALID_TOKEN);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Failed to fetch")));

    const { api } = await import("./api-client");
    const result = await api.hero.get();

    expect(result).toEqual({ success: false, message: "Failed to fetch" });
  });

  it("returns the userId query param for list endpoints", async () => {
    setAuthTokenGetter(async () => VALID_TOKEN);

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { data: [] } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const { api } = await import("./api-client");
    await api.skills.list("user-123");

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("?userId=user-123");

    mockFetch.mockClear();
    await api.skills.list(undefined);
    const url2 = mockFetch.mock.calls[0][0] as string;
    expect(url2).not.toContain("?");
  });
});
