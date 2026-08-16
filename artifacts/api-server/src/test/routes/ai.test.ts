import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { mockAdminKey } from "../helpers";
import app from "../../app";
import { generateText } from "../../lib/ai/client";

vi.mock("../../lib/ai/client", () => ({
  generateText: vi.fn(),
  generateJson: vi.fn(),
  isAiConfigured: vi.fn(() => true),
  AiError: class extends Error {},
}));

describe("POST /api/v1/admin/ai", () => {
  beforeEach(() => {
    vi.mocked(generateText).mockReset();
    vi.mocked(generateText).mockResolvedValue("Polished text");
  });

  it("generate returns 401 without auth", async () => {
    const res = await request(app).post("/api/v1/admin/ai/generate").send({ contentType: "hero" });
    expect(res.status).toBe(401);
  });

  it("generate rejects invalid contentType", async () => {
    const res = await request(app)
      .post("/api/v1/admin/ai/generate")
      .set("x-admin-key", mockAdminKey)
      .send({ contentType: "invalid" });
    expect(res.status).toBe(400);
  });

  it("generate returns text", async () => {
    const res = await request(app)
      .post("/api/v1/admin/ai/generate")
      .set("x-admin-key", mockAdminKey)
      .send({ contentType: "hero" });
    expect(res.status).toBe(200);
    expect(res.body.data.text).toBe("Polished text");
  });

  it("improve rejects empty text", async () => {
    const res = await request(app)
      .post("/api/v1/admin/ai/improve")
      .set("x-admin-key", mockAdminKey)
      .send({ contentType: "about", text: "" });
    expect(res.status).toBe(400);
  });

  it("improve returns text", async () => {
    const res = await request(app)
      .post("/api/v1/admin/ai/improve")
      .set("x-admin-key", mockAdminKey)
      .send({ contentType: "about", text: "My bio." });
    expect(res.status).toBe(200);
    expect(res.body.data.text).toBe("Polished text");
  });
});
