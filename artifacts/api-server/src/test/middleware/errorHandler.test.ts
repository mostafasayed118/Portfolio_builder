import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../app";

describe("Error Handler Middleware", () => {
  it("returns 404 JSON for unknown routes", async () => {
    const res = await request(app).get("/api/v1/nonexistent-route");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Not found");
  });

  it("returns JSON content type for 404", async () => {
    const res = await request(app).get("/api/v1/does-not-exist");
    expect(res.headers["content-type"]).toMatch(/json/);
  });

  it("includes success and message in 404 response", async () => {
    const res = await request(app).post("/api/v1/fake-endpoint");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
