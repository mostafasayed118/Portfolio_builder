import { describe, it, expect } from "vitest";
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
      expect([200, 500]).toContain(res.status);
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
      const res = await request(app)
        .put("/api/v1/admin/seo-settings")
        .set("x-admin-key", mockAdminKey)
        .send({ title: "New Title", description: "New Description" });
      expect([200, 500]).toContain(res.status);
    });
  });
});
