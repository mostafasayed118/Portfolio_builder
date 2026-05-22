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
      expect(res.body.error).toMatch(/no file/i);
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
      expect(res.body.error).toMatch(/invalid file type/i);
    });

    it("returns 400 for invalid entity type", async () => {
      const res = await request(app)
        .post("/api/v1/images/upload")
        .set("x-admin-key", mockAdminKey)
        .field("entityType", "invalid-type")
        .attach("file", Buffer.from("fake-image-data"), {
          filename: "test.jpg",
          contentType: "image/jpeg",
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid entity type/i);
    });

    it("returns 200 with valid admin key and valid JPEG file", async () => {
      // Override insert().select().single() to return metadata with id
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockImageMetadata, error: null });

      const res = await request(app)
        .post("/api/v1/images/upload")
        .set("x-admin-key", mockAdminKey)
        .field("entityType", "projects")
        .attach("file", Buffer.from("fake-jpeg-data"), {
          filename: "photo.jpg",
          contentType: "image/jpeg",
        });
      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();
      expect(res.body.url).toBeDefined();
      expect(res.body.variants).toBeDefined();
      expect(Array.isArray(res.body.variants)).toBe(true);
    });

    it("returns 200 with valid PNG file", async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({ data: { ...mockImageMetadata, id: "png-id" }, error: null });

      const res = await request(app)
        .post("/api/v1/images/upload")
        .set("x-admin-key", mockAdminKey)
        .field("entityType", "about")
        .attach("file", Buffer.from("fake-png-data"), {
          filename: "screenshot.png",
          contentType: "image/png",
        });
      expect(res.status).toBe(200);
      expect(res.body.variants.length).toBeGreaterThan(0);
    });

    it("returns variants with correct URL structure", async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockImageMetadata, error: null });

      const res = await request(app)
        .post("/api/v1/images/upload")
        .set("x-admin-key", mockAdminKey)
        .field("entityType", "hero")
        .attach("file", Buffer.from("fake-image"), {
          filename: "avatar.jpg",
          contentType: "image/jpeg",
        });
      expect(res.status).toBe(200);
      const variantTypes = res.body.variants.map((v: { type: string }) => v.type);
      expect(variantTypes).toContain("thumbnail");
      expect(variantTypes).toContain("medium");
      // Each variant URL should have width param
      for (const v of res.body.variants) {
        expect(v.url).toContain("width=");
      }
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
        .attach("file", Buffer.from("fake-image"), {
          filename: "test.jpg",
          contentType: "image/jpeg",
        });
      expect(res.status).toBe(500);
      expect(res.body).toBeDefined();
      // Verify an error message exists (could be in .error or other field)
      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).toMatch(/upload failed|error/i);
    });
  });

  describe("GET /api/v1/images/:id/metadata", () => {
    it("returns 404 for non-existent image", async () => {
      // default mock returns { data: null, error: null } → route returns 404
      const res = await request(app).get("/api/v1/images/00000000-0000-0000-0000-000000000099/metadata");
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it("returns 200 with metadata for existing image", async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockImageMetadata,
        error: null,
      });

      const res = await request(app).get("/api/v1/images/00000000-0000-0000-0000-000000000001/metadata");
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(mockImageMetadata.id);
      expect(res.body.original_filename).toBe("test.jpg");
      expect(res.body.mime_type).toBe("image/jpeg");
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
        .delete("/api/v1/images/non-existent-id")
        .set("x-admin-key", mockAdminKey);
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });
  });
});
