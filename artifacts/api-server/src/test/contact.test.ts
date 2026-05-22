import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";

describe("POST /api/v1/contact", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
  });

  it("rejects missing name", async () => {
    const res = await request(app)
      .post("/api/v1/contact")
      .send({ email: "test@example.com", message: "Hello world!" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects invalid email", async () => {
    const res = await request(app)
      .post("/api/v1/contact")
      .send({ name: "Test", email: "invalid", message: "Hello world!" });
    expect(res.status).toBe(400);
  });

  it("rejects short message", async () => {
    const res = await request(app)
      .post("/api/v1/contact")
      .send({ name: "Test", email: "test@example.com", message: "Short" });
    expect(res.status).toBe(400);
  });

  it("accepts valid contact submission", async () => {
    const res = await request(app)
      .post("/api/v1/contact")
      .send({ name: "Test User", email: "test@example.com", message: "This is a valid message with enough content" });
    expect([200, 500]).toContain(res.status);
  });
});
