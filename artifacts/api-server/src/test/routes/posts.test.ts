import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { mockSupabaseClient, resetSupabaseClient, mockAdminKey } from "../helpers";
import app from "../../app";

vi.mock("../../lib/supabase-client", () => ({
  getSupabaseClient: vi.fn(() => mockSupabaseClient),
}));

const POST_ROW = {
  id: "00000000-0000-0000-0000-000000000001",
  title: "Hello World",
  slug: "hello-world",
  excerpt: "First post",
  cover_image_url: null,
  tags: ["intro"],
  published_at: "2026-01-01T00:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
};

describe("Public posts API", () => {
  beforeEach(() => {
    resetSupabaseClient(mockSupabaseClient);
  });

  describe("GET /api/v1/posts", () => {
    it("returns published posts with public CDN caching headers", async () => {
      mockSupabaseClient.limit.mockResolvedValueOnce({ data: [POST_ROW], error: null });

      const res = await request(app).get("/api/v1/posts");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.headers["cache-control"]).toBe("public, s-maxage=300, stale-while-revalidate=600");
      expect(res.body.data.data[0].slug).toBe("hello-world");
    });

    it("selects the card column set including reading_minutes and excluding content", async () => {
      mockSupabaseClient.limit.mockResolvedValueOnce({ data: [], error: null });

      await request(app).get("/api/v1/posts");

      const selectArg = mockSupabaseClient.select.mock.calls[0]?.[0];
      expect(typeof selectArg).toBe("string");
      expect(selectArg).toContain("reading_minutes");
      expect(selectArg).not.toContain("content");
    });
  });

  describe("GET /api/v1/posts/:slug", () => {
    it("returns one published post with public CDN caching headers", async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({ data: { ...POST_ROW, content: "body" }, error: null });

      const res = await request(app).get("/api/v1/posts/hello-world");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.headers["cache-control"]).toBe("public, s-maxage=300, stale-while-revalidate=600");
      expect(res.body.data.slug).toBe("hello-world");
    });

    it("returns 404 for an unknown slug", async () => {
      const res = await request(app).get("/api/v1/posts/does-not-exist");
      expect(res.status).toBe(404);
    });
  });
});

describe("Admin posts API", () => {
  beforeEach(() => {
    resetSupabaseClient(mockSupabaseClient);
  });

  describe("POST /api/v1/admin/posts", () => {
    it("creates a post and returns 201", async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({ data: { id: POST_ROW.id }, error: null });

      const res = await request(app)
        .post("/api/v1/admin/posts")
        .set("x-admin-key", mockAdminKey)
        .send({ title: "Hello World", slug: "hello-world", content: "body", is_published: true });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it("maps a slug unique-violation (23505) to a 400 field error", async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: "23505", message: "duplicate key value violates unique constraint" },
      });

      const res = await request(app)
        .post("/api/v1/admin/posts")
        .set("x-admin-key", mockAdminKey)
        .send({ title: "Hello World", slug: "hello-world", content: "body" });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        success: false,
        errors: { slug: ["Slug already in use"] },
      });
    });

    it("surfaces non-conflict insert errors as 500", async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: "42P01", message: "relation does not exist" },
      });

      const res = await request(app)
        .post("/api/v1/admin/posts")
        .set("x-admin-key", mockAdminKey)
        .send({ title: "Hello World", slug: "hello-world", content: "body" });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
});
