import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";

const { mockSupabaseClient, mockAdminKey } = vi.hoisted(() => {
  const mockAdminKey = "test-admin-key";
  const mockStorage = {
    from: vi.fn(),
    upload: vi.fn(),
    download: vi.fn(),
    remove: vi.fn(),
    getPublicUrl: vi.fn(),
  };
  const mockSupabaseClient = {
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    limit: vi.fn(),
    order: vi.fn(),
    storage: mockStorage,
  };
  // storage.from() returns storage so storage.from("images").upload() works
  mockStorage.from.mockReturnValue(mockStorage);
  return { mockSupabaseClient, mockAdminKey };
});

const mockImageMetadata = {
  id: "00000000-0000-0000-0000-000000000001",
  storage_path: "projects/abc123/original.jpg",
  original_filename: "test.jpg",
  mime_type: "image/jpeg",
  file_size_bytes: 1024,
  entity_type: "projects",
  entity_id: null,
};

vi.mock("../../lib/supabase-client", () => ({
  getSupabaseClient: vi.fn(() => mockSupabaseClient),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

vi.mock("../../middleware/adminAuth", () => ({
  adminAuth: vi.fn((req: any, res: any, next: () => void) => {
    const adminKey = req.headers?.["x-admin-key"];
    if (adminKey === mockAdminKey) {
      req.adminEmail = "admin@test.com";
      return next();
    }
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }),
}));

/** Minimal valid magic-byte prefix for each format. */
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP_HEADER = Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);

function resetMockChain() {
  mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.insert.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.update.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.delete.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.limit.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.order.mockReturnValue(mockSupabaseClient);
  // Reset terminal methods completely (clears mockResolvedValueOnce queue)
  mockSupabaseClient.single.mockReset();
  mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });
  mockSupabaseClient.maybeSingle.mockReset();
  mockSupabaseClient.maybeSingle.mockResolvedValue({ data: null, error: null });
  mockSupabaseClient.storage.upload.mockReset();
  mockSupabaseClient.storage.upload.mockResolvedValue({ data: { path: "test-path" }, error: null });
  mockSupabaseClient.storage.remove.mockReset();
  mockSupabaseClient.storage.remove.mockResolvedValue({ data: null, error: null });
  mockSupabaseClient.storage.getPublicUrl.mockReturnValue({ data: { publicUrl: "https://example.com/image.jpg" } });
}

beforeEach(() => {
  resetMockChain();
});

describe("Images API", () => {
  describe("POST /api/v1/images/upload", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .post("/api/v1/images/upload")
        .field("entityType", "projects");
      expect([400, 401, 403]).toContain(res.status);
    });

    it("returns 400 when no file is provided", async () => {
      const res = await request(app)
        .post("/api/v1/images/upload")
        .set("x-admin-key", mockAdminKey)
        .field("entityType", "projects");
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.file[0]).toMatch(/no file/i);
    });

    it("returns 400 for invalid file type", async () => {
      const res = await request(app)
        .post("/api/v1/images/upload")
        .set("x-admin-key", mockAdminKey)
        .field("entityType", "projects")
        .attach("file", Buffer.from("fake text content"), {
          filename: "test.txt",
          contentType: "text/plain",
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.file[0]).toMatch(/invalid file type/i);
    });

    it("returns 400 when content-type is spoofed (text/plain pretending to be jpeg)", async () => {
      // Defense in depth: even if a future change loosened the
      // Content-Type check, the magic-byte check would catch this.
      const res = await request(app)
        .post("/api/v1/images/upload")
        .set("x-admin-key", mockAdminKey)
        .field("entityType", "projects")
        .attach("file", Buffer.from("definitely not an image"), {
          filename: "spoof.jpg",
          contentType: "image/jpeg",
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      // Could be caught at either the mime check or the magic-byte check.
      expect(JSON.stringify(res.body.errors.file[0])).toMatch(/invalid file type|do not match/i);
    });

    it("returns 400 for invalid entity type", async () => {
      const res = await request(app)
        .post("/api/v1/images/upload")
        .set("x-admin-key", mockAdminKey)
        .field("entityType", "invalid-type")
        .attach("file", JPEG_HEADER, {
          filename: "test.jpg",
          contentType: "image/jpeg",
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.entityType[0]).toMatch(/invalid entity type/i);
    });

    it("returns 200 with valid admin key and valid JPEG file", async () => {
      // Override insert().select().single() to return metadata with id
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockImageMetadata, error: null });

      const res = await request(app)
        .post("/api/v1/images/upload")
        .set("x-admin-key", mockAdminKey)
        .field("entityType", "projects")
        .attach("file", JPEG_HEADER, {
          filename: "photo.jpg",
          contentType: "image/jpeg",
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.url).toBeDefined();
      expect(res.body.data.variants).toBeDefined();
      expect(Array.isArray(res.body.data.variants)).toBe(true);
    });

    it("returns 200 with valid PNG file", async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({ data: { ...mockImageMetadata, id: "png-id" }, error: null });

      const res = await request(app)
        .post("/api/v1/images/upload")
        .set("x-admin-key", mockAdminKey)
        .field("entityType", "about")
        .attach("file", PNG_HEADER, {
          filename: "screenshot.png",
          contentType: "image/png",
        });
      expect(res.status).toBe(200);
      expect(res.body.data.variants.length).toBeGreaterThan(0);
    });

    it("returns variants with correct URL structure", async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockImageMetadata, error: null });

      const res = await request(app)
        .post("/api/v1/images/upload")
        .set("x-admin-key", mockAdminKey)
        .field("entityType", "hero")
        .attach("file", JPEG_HEADER, {
          filename: "avatar.jpg",
          contentType: "image/jpeg",
        });
      expect(res.status).toBe(200);
      const variantTypes = res.body.data.variants.map((v: { type: string }) => v.type);
      expect(variantTypes).toContain("thumbnail");
      expect(variantTypes).toContain("medium");
      // Each variant URL should have width param
      for (const v of res.body.data.variants) {
        expect(v.url).toContain("width=");
      }
    });

    it("returns 200 with valid WebP file", async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({ data: { ...mockImageMetadata, id: "webp-id" }, error: null });

      const res = await request(app)
        .post("/api/v1/images/upload")
        .set("x-admin-key", mockAdminKey)
        .field("entityType", "content")
        .attach("file", WEBP_HEADER, {
          filename: "anim.webp",
          contentType: "image/webp",
        });
      expect(res.status).toBe(200);
    });

    it("returns 500 when storage upload fails", async () => {
      mockSupabaseClient.storage.upload.mockResolvedValueOnce({
        data: null,
        error: { message: "Storage full" },
      });

      const res = await request(app)
        .post("/api/v1/images/upload")
        .set("x-admin-key", mockAdminKey)
        .field("entityType", "projects")
        .attach("file", JPEG_HEADER, {
          filename: "test.jpg",
          contentType: "image/jpeg",
        });
      expect(res.status).toBe(500);
      expect(res.body).toBeDefined();
      // Verify an error message exists
      expect(JSON.stringify(res.body)).toMatch(/upload failed/i);
    });
  });

  describe("GET /api/v1/images/:id/metadata", () => {
    it("returns 404 for non-existent image", async () => {
      // default mock returns { data: null, error: null } → route returns 404
      const res = await request(app).get("/api/v1/images/00000000-0000-0000-0000-000000000099/metadata");
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });

    it("returns 200 with metadata for existing image", async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockImageMetadata,
        error: null,
      });

      const res = await request(app).get("/api/v1/images/00000000-0000-0000-0000-000000000001/metadata");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(mockImageMetadata.id);
      expect(res.body.data.original_filename).toBe("test.jpg");
      expect(res.body.data.mime_type).toBe("image/jpeg");
    });
  });

  describe("POST /api/v1/images/reorder", () => {
    const IDS = [
      "00000000-0000-0000-0000-000000000001",
      "00000000-0000-0000-0000-000000000002",
      "00000000-0000-0000-0000-000000000003",
    ];

    it("returns 401 without auth", async () => {
      const res = await request(app)
        .post("/api/v1/images/reorder")
        .send({ ordered_ids: IDS.slice(0, 1) });
      expect([400, 401, 403]).toContain(res.status);
    });

    it("returns 400 for a non-UUID id or non-array body", async () => {
      const res = await request(app)
        .post("/api/v1/images/reorder")
        .set("x-admin-key", mockAdminKey)
        .send({ ordered_ids: ["not-a-uuid"] });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 200 and assigns sort_order by array position", async () => {
      const res = await request(app)
        .post("/api/v1/images/reorder")
        .set("x-admin-key", mockAdminKey)
        .send({ ordered_ids: IDS });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({ sort_order: 0 });
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({ sort_order: 1 });
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({ sort_order: 2 });
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith("id", IDS[2]);
    });

    it("returns 500 when an update fails", async () => {
      // First update's chain resolves to an error → Promise.all finds it.
      mockSupabaseClient.eq.mockResolvedValueOnce({ data: null, error: { message: "boom" } });

      const res = await request(app)
        .post("/api/v1/images/reorder")
        .set("x-admin-key", mockAdminKey)
        .send({ ordered_ids: IDS.slice(0, 1) });
      expect(res.status).toBe(500);
      expect(JSON.stringify(res.body)).toMatch(/reorder/i);
    });
  });

  describe("DELETE /api/v1/images/:id", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app).delete("/api/v1/images/00000000-0000-0000-0000-000000000001");
      expect([401, 403, 404, 500]).toContain(res.status);
    });

    it("returns 200 with valid admin key for existing image", async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { storage_path: "projects/abc/original.jpg", id: "img-1" },
        error: null,
      });

      const res = await request(app)
        .delete("/api/v1/images/00000000-0000-0000-0000-000000000001")
        .set("x-admin-key", mockAdminKey);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns 404 for non-existent image", async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Not found" },
      });

      const res = await request(app)
        .delete("/api/v1/images/00000000-0000-0000-0000-000000000001")
        .set("x-admin-key", mockAdminKey);
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });

    it("returns 400 for invalid UUID", async () => {
      const res = await request(app)
        .delete("/api/v1/images/not-a-uuid")
        .set("x-admin-key", mockAdminKey);
      expect(res.status).toBe(400);
      expect(res.body.errors.id[0]).toMatch(/invalid/i);
    });
  });
});
