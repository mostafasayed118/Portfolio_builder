import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { mockAdminKey } from "../helpers";
import app from "../../app";
import { generateContent } from "../../lib/gemini";

vi.mock("../../lib/gemini", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/gemini")>();
  return {
    ...actual,
    generateContent: vi.fn(),
  };
});

const mockedGenerateContent = vi.mocked(generateContent);

describe("AI Assistant API", () => {
  beforeEach(() => {
    mockedGenerateContent.mockReset();
  });

  describe("POST /api/v1/admin/ai-assistant/generate-description", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .post("/api/v1/admin/ai-assistant/generate-description")
        .send({ techStack: ["react"] });
      expect(res.status).toBe(401);
    });

    it("rejects empty techStack", async () => {
      const res = await request(app)
        .post("/api/v1/admin/ai-assistant/generate-description")
        .set("x-admin-key", mockAdminKey)
        .send({ techStack: [] });
      expect(res.status).toBe(400);
    });

    it("returns the Gemini description with valid input", async () => {
      mockedGenerateContent.mockResolvedValue(
        "My App is a full-stack web application built with React, Node.js, and PostgreSQL.",
      );
      const res = await request(app)
        .post("/api/v1/admin/ai-assistant/generate-description")
        .set("x-admin-key", mockAdminKey)
        .send({ techStack: ["react", "node", "postgresql"], title: "My App" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.description).toContain("My App is a full-stack web application");
      expect(mockedGenerateContent).toHaveBeenCalledOnce();
    });

    it("returns 500 when Gemini fails", async () => {
      mockedGenerateContent.mockRejectedValue(new Error("Gemini API 400"));
      const res = await request(app)
        .post("/api/v1/admin/ai-assistant/generate-description")
        .set("x-admin-key", mockAdminKey)
        .send({ techStack: ["react"] });
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/admin/ai-assistant/suggest-categories", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .post("/api/v1/admin/ai-assistant/suggest-categories")
        .send({ skillName: "React" });
      expect(res.status).toBe(401);
    });

    it("rejects empty skillName", async () => {
      const res = await request(app)
        .post("/api/v1/admin/ai-assistant/suggest-categories")
        .set("x-admin-key", mockAdminKey)
        .send({ skillName: "" });
      expect(res.status).toBe(400);
    });

    it("returns the Gemini categories filtered to the whitelist", async () => {
      mockedGenerateContent.mockResolvedValue("Frontend, Backend, Database");
      const res = await request(app)
        .post("/api/v1/admin/ai-assistant/suggest-categories")
        .set("x-admin-key", mockAdminKey)
        .send({ skillName: "React" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.categories).toEqual(["Frontend", "Backend", "Database"]);
    });

    it("drops non-whitelisted categories", async () => {
      mockedGenerateContent.mockResolvedValue("Frontend, SomethingElse");
      const res = await request(app)
        .post("/api/v1/admin/ai-assistant/suggest-categories")
        .set("x-admin-key", mockAdminKey)
        .send({ skillName: "React" });
      expect(res.status).toBe(200);
      expect(res.body.data.categories).toEqual(["Frontend"]);
    });

    it("returns 500 when Gemini returns nothing valid", async () => {
      mockedGenerateContent.mockResolvedValue("No idea");
      const res = await request(app)
        .post("/api/v1/admin/ai-assistant/suggest-categories")
        .set("x-admin-key", mockAdminKey)
        .send({ skillName: "React" });
      expect(res.status).toBe(500);
    });
  });

  describe("POST /api/v1/admin/ai-assistant/suggest-tags", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .post("/api/v1/admin/ai-assistant/suggest-tags")
        .send({ techStack: ["react"] });
      expect(res.status).toBe(401);
    });

    it("returns the Gemini tags with valid input", async () => {
      mockedGenerateContent.mockResolvedValue("react, node, fullstack, webapp");
      const res = await request(app)
        .post("/api/v1/admin/ai-assistant/suggest-tags")
        .set("x-admin-key", mockAdminKey)
        .send({ techStack: ["react", "node"], category: "Full-Stack" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tags).toEqual(["react", "node", "fullstack", "webapp"]);
    });

    it("returns 500 when Gemini fails", async () => {
      mockedGenerateContent.mockRejectedValue(new Error("Gemini API 500"));
      const res = await request(app)
        .post("/api/v1/admin/ai-assistant/suggest-tags")
        .set("x-admin-key", mockAdminKey)
        .send({ techStack: ["react"] });
      expect(res.status).toBe(500);
    });
  });

  describe("POST /api/v1/admin/ai-assistant/analyze-content", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .post("/api/v1/admin/ai-assistant/analyze-content")
        .send({ content: "Test content.", contentType: "hero" });
      expect(res.status).toBe(401);
    });

    it("rejects empty content", async () => {
      const res = await request(app)
        .post("/api/v1/admin/ai-assistant/analyze-content")
        .set("x-admin-key", mockAdminKey)
        .send({ content: "", contentType: "hero" });
      expect(res.status).toBe(400);
    });

    it("rejects invalid contentType", async () => {
      const res = await request(app)
        .post("/api/v1/admin/ai-assistant/analyze-content")
        .set("x-admin-key", mockAdminKey)
        .send({ content: "Test content.", contentType: "invalid" });
      expect(res.status).toBe(400);
    });

    it("returns the parsed Gemini analysis with valid input", async () => {
      mockedGenerateContent.mockResolvedValue(
        JSON.stringify({
          score: 85,
          suggestions: ["Add more detail"],
          strengths: ["Good length"],
        }),
      );
      const res = await request(app)
        .post("/api/v1/admin/ai-assistant/analyze-content")
        .set("x-admin-key", mockAdminKey)
        .send({
          content: "This is a good hero section with enough words to pass the minimum threshold.",
          contentType: "hero",
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({
        score: 85,
        suggestions: ["Add more detail"],
        strengths: ["Good length"],
      });
    });

    it("returns 500 when Gemini output is not parseable JSON", async () => {
      mockedGenerateContent.mockResolvedValue("Here is my analysis: it is good.");
      const res = await request(app)
        .post("/api/v1/admin/ai-assistant/analyze-content")
        .set("x-admin-key", mockAdminKey)
        .send({ content: "Some content.", contentType: "about" });
      expect(res.status).toBe(500);
    });
  });
});
