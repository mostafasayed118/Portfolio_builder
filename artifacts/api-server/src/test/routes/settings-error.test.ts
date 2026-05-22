import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";

const { mockSupabaseClient, mockAdminKey } = vi.hoisted(() => {
  const mockAdminKey = "test-admin-key";
  const mockSupabaseClient = {
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    limit: vi.fn(),
    order: vi.fn(),
  };
  return { mockSupabaseClient, mockAdminKey };
});

vi.mock("../../lib/supabase-client", () => ({
  getSupabaseClient: vi.fn(() => mockSupabaseClient),
}));

vi.mock("../../middleware/adminAuth", () => ({
  adminAuth: vi.fn((req: any, res: any, next: () => void) => {
    const adminKey = req.headers?.["x-admin-key"];
    if (adminKey === mockAdminKey) {
      req.adminEmail = "admin@test.com";
      return next();
    }
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }),
}));

function resetMockChain() {
  mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.insert.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.update.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.delete.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.limit.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.order.mockReturnValue(mockSupabaseClient);
  // Reset terminal methods completely (clears mockResolvedValueOnce queue)
  mockSupabaseClient.single.mockReset();
  mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });
  mockSupabaseClient.maybeSingle.mockReset();
  mockSupabaseClient.maybeSingle.mockResolvedValue({ data: null, error: null });
}

beforeEach(() => {
  resetMockChain();
});

describe("Settings Routes — Error Handling", () => {
  describe("GET /api/v1/admin/hero — DB error", () => {
    it("returns 500 when database query fails", async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Connection to database lost" },
      });

      const res = await request(app)
        .get("/api/v1/admin/hero")
        .set("x-admin-key", mockAdminKey);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/connection to database lost/i);
    });

    it("returns 500 with error message from Supabase", async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "relation hero_content does not exist" },
      });

      const res = await request(app)
        .get("/api/v1/admin/hero")
        .set("x-admin-key", mockAdminKey);

      expect(res.status).toBe(500);
      expect(res.body.message).toContain("does not exist");
    });
  });

  describe("GET /api/v1/admin/about — DB error", () => {
    it("returns 500 when database query fails", async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Timeout executing query" },
      });

      const res = await request(app)
        .get("/api/v1/admin/about")
        .set("x-admin-key", mockAdminKey);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/timeout/i);
    });

    it("returns 500 when table is missing", async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'relation "about_content" does not exist' },
      });

      const res = await request(app)
        .get("/api/v1/admin/about")
        .set("x-admin-key", mockAdminKey);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/admin/theme-settings — DB error", () => {
    it("returns 500 when database query fails", async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Permission denied for table theme_settings" },
      });

      const res = await request(app)
        .get("/api/v1/admin/theme-settings")
        .set("x-admin-key", mockAdminKey);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/permission denied/i);
    });

    it("returns 200 with null data when no record exists (no error)", async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const res = await request(app)
        .get("/api/v1/admin/theme-settings")
        .set("x-admin-key", mockAdminKey);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();
    });
  });

  describe("GET /api/v1/admin/seo-settings — DB error", () => {
    it("returns 500 when database query fails", async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Network error connecting to Supabase" },
      });

      const res = await request(app)
        .get("/api/v1/admin/seo-settings")
        .set("x-admin-key", mockAdminKey);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/network error/i);
    });

    it("returns 200 with data when query succeeds", async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: {
          title: "My Portfolio",
          description: "Personal portfolio website",
          keywords: "developer,portfolio",
        },
        error: null,
      });

      const res = await request(app)
        .get("/api/v1/admin/seo-settings")
        .set("x-admin-key", mockAdminKey);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("My Portfolio");
    });

    it("returns 401 without authentication", async () => {
      const res = await request(app)
        .get("/api/v1/admin/seo-settings");

      expect(res.status).toBe(401);
    });
  });

  describe("Cross-cutting concerns", () => {
    it("all GET settings routes return success:false on DB error", async () => {
      const routes = [
        "/api/v1/admin/hero",
        "/api/v1/admin/about",
        "/api/v1/admin/theme-settings",
        "/api/v1/admin/seo-settings",
      ];

      for (const route of routes) {
        resetMockChain();
        mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
          data: null,
          error: { message: `DB error for ${route}` },
        });

        const res = await request(app)
          .get(route)
          .set("x-admin-key", mockAdminKey);

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBeDefined();
      }
    });

    it("all settings routes require authentication", async () => {
      const routes = [
        "/api/v1/admin/hero",
        "/api/v1/admin/about",
        "/api/v1/admin/theme-settings",
        "/api/v1/admin/seo-settings",
      ];

      for (const route of routes) {
        const res = await request(app).get(route);
        expect(res.status).toBe(401);
      }
    });
  });
});
