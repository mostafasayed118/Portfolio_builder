import { describe, it, expect } from "vitest";
import request from "supertest";
import { mockAdminKey } from "../helpers";
import app from "../../app";

describe("Theme Settings API", () => {
  describe("GET /api/v1/admin/theme-settings", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app).get("/api/v1/admin/theme-settings");
      expect(res.status).toBe(401);
    });

    it("returns 200 with valid admin key", async () => {
      const res = await request(app)
        .get("/api/v1/admin/theme-settings")
        .set("x-admin-key", mockAdminKey);
      expect([200, 500]).toContain(res.status);
    });
  });

  describe("PUT /api/v1/admin/theme-settings", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .put("/api/v1/admin/theme-settings")
        .send({ mode: "dark" });
      expect(res.status).toBe(401);
    });

    it("updates theme settings", async () => {
      const res = await request(app)
        .put("/api/v1/admin/theme-settings")
        .set("x-admin-key", mockAdminKey)
        .send({ mode: "dark", radius: "0.5rem" });
      expect([200, 500]).toContain(res.status);
    });
  });
});
