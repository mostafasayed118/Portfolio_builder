import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

describe("adminAuth middleware", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    req = { headers: {} };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    next = vi.fn();
    vi.resetModules();
  });

  it("allows access with valid admin API key", async () => {
    vi.stubEnv("ADMIN_API_KEY", "test-key");
    vi.stubEnv("NODE_ENV", "production");
    req.headers = { "x-admin-key": "test-key" };
    req.get = vi.fn(() => "test-agent");

    const { adminAuth } = await import("../middleware/adminAuth");
    await adminAuth(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it("denies access without credentials in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_API_KEY", "test-key");
    req.headers = {};

    const { adminAuth } = await import("../middleware/adminAuth");
    await adminAuth(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("rejects access in dev mode without credentials", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ADMIN_API_KEY", "");
    vi.stubEnv("CLERK_SECRET_KEY", "");
    vi.stubEnv("VITE_ADMIN_EMAILS", "");
    req.headers = {};
    req.path = "/admin/projects";
    req.method = "POST";

    const { adminAuth } = await import("../middleware/adminAuth");
    await adminAuth(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("blocks access in production without credentials", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_API_KEY", "");
    vi.stubEnv("CLERK_SECRET_KEY", "");
    vi.stubEnv("VITE_ADMIN_EMAILS", "");
    req.headers = {};
    req.path = "/admin/projects";
    req.method = "GET";

    const { adminAuth } = await import("../middleware/adminAuth");
    await adminAuth(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("sets req.user correctly for API key auth", async () => {
    const mockUser = { id: "api-user-1", email: "api-admin@localhost", role: "superadmin" };

    const { getSupabaseClient } = await import("../lib/supabase-client");
    (getSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
          }),
        }),
      }),
    });

    vi.stubEnv("ADMIN_API_KEY", "my-api-key");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VITE_ADMIN_EMAILS", "");
    vi.stubEnv("CLERK_SECRET_KEY", "");
    req.headers = { "x-admin-key": "my-api-key" };
    req.path = "/admin/projects";

    const { adminAuth } = await import("../middleware/adminAuth");
    await adminAuth(req as Request & Record<string, unknown>, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).user).toEqual(mockUser);
    expect((req as any).user.id).toBeDefined();
    expect((req as any).user.email).toBeDefined();
    expect((req as any).user.role).toBeDefined();
  });

  it("rejects access in dev mode without credentials (no auto-login)", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ADMIN_API_KEY", "");
    vi.stubEnv("CLERK_SECRET_KEY", "");
    vi.stubEnv("VITE_ADMIN_EMAILS", "");
    req.headers = {};
    req.path = "/admin/projects";

    const { adminAuth } = await import("../middleware/adminAuth");
    await adminAuth(req as Request & Record<string, unknown>, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when Clerk JWT has non-admin email", async () => {
    const { verifyToken } = await import("@clerk/backend");
    (verifyToken as ReturnType<typeof vi.fn>).mockResolvedValue({ sub: "user_clerk123" });

    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_secret");
    vi.stubEnv("VITE_ADMIN_EMAILS", "admin@example.com");
    vi.stubEnv("ADMIN_API_KEY", "");
    vi.stubEnv("NODE_ENV", "production");

    // The token has an email not in ADMIN_EMAILS
    // Mock verifyToken to return email that doesn't match
    (verifyToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      sub: "user_clerk123",
      email: "hacker@evil.com",
    });

    req.headers = { authorization: "Bearer clerk-jwt-token" };
    req.path = "/admin/projects";

    const { adminAuth } = await import("../middleware/adminAuth");
    await adminAuth(req as Request & Record<string, unknown>, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("API key fallback works when JWT verification fails", async () => {
    const { verifyToken } = await import("@clerk/backend");
    (verifyToken as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Invalid token"));

    const mockUser = { id: "fallback-user", email: "api-admin@localhost", role: "superadmin" };
    const { getSupabaseClient } = await import("../lib/supabase-client");
    (getSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
          }),
        }),
      }),
    });

    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_secret");
    vi.stubEnv("VITE_ADMIN_EMAILS", "admin@example.com");
    vi.stubEnv("ADMIN_API_KEY", "fallback-key");
    vi.stubEnv("NODE_ENV", "production");

    req.headers = {
      authorization: "Bearer invalid-clerk-token",
      "x-admin-key": "fallback-key",
    };
    req.path = "/admin/projects";

    const { adminAuth } = await import("../middleware/adminAuth");
    await adminAuth(req as Request & Record<string, unknown>, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).adminEmail).toBe("api-key-admin");
  });

  it("returns 401 with descriptive message when no auth provided", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_API_KEY", "required-key");
    vi.stubEnv("CLERK_SECRET_KEY", "");
    vi.stubEnv("VITE_ADMIN_EMAILS", "");

    req.headers = {};
    req.path = "/admin/projects";

    const { adminAuth } = await import("../middleware/adminAuth");
    await adminAuth(req as Request & Record<string, unknown>, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Unauthorized" });
  });

  it("dev mode in non-production without admin config returns 401 when production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_API_KEY", "");
    vi.stubEnv("CLERK_SECRET_KEY", "");
    vi.stubEnv("VITE_ADMIN_EMAILS", "");

    req.headers = {};
    req.path = "/admin/projects";

    const { adminAuth } = await import("../middleware/adminAuth");
    await adminAuth(req as Request & Record<string, unknown>, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Admin access not configured. Set VITE_ADMIN_EMAILS or ADMIN_API_KEY.",
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  // --- NEW TESTS ---

  it("returns 401 for expired/tampered JWT when no API key fallback", async () => {
    const { verifyToken } = await import("@clerk/backend");
    // Simulate expired JWT
    (verifyToken as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Token expired"));

    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_secret");
    vi.stubEnv("VITE_ADMIN_EMAILS", "admin@example.com");
    vi.stubEnv("ADMIN_API_KEY", "");
    vi.stubEnv("NODE_ENV", "production");

    req.headers = { authorization: "Bearer expired-jwt-token" };
    req.path = "/admin/projects";

    const { adminAuth } = await import("../middleware/adminAuth");
    await adminAuth(req as Request & Record<string, unknown>, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("skips Clerk auth and falls back to API key when CLERK_SECRET_KEY is not set", async () => {
    const mockUser = { id: "key-user", email: "admin@localhost", role: "superadmin" };
    const { getSupabaseClient } = await import("../lib/supabase-client");
    (getSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
          }),
        }),
      }),
    });

    vi.stubEnv("CLERK_SECRET_KEY", "");
    vi.stubEnv("VITE_ADMIN_EMAILS", "");
    vi.stubEnv("ADMIN_API_KEY", "my-secret-key");
    vi.stubEnv("NODE_ENV", "production");

    req.headers = { "x-admin-key": "my-secret-key" };
    req.path = "/admin/projects";

    const { adminAuth } = await import("../middleware/adminAuth");
    await adminAuth(req as Request & Record<string, unknown>, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).adminEmail).toBe("api-key-admin");
  });

  it("returns 401 when email is not in ADMIN_EMAILS list", async () => {
    const { verifyToken } = await import("@clerk/backend");
    (verifyToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      sub: "user_unauthorized",
      email: "regular@user.com",
    });

    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_secret");
    vi.stubEnv("VITE_ADMIN_EMAILS", "admin@example.com,superadmin@example.com");
    vi.stubEnv("ADMIN_API_KEY", "");
    vi.stubEnv("NODE_ENV", "production");

    req.headers = { authorization: "Bearer valid-but-unauthorized-jwt" };
    req.path = "/admin/projects";

    const { adminAuth } = await import("../middleware/adminAuth");
    await adminAuth(req as Request & Record<string, unknown>, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("falls back to API key when JWT email is not in ADMIN_EMAILS", async () => {
    const { verifyToken } = await import("@clerk/backend");
    (verifyToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      sub: "user_notadmin",
      email: "notadmin@example.com",
    });

    const mockUser = { id: "fallback-2", email: "api-admin@localhost", role: "superadmin" };
    const { getSupabaseClient } = await import("../lib/supabase-client");
    (getSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
          }),
        }),
      }),
    });

    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_secret");
    vi.stubEnv("VITE_ADMIN_EMAILS", "admin@example.com");
    vi.stubEnv("ADMIN_API_KEY", "api-fallback-key");
    vi.stubEnv("NODE_ENV", "production");

    req.headers = {
      authorization: "Bearer valid-but-not-admin-jwt",
      "x-admin-key": "api-fallback-key",
    };
    req.path = "/admin/projects";

    const { adminAuth } = await import("../middleware/adminAuth");
    await adminAuth(req as Request & Record<string, unknown>, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).adminEmail).toBe("api-key-admin");
  });

  it("dev mode rejects access without any credentials (security fix)", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ADMIN_API_KEY", "");
    vi.stubEnv("CLERK_SECRET_KEY", "");
    vi.stubEnv("VITE_ADMIN_EMAILS", "");

    req.headers = {};
    req.path = "/api/v1/admin/hero";
    req.method = "GET";

    const { adminAuth } = await import("../middleware/adminAuth");
    await adminAuth(req as Request & Record<string, unknown>, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 for invalid API key in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_API_KEY", "correct-key");
    vi.stubEnv("CLERK_SECRET_KEY", "");
    vi.stubEnv("VITE_ADMIN_EMAILS", "");

    req.headers = { "x-admin-key": "wrong-key" };
    req.path = "/admin/projects";

    const { adminAuth } = await import("../middleware/adminAuth");
    await adminAuth(req as Request & Record<string, unknown>, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
