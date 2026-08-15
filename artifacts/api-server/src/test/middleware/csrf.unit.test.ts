import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";

// The api-server test setup globally mocks `../middleware/csrf` (so route
// tests can treat CSRF as a pass-through). Re-register the module with the
// REAL implementation here so these tests exercise the actual double-submit
// token generation + validation logic.
vi.mock("../../middleware/csrf", async (importOriginal) =>
  importOriginal<typeof import("../../middleware/csrf")>(),
);

import {
  generateCsrfToken,
  doubleCsrfProtection,
  invalidCsrfTokenError,
} from "../../middleware/csrf";

type MockReq = Partial<Request> & {
  method: string;
  ip?: string;
  headers: Record<string, string | undefined>;
  cookies: Record<string, string>;
};

function makeReq(method = "POST", overrides: Partial<MockReq> = {}): MockReq {
  return {
    method,
    ip: "127.0.0.1",
    headers: { "user-agent": "vitest-agent" },
    cookies: {},
    ...overrides,
  };
}

function makeRes() {
  const cookies: Record<string, string> = {};
  const res = {
    cookie: vi.fn((name: string, value: string) => {
      cookies[name] = value;
    }),
  };
  return { res, cookies };
}

describe("csrf middleware (real module)", () => {
  it("generates a well-formed token (hmac 64 hex + '.' + random 128 hex)", () => {
    const req = makeReq();
    const { res } = makeRes();
    const token = generateCsrfToken(req as Request, res as unknown as Response);

    expect(typeof token).toBe("string");
    // hmac: sha256 hex = 64 chars; random: size 64 bytes = 128 hex chars.
    expect(token).toMatch(/^[0-9a-f]{64}\.[0-9a-f]{128}$/);
  });

  it("sets the x-csrf-token cookie with the expected options", () => {
    const req = makeReq();
    const { res } = makeRes();
    generateCsrfToken(req as Request, res as unknown as Response);

    expect(res.cookie).toHaveBeenCalledWith(
      "x-csrf-token",
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax", // test env is not production
        secure: false,
        path: "/",
      }),
    );
  });

  it("skips validation for ignored (safe) methods", () => {
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      const req = makeReq(method);
      const { res } = makeRes();
      const next = vi.fn();
      doubleCsrfProtection(req as Request, res as unknown as Response, next);
      expect(next).toHaveBeenCalledWith();
      expect(next).not.toHaveBeenCalledWith(expect.any(Error));
    }
  });

  it("rejects a state-changing request with no token", () => {
    const req = makeReq("POST");
    const { res } = makeRes();
    const next = vi.fn();
    doubleCsrfProtection(req as Request, res as unknown as Response, next);
    expect(next).toHaveBeenCalledWith(invalidCsrfTokenError);
  });

  it("rejects a request whose header token does not match the cookie", () => {
    const req = makeReq("POST", {
      headers: { "x-csrf-token": "header-token" },
      cookies: { "x-csrf-token": "cookie-token" },
    });
    const { res } = makeRes();
    const next = vi.fn();
    doubleCsrfProtection(req as Request, res as unknown as Response, next);
    expect(next).toHaveBeenCalledWith(invalidCsrfTokenError);
  });

  it("accepts a request whose header token matches the cookie", () => {
    const req = makeReq("POST");
    const { res, cookies } = makeRes();
    const token = generateCsrfToken(req as Request, res as unknown as Response);

    // Simulate the browser sending the cookie + header back on the next request.
    req.cookies = cookies;
    req.headers["x-csrf-token"] = token;

    const next = vi.fn();
    doubleCsrfProtection(req as Request, res as unknown as Response, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("binds tokens to the client session (ip + user-agent)", () => {
    // Mint a token for one client…
    const reqA = makeReq("POST", { ip: "1.2.3.4", headers: { "user-agent": "agent-a" } });
    const { res: resA } = makeRes();
    const token = generateCsrfToken(reqA as Request, resA as unknown as Response);

    // …and replay it from a different client: the HMAC is derived from the
    // session identifier, so the replay must be rejected.
    const reqB = makeReq("POST", {
      ip: "5.6.7.8",
      headers: { "user-agent": "agent-b", "x-csrf-token": token },
      cookies: { "x-csrf-token": token },
    });
    const { res: resB } = makeRes();
    const next = vi.fn();
    doubleCsrfProtection(reqB as Request, resB as unknown as Response, next);
    expect(next).toHaveBeenCalledWith(invalidCsrfTokenError);
  });

  it("exposes an invalidCsrfTokenError with status 403 and code EBADCSRFTOKEN", () => {
    expect(invalidCsrfTokenError).toBeInstanceOf(Error);
    expect((invalidCsrfTokenError as { statusCode: number }).statusCode).toBe(403);
    expect((invalidCsrfTokenError as { code: string }).code).toBe("EBADCSRFTOKEN");
  });
});
