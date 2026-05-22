import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./auth-token", () => ({
  getClerkToken: vi.fn(),
}));

describe("api-client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("includes Authorization header with clerk token", async () => {
    const { getClerkToken } = await import("./auth-token");
    vi.mocked(getClerkToken).mockResolvedValue("clerk-jwt-token");

    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { api } = await import("./api-client");
    await api.hero.get();

    expect(mockFetch).toHaveBeenCalled();
    const init = mockFetch.mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({
      Authorization: "Bearer clerk-jwt-token",
    });
  });

  it("falls back to x-admin-key when no clerk token", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_ADMIN_API_KEY", "test-admin-key");

    vi.mock("./auth-token", () => ({
      getClerkToken: vi.fn().mockResolvedValue(null),
    }));

    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: {} }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { api } = await import("./api-client");
    await api.hero.get();

    expect(mockFetch).toHaveBeenCalled();
    const init = mockFetch.mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({
      "x-admin-key": "test-admin-key",
    });
  });

  it("includes CSRF token for POST requests", async () => {
    const { getClerkToken } = await import("./auth-token");
    vi.mocked(getClerkToken).mockResolvedValue("clerk-token");

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ csrfToken: "csrf-123" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    vi.stubGlobal("fetch", mockFetch);

    const { api } = await import("./api-client");
    await api.skills.create({ name: "TypeScript" } as any);

    // First call is CSRF token fetch, second is the actual request
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const init = mockFetch.mock.calls[1][1] as RequestInit;
    expect(init.headers).toMatchObject({
      "x-csrf-token": "csrf-123",
    });
  });

  it("does NOT include CSRF token for GET requests", async () => {
    const { getClerkToken } = await import("./auth-token");
    vi.mocked(getClerkToken).mockResolvedValue("clerk-token");

    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: {} }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { api } = await import("./api-client");
    await api.hero.get();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const init = mockFetch.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["x-csrf-token"]).toBeUndefined();
  });

  it("handles timeout via abort", async () => {
    vi.useFakeTimers();
    const { getClerkToken } = await import("./auth-token");
    vi.mocked(getClerkToken).mockResolvedValue("token");

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

  it("handles network error", async () => {
    const { getClerkToken } = await import("./auth-token");
    vi.mocked(getClerkToken).mockResolvedValue("token");

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Failed to fetch")));

    const { api } = await import("./api-client");
    const result = await api.hero.get();

    expect(result).toEqual({ success: false, message: "Failed to fetch" });
  });

  it("userIdParam returns correct query string", async () => {
    const { getClerkToken } = await import("./auth-token");
    vi.mocked(getClerkToken).mockResolvedValue("token");

    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: [] }),
    });
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
