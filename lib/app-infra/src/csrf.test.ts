import { afterEach, describe, expect, it, vi } from "vitest";
import { extractCsrfToken, fetchCsrfToken } from "./csrf";

describe("extractCsrfToken", () => {
  it("reads the canonical envelope { success, data: { csrfToken } }", () => {
    expect(extractCsrfToken({ success: true, data: { csrfToken: "tok-1" } })).toBe("tok-1");
  });

  it("reads the legacy bare { csrfToken } shape", () => {
    expect(extractCsrfToken({ csrfToken: "tok-2" })).toBe("tok-2");
  });

  it("recurses into nested data envelopes", () => {
    expect(extractCsrfToken({ data: { data: { csrfToken: "tok-3" } } })).toBe("tok-3");
  });

  it("returns null for non-objects and missing tokens", () => {
    expect(extractCsrfToken(null)).toBeNull();
    expect(extractCsrfToken("nope")).toBeNull();
    expect(extractCsrfToken({ data: { something: 1 } })).toBeNull();
    expect(extractCsrfToken({ csrfToken: 42 })).toBeNull();
  });
});

describe("fetchCsrfToken", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches the csrf-token endpoint with credentials included", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { csrfToken: "tok-a" } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const token = await fetchCsrfToken("https://api.example.com");
    expect(token).toBe("tok-a");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.com/api/v1/csrf-token");
    expect(init.credentials).toBe("include");
  });

  it("accepts the legacy bare { csrfToken } response shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ csrfToken: "tok-b" }), { status: 200 })),
    );
    await expect(fetchCsrfToken("https://api.example.com")).resolves.toBe("tok-b");
  });

  it("throws the refresh-page error on a non-200 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 503 })));
    await expect(fetchCsrfToken("https://api.example.com")).rejects.toThrow(
      "Unable to establish secure session — please refresh the page",
    );
  });

  it("throws the refresh-page error when the body has no token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false }), { status: 200 })),
    );
    await expect(fetchCsrfToken("https://api.example.com")).rejects.toThrow(
      "Unable to establish secure session — please refresh the page",
    );
  });

  it("wraps network failures in the refresh-page error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network down")));
    await expect(fetchCsrfToken("https://api.example.com")).rejects.toThrow(
      "Unable to establish secure session — please refresh the page",
    );
  });
});
