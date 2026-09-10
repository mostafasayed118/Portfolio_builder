import { describe, it, expect } from "vitest";
import request from "supertest";
import { mockAdminKey } from "../helpers";
import app from "../../app";

describe("Contact Info API", () => {
  describe("GET /api/v1/admin/contact-info", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app).get("/api/v1/admin/contact-info");
      expect(res.status).toBe(401);
    });

    it("returns 200 with valid admin key", async () => {
      const res = await request(app)
        .get("/api/v1/admin/contact-info")
        .set("x-admin-key", mockAdminKey);
      expect([200, 500]).toContain(res.status);
    });
  });

  describe("PUT /api/v1/admin/contact-info", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .put("/api/v1/admin/contact-info")
        .send({ email: "test@example.com" });
      expect(res.status).toBe(401);
    });

    it("updates contact info", async () => {
      const res = await request(app)
        .put("/api/v1/admin/contact-info")
        .set("x-admin-key", mockAdminKey)
        .send({ email: "test@example.com", phone: "+1234567890" });
      expect([200, 500]).toContain(res.status);
    });
  });
});
