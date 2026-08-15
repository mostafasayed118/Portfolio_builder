import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { mockAdminKey, mockSupabaseClient, resetSupabaseClient } from "../helpers";
import app from "../../app";

const { mockGenerateCvPdf } = vi.hoisted(() => ({
  mockGenerateCvPdf: vi.fn(),
}));

vi.mock("../../lib/supabase-client", () => ({
  getSupabaseClient: vi.fn(() => mockSupabaseClient),
}));

vi.mock("../../utils/cv-generator", () => ({
  generateCvPdf: mockGenerateCvPdf,
}));

beforeEach(() => {
  resetSupabaseClient(mockSupabaseClient);
  mockSupabaseClient.storage.download.mockReset();
  mockSupabaseClient.storage.download.mockResolvedValue({
    data: { arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) },
    error: null,
  });
  mockGenerateCvPdf.mockReset();
  mockGenerateCvPdf.mockResolvedValue(Buffer.from("%PDF-1.4 fake pdf content"));
});

describe("CV API", () => {
  describe("GET /api/v1/cv", () => {
    it("returns PDF with correct headers when generateCvPdf succeeds", async () => {
      const fakePdf = Buffer.from("%PDF-1.4 generated cv");
      mockGenerateCvPdf.mockResolvedValueOnce(fakePdf);

      const res = await request(app).get("/api/v1/cv");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/application\/pdf/);
      expect(res.headers["content-disposition"]).toMatch(/attachment/);
      expect(res.headers["content-disposition"]).toMatch(/Mustafa_Sayed_CV\.pdf/);
    });

    it("returns PDF buffer matching generated output", async () => {
      const fakePdf = Buffer.from("%PDF-1.4 test-content-12345");
      mockGenerateCvPdf.mockResolvedValueOnce(fakePdf);

      const res = await request(app).get("/api/v1/cv");

      expect(res.status).toBe(200);
      expect(res.headers["content-length"]).toBe(String(fakePdf.length));
    });

    it("falls back to uploaded CV when generation fails", async () => {
      mockGenerateCvPdf.mockRejectedValueOnce(new Error("PDF generation failed"));

      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: { object_path: "cv/resume.pdf", file_name: "My_Resume.pdf" },
        error: null,
      });

      const res = await request(app).get("/api/v1/cv");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/application\/pdf/);
      expect(res.headers["content-disposition"]).toMatch(/My_Resume\.pdf/);
    });

    it("returns 404 when no CV exists and generation fails", async () => {
      mockGenerateCvPdf.mockRejectedValueOnce(new Error("Generation failed"));

      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const res = await request(app).get("/api/v1/cv");

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/no cv/i);
    });

    it("returns 500 when cv_settings DB query fails in fallback", async () => {
      mockGenerateCvPdf.mockRejectedValueOnce(new Error("Generation failed"));

      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "DB connection lost" },
      });

      const res = await request(app).get("/api/v1/cv");

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/failed to fetch cv settings/i);
    });
  });

  describe("GET /api/v1/admin/cv/settings", () => {
    it("returns correct response shape", async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: {
          object_path: "cv/test.pdf",
          file_name: "resume.pdf",
          updated_at: "2026-01-01T00:00:00Z",
        },
        error: null,
      });

      const res = await request(app)
        .get("/api/v1/admin/cv/settings")
        .set("x-admin-key", mockAdminKey);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("objectPath");
      expect(res.body.data).toHaveProperty("fileName");
      expect(res.body.data).toHaveProperty("updatedAt");
      expect(res.body.data.objectPath).toBe("cv/test.pdf");
      expect(res.body.data.fileName).toBe("resume.pdf");
    });

    it("returns null values when no settings exist", async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const res = await request(app)
        .get("/api/v1/admin/cv/settings")
        .set("x-admin-key", mockAdminKey);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.objectPath).toBeNull();
      expect(res.body.data.fileName).toBeNull();
    });

    it("returns 500 when DB query fails", async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Connection timeout" },
      });

      const res = await request(app)
        .get("/api/v1/admin/cv/settings")
        .set("x-admin-key", mockAdminKey);

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/failed to fetch cv settings/i);
    });
  });

  describe("PUT /api/v1/admin/cv/settings", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .put("/api/v1/admin/cv/settings")
        .send({ objectPath: "/path/to/file", fileName: "resume.pdf" });
      expect([400, 401]).toContain(res.status);
    });

    it("returns 400 for invalid data (non-PDF filename)", async () => {
      const res = await request(app)
        .put("/api/v1/admin/cv/settings")
        .set("x-admin-key", mockAdminKey)
        .send({ objectPath: "/path/to/file", fileName: "resume.docx" });
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it("returns 400 when objectPath is missing", async () => {
      const res = await request(app)
        .put("/api/v1/admin/cv/settings")
        .set("x-admin-key", mockAdminKey)
        .send({ fileName: "resume.pdf" });
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it("returns 400 when fileName is missing", async () => {
      const res = await request(app)
        .put("/api/v1/admin/cv/settings")
        .set("x-admin-key", mockAdminKey)
        .send({ objectPath: "/cv/resume.pdf" });
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it("returns 200 with valid data when existing record exists", async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: { id: "existing-id-123" },
        error: null,
      });

      const res = await request(app)
        .put("/api/v1/admin/cv/settings")
        .set("x-admin-key", mockAdminKey)
        .send({ objectPath: "/cv/resume.pdf", fileName: "resume.pdf" });
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe("existing-id-123");
    });

    it("returns 200 and inserts when no existing record", async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: "new-id-456" },
        error: null,
      });

      const res = await request(app)
        .put("/api/v1/admin/cv/settings")
        .set("x-admin-key", mockAdminKey)
        .send({ objectPath: "/cv/resume.pdf", fileName: "resume.pdf" });
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe("new-id-456");
    });

    it("rejects non-PDF filenames with pattern validation", async () => {
      const res = await request(app)
        .put("/api/v1/admin/cv/settings")
        .set("x-admin-key", mockAdminKey)
        .send({ objectPath: "/path/to/file", fileName: "resume.exe" });
      expect(res.status).toBe(400);
    });
  });
});
