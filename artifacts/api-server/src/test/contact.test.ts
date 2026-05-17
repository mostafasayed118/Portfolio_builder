import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";

describe("POST /api/contact", () => {
  it("returns 404 (contact route not configured)", async () => {
    const res = await request(app)
      .post("/api/v1/contact")
      .send({ name: "Test", email: "test@test.com", message: "Hello" });
    expect(res.status).toBe(404);
  });

  it("returns 404 for any contact request", async () => {
    const res = await request(app)
      .post("/api/v1/contact")
      .send({});
    expect(res.status).toBe(404);
  });
});
