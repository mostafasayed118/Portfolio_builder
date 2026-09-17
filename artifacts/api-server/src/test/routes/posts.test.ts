import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { mockSupabaseClient, resetSupabaseClient, mockAdminKey } from "../helpers";
import app from "../../app";

vi.mock("../../lib/supabase-client", () => ({
  getSupabaseClient: vi.fn(() => mockSupabaseClient),
  getAnonSupabaseClient: vi.fn(() => mockSupabaseClient),
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
    vi.clearAllMocks();
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

const PORTFOLIO_ID = "11111111-1111-4111-8111-111111111111";

describe("Admin posts API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSupabaseClient(mockSupabaseClient);
    mockSupabaseClient.maybeSingle.mockResolvedValue({ data: { id: PORTFOLIO_ID }, error: null });
  });

  describe("PUT /api/v1/admin/posts/:id", () => {
    it.each([
      { state: { is_published: false, published_at: null }, stamp: true },
      { state: { is_published: true, published_at: "2026-01-01T00:00:00Z" }, stamp: false },
    ])("preserves publish stamps according to existing state $stamp", async ({ state, stamp }) => {
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({ data: state, error: null });
      const updateChain = {
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [{ id: POST_ROW.id }], error: null }),
      };
      mockSupabaseClient.update.mockReturnValueOnce(updateChain);
      const res = await request(app).put(`/api/v1/admin/posts/${POST_ROW.id}?userId=legacy-user`)
        .set("x-admin-key", mockAdminKey).send({ is_published: true });
      expect(res.status).toBe(200);
      expect(mockSupabaseClient.eq.mock.calls).toEqual([["id", POST_ROW.id]]);
      expect(updateChain.eq.mock.calls).toEqual([["id", POST_ROW.id]]);
      if (stamp) {
        expect(mockSupabaseClient.update).toHaveBeenCalledWith({ is_published: true, published_at: expect.any(String) });
      } else {
        expect(mockSupabaseClient.update).toHaveBeenCalledWith({ is_published: true });
      }
    });

    it("returns 404 when the request-client update matches no owned row", async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const updateChain = {
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockSupabaseClient.update.mockReturnValueOnce(updateChain);
      const res = await request(app).put(`/api/v1/admin/posts/${POST_ROW.id}`)
        .set("x-admin-key", mockAdminKey).send({ is_published: true });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ success: false, message: "Post not found" });
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({ is_published: true });
    });
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
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(expect.objectContaining({
        portfolio_id: PORTFOLIO_ID,
        title: "Hello World",
        is_published: true,
      }));
      expect(mockSupabaseClient.insert.mock.calls[0]?.[0]).not.toHaveProperty("user_id");
    });

    it("rejects creation without a portfolio before inserting", async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValue({ data: null, error: null });
      const res = await request(app).post("/api/v1/admin/posts")
        .set("x-admin-key", mockAdminKey).send({ title: "Hello", slug: "hello", content: "body" });
      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual({ portfolioId: ["Create a portfolio first"] });
      expect(mockSupabaseClient.insert).not.toHaveBeenCalled();
    });

    it("maps a foreign portfolio insert denied by RLS to 404", async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null, error: { code: "42501", message: "RLS denied" },
      });
      const res = await request(app).post(`/api/v1/admin/posts?portfolioId=${PORTFOLIO_ID}`)
        .set("x-admin-key", mockAdminKey).send({ title: "Hello", slug: "hello", content: "body" });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ success: false, message: "Not found." });
      expect(mockSupabaseClient.insert.mock.calls[0]?.[0]).not.toHaveProperty("user_id");
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(expect.objectContaining({ portfolio_id: PORTFOLIO_ID }));
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
