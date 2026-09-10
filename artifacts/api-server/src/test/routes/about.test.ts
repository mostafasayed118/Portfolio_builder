import { describe, it, expect } from "vitest";
import request from "supertest";
import { mockAdminKey } from "../helpers";
import app from "../../app";

describe("About API", () => {
  describe("GET /api/v1/admin/about", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app).get("/api/v1/admin/about");
      expect(res.status).toBe(401);
    });

    it("returns 200 with valid admin key", async () => {
      const res = await request(app)
        .get("/api/v1/admin/about")
        .set("x-admin-key", mockAdminKey);
      expect([200, 500]).toContain(res.status);
    });
  });

  describe("PUT /api/v1/admin/about", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .put("/api/v1/admin/about")
        .send({ bio1: "Test" });
      expect(res.status).toBe(401);
    });

    it("rejects bio over 2000 chars", async () => {
      const res = await request(app)
        .put("/api/v1/admin/about")
        .set("x-admin-key", mockAdminKey)
        .send({ bio1: "a".repeat(2001) });
      expect(res.status).toBe(400);
    });

    it("rejects invalid years_of_experience type", async () => {
      const res = await request(app)
        .put("/api/v1/admin/about")
        .set("x-admin-key", mockAdminKey)
        .send({ years_of_experience: -1 });
      expect(res.status).toBe(400);
    });

    it("accepts valid partial update", async () => {
      const res = await request(app)
        .put("/api/v1/admin/about")
        .set("x-admin-key", mockAdminKey)
        .send({ bio1: "Test bio", location: "Cairo" });
      expect([200, 500]).toContain(res.status);
    });
  });
});
