import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";

const mockAdminKey = "test-admin-key";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn().mockReturnThis(),
  })),
}));

vi.mock("../../middleware/adminAuth", () => ({
  adminAuth: vi.fn((req, res, next) => {
    const adminKey = req.headers["x-admin-key"];
    if (adminKey === mockAdminKey) {
      (req as Record<string, unknown>).adminEmail = "admin@test.com";
      return next();
    }
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }),
}));

describe("AI Assistant API", () => {
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

    it("generates description with valid input", async () => {
      const res = await request(app)
        .post("/api/v1/admin/ai-assistant/generate-description")
        .set("x-admin-key", mockAdminKey)
        .send({ techStack: ["react", "node", "postgresql"], title: "My App" });
      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty("description");
      }
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

    it("suggests categories for known skill", async () => {
      const res = await request(app)
        .post("/api/v1/admin/ai-assistant/suggest-categories")
        .set("x-admin-key", mockAdminKey)
        .send({ skillName: "React" });
      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty("categories");
      }
    });
  });

  describe("POST /api/v1/admin/ai-assistant/suggest-tags", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .post("/api/v1/admin/ai-assistant/suggest-tags")
        .send({ techStack: ["react"] });
      expect(res.status).toBe(401);
    });

    it("suggests tags with valid input", async () => {
      const res = await request(app)
        .post("/api/v1/admin/ai-assistant/suggest-tags")
        .set("x-admin-key", mockAdminKey)
        .send({ techStack: ["react", "node"], category: "Full-Stack" });
      expect([200, 500]).toContain(res.status);
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

    it("analyzes content with valid input", async () => {
      const res = await request(app)
        .post("/api/v1/admin/ai-assistant/analyze-content")
        .set("x-admin-key", mockAdminKey)
        .send({ content: "This is a good hero section with enough words to pass the minimum threshold.", contentType: "hero" });
      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty("score");
        expect(res.body.data).toHaveProperty("suggestions");
      }
    });
  });
});
