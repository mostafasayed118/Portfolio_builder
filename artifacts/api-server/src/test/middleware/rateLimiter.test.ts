import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../app";

describe("Rate Limiting", () => {
  it("allows requests within general limit", async () => {
    const res = await request(app).get("/api/v1/healthz");
    expect(res.status).toBe(200);
    // Should not be rate limited on first request
  });

  it("health endpoint returns 200", async () => {
    const res = await request(app).get("/api/v1/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
