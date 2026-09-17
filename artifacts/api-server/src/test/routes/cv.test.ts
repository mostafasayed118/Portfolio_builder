import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { mockAdminKey, mockSupabaseClient, resetSupabaseClient } from "../helpers";
import { _setOverride, _resetOverrides } from "../../lib/env";
import app from "../../app";
import { adminAuth } from "../../middleware/adminAuth";

const { mockGenerateCvPdf, portfolioQuery } = vi.hoisted(() => ({
  mockGenerateCvPdf: vi.fn(),
  portfolioQuery: {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  },
}));

beforeEach(() => {
  vi.mocked(adminAuth).mockImplementation(async (req, res, next) => {
    if (req.headers["x-admin-key"] === mockAdminKey) {
      req.adminEmail = "api-key-admin";
      next();
      return;
    }
    if (req.headers.authorization === "Bearer test-session") {
      req.clerkToken = "test-session";
      req.clerkSub = "user_owner";
      next();
      return;
    }
    res.status(401).json({ success: false });
  });
});

vi.mock("../../lib/supabase-client", () => ({
  getSupabaseClient: vi.fn(() => mockSupabaseClient),
  getAnonSupabaseClient: vi.fn(() => mockSupabaseClient),
  getRequestSupabaseClient: vi.fn(() => mockSupabaseClient),
}));

vi.mock("../../utils/cv-generator", () => ({
  generateCvPdf: mockGenerateCvPdf,
}));

beforeEach(() => {
  // The generated PDF is cached in memory (CV_PDF_CACHE_TTL_MS, default 5
  // min). Disable the cache by default so each test exercises generation or
  // the fallback path independently; the cache-specific tests below re-enable
  // it via their own overrides.
  _setOverride("CV_PDF_CACHE_TTL_MS", "0");
  vi.clearAllMocks();
  resetSupabaseClient(mockSupabaseClient);
  mockSupabaseClient.from.mockImplementation((table: string) => ["portfolios", "public_portfolios"].includes(table) ? portfolioQuery : mockSupabaseClient);
  portfolioQuery.maybeSingle.mockReset();
  portfolioQuery.maybeSingle.mockResolvedValue({ data: { id: "11111111-1111-4111-8111-111111111111" }, error: null });
  mockSupabaseClient.storage.download.mockReset();
  mockSupabaseClient.storage.download.mockResolvedValue({
    data: { arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) },
    error: null,
  });
  mockGenerateCvPdf.mockReset();
  mockGenerateCvPdf.mockResolvedValue(Buffer.from("%PDF-1.4 fake pdf content"));
});

afterEach(() => {
  _resetOverrides();
});

describe("CV API", () => {
  describe("GET /api/v1/cv", () => {
    it("disables downstream caching so unpublishing revokes subsequent downloads", async () => {
      mockGenerateCvPdf.mockResolvedValueOnce(Buffer.from("%PDF-1.4 cache headers"));

      const res = await request(app).get("/api/v1/cv");

      expect(res.status).toBe(200);
      expect(res.headers["cache-control"]).toBe("private, no-store");
    });

    it("denies a download after the portfolio is unpublished, even after a successful request", async () => {
      expect((await request(app).get("/api/v1/cv")).status).toBe(200);
      _setOverride("CV_PDF_CACHE_TTL_MS", "60000");
      portfolioQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
      const response = await request(app).get("/api/v1/cv");
      expect(response.status).toBe(404);
      expect(response.headers["cache-control"]).toBe("private, no-store");
    });

    it("scopes PDF generation to the resolved published portfolio", async () => {
      const response = await request(app).get("/api/v1/cv");
      expect(response.status).toBe(200);
      expect(mockGenerateCvPdf).toHaveBeenCalledWith(
        mockSupabaseClient, expect.any(String), "11111111-1111-4111-8111-111111111111",
      );
    });

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
        data: { object_path: "11111111-1111-4111-8111-111111111111/cv-1.pdf", file_name: "My_Resume.pdf" },
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

    it("regenerates on repeat requests rather than retaining formerly public bytes", async () => {
      // Prime the cache with a known buffer. With TTL 0 the entry is written
      // but never read, so this request always regenerates.
      _setOverride("CV_PDF_CACHE_TTL_MS", "0");
      const fakePdf = Buffer.from("%PDF-1.4 cached-content");
      mockGenerateCvPdf.mockResolvedValueOnce(fakePdf);
      await request(app).get("/api/v1/cv");

      // Enable the cache: the entry written just above is now fresh.
      _setOverride("CV_PDF_CACHE_TTL_MS", "60000");
      mockGenerateCvPdf.mockClear();

      const first = await request(app).get("/api/v1/cv");
      const second = await request(app).get("/api/v1/cv");

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(mockGenerateCvPdf).toHaveBeenCalledTimes(2);
      expect(first.headers["cache-control"]).toBe("private, no-store");
      expect(second.headers["cache-control"]).toBe("private, no-store");
    });

    it("coalesces concurrent misses into a single generation", async () => {
      // TTL 0 keeps the cache out of the picture so this isolates the
      // in-flight dedup path specifically.
      _setOverride("CV_PDF_CACHE_TTL_MS", "0");
      const fakePdf = Buffer.from("%PDF-1.4 concurrent-content");
      mockGenerateCvPdf.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(fakePdf), 20),
          ),
      );

      const responses = await Promise.all([
        request(app).get("/api/v1/cv"),
        request(app).get("/api/v1/cv"),
        request(app).get("/api/v1/cv"),
      ]);

      expect(mockGenerateCvPdf).toHaveBeenCalledTimes(1);
      for (const res of responses) {
        expect(res.status).toBe(200);
        expect(res.body).toEqual(fakePdf);
      }
    });

    it("serves the storage fallback to every concurrent request when generation rejects", async () => {
      // TTL 0 isolates the in-flight dedup path. A slow rejection lets all
      // three requests join the shared promise; when it rejects, each
      // handler must fall back to storage independently.
      _setOverride("CV_PDF_CACHE_TTL_MS", "0");
      const fallbackBytes = new TextEncoder().encode("%PDF-1.4 concurrent-fallback");
      mockGenerateCvPdf.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("generation down")), 20),
          ),
      );
      mockSupabaseClient.maybeSingle.mockResolvedValue({
        data: { object_path: "11111111-1111-4111-8111-111111111111/cv-2.pdf", file_name: "Fallback_CV.pdf" },
        error: null,
      });
      mockSupabaseClient.storage.download.mockResolvedValue({
        data: { arrayBuffer: () => Promise.resolve(fallbackBytes.buffer) },
        error: null,
      });

      const responses = await Promise.all([
        request(app).get("/api/v1/cv"),
        request(app).get("/api/v1/cv"),
        request(app).get("/api/v1/cv"),
      ]);

      // Shared rejection: one generation attempt coalesces the waiters.
      expect(mockGenerateCvPdf).toHaveBeenCalledTimes(1);
      for (const res of responses) {
        expect(res.status).toBe(200);
        expect(res.headers["content-disposition"]).toMatch(/Fallback_CV\.pdf/);
        expect(res.body).toEqual(Buffer.from(fallbackBytes));
      }
    });

    it("regenerates the PDF after the cache TTL expires", async () => {
      // Prime the cache deterministically (TTL 0 writes without reads).
      _setOverride("CV_PDF_CACHE_TTL_MS", "0");
      await request(app).get("/api/v1/cv");

      _setOverride("CV_PDF_CACHE_TTL_MS", "1");
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      await sleep(10);

      const res = await request(app).get("/api/v1/cv");

      expect(res.status).toBe(200);
      // Priming (1) + regeneration after expiry (2).
      expect(mockGenerateCvPdf).toHaveBeenCalledTimes(2);
    });
  });

  describe("GET /api/v1/admin/cv/settings", () => {
    it("returns an owned portfolio for upload and scopes settings to it", async () => {
      const res = await request(app).get("/api/v1/admin/cv/settings").set("Authorization", "Bearer test-session");
      expect(res.status).toBe(200);
      expect(res.body.data.portfolioId).toBe("11111111-1111-4111-8111-111111111111");
      expect(portfolioQuery.eq).toHaveBeenCalledWith("owner_user_id", "user_owner");
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith("portfolio_id", res.body.data.portfolioId);
    });

    it("rejects a caller without an owned portfolio instead of returning published settings", async () => {
      portfolioQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
      const res = await request(app).get("/api/v1/admin/cv/settings").set("Authorization", "Bearer test-session");
      expect(res.status).toBe(400);
      expect(mockSupabaseClient.from).not.toHaveBeenCalledWith("cv_settings");
    });

    it("verifies ownership even for an explicit published portfolio", async () => {
      portfolioQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
      const res = await request(app).get("/api/v1/admin/cv/settings")
        .query({ portfolioId: "22222222-2222-4222-8222-222222222222" }).set("Authorization", "Bearer test-session");
      expect(res.status).toBe(400);
      expect(portfolioQuery.eq).toHaveBeenCalledWith("owner_user_id", "user_owner");
      expect(mockSupabaseClient.from).not.toHaveBeenCalledWith("cv_settings");
    });
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
        .send({ objectPath: "cv-1700000000000.pdf", fileName: "resume.pdf" });
      expect([400, 401]).toContain(res.status);
    });

    it("returns 400 for invalid data (non-PDF filename)", async () => {
      const res = await request(app)
        .put("/api/v1/admin/cv/settings")
        .set("x-admin-key", mockAdminKey)
        .send({ objectPath: "cv-1700000000000.pdf", fileName: "resume.docx" });
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
        .send({ objectPath: "cv-1700000000000.pdf" });
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
        .query({ portfolioId: "11111111-1111-4111-8111-111111111111" })
        .send({ objectPath: "cv-1700000000000.pdf", fileName: "resume.pdf" });
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
        .query({ portfolioId: "11111111-1111-4111-8111-111111111111" })
        .send({ objectPath: "cv-1700000000000.pdf", fileName: "resume.pdf" });
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe("new-id-456");
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        object_path: "11111111-1111-4111-8111-111111111111/cv-1700000000000.pdf",
        file_name: "resume.pdf",
        portfolio_id: "11111111-1111-4111-8111-111111111111",
      });
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith("portfolio_id", "11111111-1111-4111-8111-111111111111");
    });

    it("rejects non-PDF filenames with pattern validation", async () => {
      const res = await request(app)
        .put("/api/v1/admin/cv/settings")
        .set("x-admin-key", mockAdminKey)
        .send({ objectPath: "cv-1700000000000.pdf", fileName: "resume.exe" });
      expect(res.status).toBe(400);
    });
  });
});
