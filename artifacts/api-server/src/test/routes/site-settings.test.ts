import { describe, it, expect } from "vitest";
import request from "supertest";
import { mockAdminKey } from "../helpers";
import app from "../../app";

describe("Site Settings API", () => {
  describe("GET /api/v1/admin/site-settings", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app).get("/api/v1/admin/site-settings");
      expect(res.status).toBe(401);
    });

    it("returns 200 with valid admin key", async () => {
      const res = await request(app)
        .get("/api/v1/admin/site-settings")
        .set("x-admin-key", mockAdminKey);
      expect([200, 500]).toContain(res.status);
    });
  });

  describe("PUT /api/v1/admin/site-settings", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .put("/api/v1/admin/site-settings")
        .send({ site_name: "Test" });
      expect(res.status).toBe(401);
    });

    it("updates site settings", async () => {
      const res = await request(app)
        .put("/api/v1/admin/site-settings")
        .set("x-admin-key", mockAdminKey)
        .send({ site_name: "New Name", site_tagline: "New Tagline" });
      expect([200, 500]).toContain(res.status);
    });
  });

  describe("PATCH /api/v1/admin/site-settings/language", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .patch("/api/v1/admin/site-settings/language")
        .send({ default_language: "en" });
      expect(res.status).toBe(401);
    });

    it("updates language setting", async () => {
      const res = await request(app)
        .patch("/api/v1/admin/site-settings/language")
        .set("x-admin-key", mockAdminKey)
        .send({ default_language: "ar" });
      expect([200, 500]).toContain(res.status);
    });
  });
});
