import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";

// ---------------------------------------------------------------------------
// The admin images list route reuses @workspace/db/images.listEntityImages —
// real code here; the boundary is the Supabase client. The chain is
// from → select → eq → eq → order → order (terminal).
// ---------------------------------------------------------------------------
const { client } = vi.hoisted(() => {
  const client = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn(),
    limit: vi.fn(),
  };
  return { client };
});

vi.mock("../../lib/supabase-client", () => ({
  getSupabaseClient: vi.fn(() => client),
}));

vi.mock("../../middleware/adminAuth", () => ({
  adminAuth: vi.fn((req, res, next) => {
    if (req.headers["x-admin-key"] === "test-key") {
      req.adminEmail = "admin@test.com";
      return next();
    }
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }),
}));

const ROWS = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    storage_path: "projects/abc/original.jpg",
    original_filename: "a.jpg",
    mime_type: "image/jpeg",
    file_size_bytes: 1024,
    entity_type: "projects",
    entity_id: "00000000-0000-0000-0000-00000000000a",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    storage_path: "projects/abc/second.png",
    original_filename: "b.png",
    mime_type: "image/png",
    file_size_bytes: 2048,
    entity_type: "projects",
    entity_id: "00000000-0000-0000-0000-00000000000a",
  },
];

describe("Admin images list API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.from.mockReturnThis();
    client.select.mockReturnThis();
    client.eq.mockReturnThis();
    // listEntityImages chain ends with .limit(MAX_LIST_ROWS).
    client.limit.mockResolvedValue({ data: [], error: null });
  });

  describe("GET /api/v1/admin/images", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .get("/api/v1/admin/images")
        .query({ entity_type: "projects", entity_id: "00000000-0000-0000-0000-00000000000a" });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("returns 400 for an invalid entity type", async () => {
      const res = await request(app)
        .get("/api/v1/admin/images")
        .set("x-admin-key", "test-key")
        .query({ entity_type: "invalid-type", entity_id: "00000000-0000-0000-0000-00000000000a" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.entity_type).toBeDefined();
    });

    it("returns 400 when entity_id is missing or not a uuid", async () => {
      const missing = await request(app)
        .get("/api/v1/admin/images")
        .set("x-admin-key", "test-key")
        .query({ entity_type: "projects" });
      expect(missing.status).toBe(400);
      expect(missing.body.errors.entity_id).toBeDefined();

      const badUuid = await request(app)
        .get("/api/v1/admin/images")
        .set("x-admin-key", "test-key")
        .query({ entity_type: "projects", entity_id: "not-a-uuid" });
      expect(badUuid.status).toBe(400);
      expect(badUuid.body.errors.entity_id).toBeDefined();
    });

    it("returns publicUrls for the entity's images, ordered by sort_order", async () => {
      client.order
        .mockImplementationOnce(() => client)
        .mockImplementationOnce(() => client);
      client.limit.mockResolvedValueOnce({ data: ROWS, error: null });

      const res = await request(app)
        .get("/api/v1/admin/images")
        .set("x-admin-key", "test-key")
        .query({ entity_type: "projects", entity_id: "00000000-0000-0000-0000-00000000000a" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toEqual({
        id: "00000000-0000-0000-0000-000000000001",
        url: expect.stringContaining("/api/v1/images/serve/project_images/projects/abc/original.jpg"),
      });
      expect(res.body.data[1].url).toContain("projects/abc/second.png");
      expect(client.from).toHaveBeenCalledWith("image_metadata");
      expect(client.eq).toHaveBeenCalledWith("entity_type", "projects");
      expect(client.eq).toHaveBeenCalledWith("entity_id", "00000000-0000-0000-0000-00000000000a");
      expect(client.order).toHaveBeenCalledWith("sort_order", { ascending: true });
    });

    it("returns an empty list when the entity has no images", async () => {
      client.order
        .mockImplementationOnce(() => client)
        .mockImplementationOnce(() => client);
      client.limit.mockResolvedValueOnce({ data: [], error: null });

      const res = await request(app)
        .get("/api/v1/admin/images")
        .set("x-admin-key", "test-key")
        .query({ entity_type: "projects", entity_id: "00000000-0000-0000-0000-00000000000a" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it("returns 500 (safe message) when the query fails", async () => {
      client.order
        .mockImplementationOnce(() => client)
        .mockImplementationOnce(() => client);
      client.limit.mockResolvedValueOnce({ data: null, error: { message: "db down" } });

      const res = await request(app)
        .get("/api/v1/admin/images")
        .set("x-admin-key", "test-key")
        .query({ entity_type: "projects", entity_id: "00000000-0000-0000-0000-00000000000a" });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).not.toContain("db down");
    });
  });
});
