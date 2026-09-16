import { describe, it, expect, vi } from "vitest";
import { getSupabaseClient } from "../../lib/supabase-client";
import request from "supertest";
import { mockAdminKey } from "../helpers";
import app from "../../app";

describe("SEO Settings API", () => {
  describe("GET /api/v1/admin/seo-settings", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app).get("/api/v1/admin/seo-settings");
      expect(res.status).toBe(401);
    });

    it("returns 200 with valid admin key", async () => {
      const res = await request(app)
        .get("/api/v1/admin/seo-settings")
        .set("x-admin-key", mockAdminKey);
      expect(res.status).toBe(200);
    });
  });

  describe("PUT /api/v1/admin/seo-settings", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .put("/api/v1/admin/seo-settings")
        .send({ title: "Test" });
      expect(res.status).toBe(401);
    });

    it("updates SEO settings", async () => {
      const client = getSupabaseClient();
      Object.assign(client, { upsert: vi.fn().mockResolvedValue({ data: null, error: null }) });
      vi.mocked(getSupabaseClient).mockReturnValueOnce(client);
      const res = await request(app)
        .put("/api/v1/admin/seo-settings")
        .set("x-admin-key", mockAdminKey)
        .query({ portfolioId: "11111111-1111-4111-8111-111111111111" })
        .send({ title: "New Title", description: "New Description" });
      expect(res.status).toBe(200);
    });
  });
});
