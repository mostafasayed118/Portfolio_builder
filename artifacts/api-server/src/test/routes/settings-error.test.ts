import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { mockAdminKey, mockSupabaseClient, resetSupabaseClient } from "../helpers";
import app from "../../app";

vi.mock("../../lib/supabase-client", () => ({
  getSupabaseClient: vi.fn(() => mockSupabaseClient),
}));

beforeEach(() => {
  resetSupabaseClient(mockSupabaseClient);
});

describe("Settings Routes — Error Handling", () => {
  describe("GET /api/v1/admin/hero — DB error", () => {
    it("returns 500 with a sanitized message when database query fails", async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Connection to database lost" },
      });

      const res = await request(app)
        .get("/api/v1/admin/hero")
        .set("x-admin-key", mockAdminKey);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      // Raw DB error details must never reach the client (safeErrorMessage).
      expect(res.body.message).toBe("Internal server error");
      expect(res.body.message).not.toMatch(/connection to database lost/i);
    });

    it("never leaks internal table/relation details in the response", async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "relation hero_content does not exist" },
      });

      const res = await request(app)
        .get("/api/v1/admin/hero")
        .set("x-admin-key", mockAdminKey);

      expect(res.status).toBe(500);
      expect(res.body.message).not.toContain("does not exist");
      expect(res.body.message).not.toContain("hero_content");
    });
  });

  describe("GET /api/v1/admin/about — DB error", () => {
    it("maps timeout-style DB errors to the upstream-timeout safe message", async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Timeout executing query" },
      });

      const res = await request(app)
        .get("/api/v1/admin/about")
        .set("x-admin-key", mockAdminKey);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Upstream service timed out. Please try again.");
      expect(res.body.message).not.toMatch(/timeout executing query/i);
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
    it("returns 500 with a sanitized message when database query fails", async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Permission denied for table theme_settings" },
      });

      const res = await request(app)
        .get("/api/v1/admin/theme-settings")
        .set("x-admin-key", mockAdminKey);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      // The policy/permission internals must not leak (safeErrorMessage).
      expect(res.body.message).toBe("Internal server error");
      expect(res.body.message).not.toMatch(/permission denied/i);
      expect(res.body.message).not.toMatch(/theme_settings/i);
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
    it("maps network-style DB errors to the upstream-timeout safe message", async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Network error connecting to Supabase" },
      });

      const res = await request(app)
        .get("/api/v1/admin/seo-settings")
        .set("x-admin-key", mockAdminKey);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Upstream service timed out. Please try again.");
      expect(res.body.message).not.toMatch(/network error/i);
      expect(res.body.message).not.toMatch(/supabase/i);
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
        resetSupabaseClient(mockSupabaseClient);
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
