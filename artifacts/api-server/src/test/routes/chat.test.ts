import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";
import { generateText, isAiConfigured } from "../../lib/ai/client";

vi.mock("../../middleware/rateLimiter", () => {
  const pass = (_req: unknown, _res: unknown, next: () => void) => next();
  return {
    generalLimiter: pass,
    contactLimiter: pass,
    adminLimiter: pass,
    apiKeyLimiter: pass,
    imageMetadataLimiter: pass,
    imageUploadLimiter: pass,
    chatLimiter: pass,
  };
});

vi.mock("../../lib/ai/client", () => ({
  generateText: vi.fn(),
  generateJson: vi.fn(),
  isAiConfigured: vi.fn(() => true),
  AiError: class extends Error {},
}));

describe("POST /api/v1/chat", () => {
  beforeEach(() => {
    vi.mocked(generateText).mockReset();
    vi.mocked(generateText).mockResolvedValue("Hi!");
    vi.mocked(isAiConfigured).mockReset();
    vi.mocked(isAiConfigured).mockReturnValue(true);
  });

  it("returns enabled true in config", async () => {
    const res = await request(app).get("/api/v1/chat/config");
    expect(res.status).toBe(200);
    expect(res.body.data.enabled).toBe(true);
  });

  it("rejects empty messages", async () => {
    const res = await request(app).post("/api/v1/chat").send({ messages: [] });
    expect(res.status).toBe(400);
  });

  it("returns a reply on success", async () => {
    const res = await request(app).post("/api/v1/chat").send({ messages: [{ role: "user", content: "Who are you?" }] });
    expect(res.status).toBe(200);
    expect(res.body.data.reply).toBe("Hi!");
  });

  it("returns 503 when AI is not configured", async () => {
    vi.mocked(isAiConfigured).mockReturnValue(false);
    const res = await request(app).post("/api/v1/chat").send({ messages: [{ role: "user", content: "hi" }] });
    expect(res.status).toBe(503);
  });
});
