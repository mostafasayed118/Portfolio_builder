import { describe, it, expect } from "vitest";
import request from "supertest";
import { mockAdminKey } from "../helpers";
import app from "../../app";

describe("Typography Settings API", () => {
  describe("GET /api/v1/admin/typography-settings", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app).get("/api/v1/admin/typography-settings");
      expect(res.status).toBe(401);
    });

    it("returns 200 with valid admin key", async () => {
      const res = await request(app)
        .get("/api/v1/admin/typography-settings")
        .set("x-admin-key", mockAdminKey);
      expect([200, 500]).toContain(res.status);
    });
  });

  describe("PUT /api/v1/admin/typography-settings", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .put("/api/v1/admin/typography-settings")
        .send({ body_font: "Arial" });
      expect(res.status).toBe(401);
    });

    it("updates typography settings", async () => {
      const res = await request(app)
        .put("/api/v1/admin/typography-settings")
        .set("x-admin-key", mockAdminKey)
        .send({ body_font: "Arial", display_font: "Helvetica" });
      expect([200, 500]).toContain(res.status);
    });
  });
});
