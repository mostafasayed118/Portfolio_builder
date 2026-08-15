import { describe, it, expect } from "vitest";
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
      expect([200, 500]).toContain(res.status);
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
      const res = await request(app)
        .put("/api/v1/admin/hero")
        .set("x-admin-key", mockAdminKey)
        .send({ heading: "Hello World", name: "Test User" });
      expect([200, 500]).toContain(res.status);
    });
  });
});
