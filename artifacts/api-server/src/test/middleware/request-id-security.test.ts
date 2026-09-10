import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../app";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";

describe("X-Request-ID validation (Group A security fix)", () => {
  it("echoes a valid client UUID", async () => {
    const res = await request(app).get("/api/healthz").set("X-Request-ID", VALID_UUID);
    expect(res.headers["x-request-id"]).toBe(VALID_UUID);
  });

  it("rejects a non-UUID injection string and generates a fresh UUID", async () => {
    const res = await request(app)
      .get("/api/healthz")
      .set("X-Request-ID", "malicious-payload-\"><script>alert(1)</script>");
    const echoed = res.headers["x-request-id"] as string;
    expect(echoed).not.toBe("malicious-payload-\"><script>alert(1)</script>");
    expect(echoed).toMatch(UUID_RE);
  });

  it("rejects an empty header value", async () => {
    const res = await request(app).get("/api/healthz").set("X-Request-ID", "");
    expect(res.headers["x-request-id"]).toMatch(UUID_RE);
    expect(res.headers["x-request-id"]).not.toBe("");
  });

  it("rejects an oversized (>200 chars) header value", async () => {
    const oversized = `a-${"x".repeat(300)}`;
    const res = await request(app).get("/api/healthz").set("X-Request-ID", oversized);
    const echoed = res.headers["x-request-id"] as string;
    expect(echoed).not.toBe(oversized);
    expect(echoed).toMatch(UUID_RE);
  });

  it("handles an array header value by generating a fresh UUID", async () => {
    const res = await request(app)
      .get("/api/healthz")
      .set("X-Request-ID", [VALID_UUID, VALID_UUID] as unknown as string);
    expect(res.headers["x-request-id"]).toMatch(UUID_RE);
  });

  it("generates a valid UUID when no header is sent", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.headers["x-request-id"]).toMatch(UUID_RE);
  });
});
