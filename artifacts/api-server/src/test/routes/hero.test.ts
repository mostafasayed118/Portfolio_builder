import { describe, it, expect, vi } from "vitest";
import { getSupabaseClient } from "../../lib/supabase-client";
import request from "supertest";
import { mockAdminKey } from "../helpers";
import app from "../../app";

describe("Hero API", () => {
  describe("GET /api/v1/admin/hero", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app).get("/api/v1/admin/hero");
      expect(res.status).toBe(401);
    });

    it("returns 200 with valid admin key", async () => {
      const res = await request(app)
        .get("/api/v1/admin/hero")
        .set("x-admin-key", mockAdminKey);
      expect(res.status).toBe(200);
    });
  });

  describe("PUT /api/v1/admin/hero", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .put("/api/v1/admin/hero")
        .send({ heading: "Test" });
      expect(res.status).toBe(401);
    });

    it("rejects invalid URL in github_url", async () => {
      const res = await request(app)
        .put("/api/v1/admin/hero")
        .set("x-admin-key", mockAdminKey)
        .send({ github_url: "not-a-url" });
      expect(res.status).toBe(400);
    });

    it("rejects invalid email", async () => {
      const res = await request(app)
        .put("/api/v1/admin/hero")
        .set("x-admin-key", mockAdminKey)
        .send({ email: "invalid-email" });
      expect(res.status).toBe(400);
    });

    it("accepts valid partial update", async () => {
      const client = getSupabaseClient();
      Object.assign(client, { upsert: vi.fn().mockResolvedValue({ data: null, error: null }) });
      vi.mocked(getSupabaseClient).mockReturnValueOnce(client);
      const res = await request(app)
        .put("/api/v1/admin/hero")
        .set("x-admin-key", mockAdminKey)
        .query({ portfolioId: "11111111-1111-4111-8111-111111111111" })
        .send({ heading: "Hello World", name: "Test User" });
      expect(res.status).toBe(200);
    });
  });
});
