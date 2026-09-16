import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";

const mockAdminKey = "test-admin-key";
const portfolioId = "11111111-1111-4111-8111-111111111111";

// Override setup.ts mock: getSupabaseClient always returns a shared chain.
// The chain object is created inside the vi.mock factory (hoisted).
// eslint-disable-next-line no-var
var supabaseChain: any;
vi.mock("../../lib/supabase-client", () => {
  supabaseChain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    is: vi.fn().mockReturnThis(),
  };
  return { getSupabaseClient: vi.fn(() => supabaseChain) };
});

vi.mock("../../middleware/adminAuth", () => ({
  adminAuth: vi.fn((req, res, next) => {
    const adminKey = req.headers["x-admin-key"];
    if (adminKey === mockAdminKey) {
      (req as Record<string, unknown>).adminEmail = "admin@test.com";
      // Special header to test no-user scenario
      if (req.headers["x-test-mode"] === "no-user") {
        return next();
      }
      (req as Record<string, unknown>).user = { id: "test-user-id", email: "admin@test.com", role: "superadmin" };
      return next();
    }
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }),
}));

describe("Seed API", () => {
  beforeEach(() => {
    // Reset all chain methods to defaults
    vi.mocked(supabaseChain.from).mockReturnThis();
    vi.mocked(supabaseChain.select).mockReturnThis();
    vi.mocked(supabaseChain.insert).mockResolvedValue({ data: null, error: null });
    vi.mocked(supabaseChain.update).mockReturnThis();
    vi.mocked(supabaseChain.delete).mockReturnThis();
    vi.mocked(supabaseChain.eq).mockReturnThis();
    vi.mocked(supabaseChain.limit).mockReturnThis();
    vi.mocked(supabaseChain.maybeSingle).mockResolvedValue({ data: null, error: null });
    vi.mocked(supabaseChain.single).mockResolvedValue({ data: null, error: null });
    vi.mocked(supabaseChain.order).mockReturnThis();
    vi.mocked(supabaseChain.upsert).mockResolvedValue({ data: null, error: null });
    vi.mocked(supabaseChain.is).mockReturnThis();
  });

  describe("POST /api/v1/admin/seed", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .post("/api/v1/admin/seed")
        .send({});
      expect(res.status).toBe(401);
    });

    it("seeds data with valid admin key", async () => {
      const res = await request(app)
        .post("/api/v1/admin/seed")
        .set("x-admin-key", mockAdminKey)
        .query({ portfolioId })
        .send({});
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("summary");
    });

    it("returns 403 when user is not superadmin", async () => {
      const res = await request(app)
        .post("/api/v1/admin/seed")
        .set("x-admin-key", mockAdminKey)
        .set("x-test-mode", "no-user")
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("seeds data with portfolio_id from the requested portfolio", async () => {
      const res = await request(app)
        .post("/api/v1/admin/seed")
        .set("x-admin-key", mockAdminKey)
        .query({ portfolioId })
        .send({});

      expect(res.status).toBe(200);
      expect(supabaseChain.insert).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ portfolio_id: portfolioId })]),
      );
    });

    it("force mode clears existing portfolio data before insert", async () => {
      const res = await request(app)
        .post("/api/v1/admin/seed?force=true&confirm=true")
        .set("x-admin-key", mockAdminKey)
        .query({ portfolioId })
        .send({});

      // In force mode, update (soft delete) should be called for skills, projects, experience, certifications
      expect(res.status).toBe(200);
      expect(supabaseChain.update).toHaveBeenCalled();
      expect(supabaseChain.eq).toHaveBeenCalledWith("portfolio_id", portfolioId);
    });

    it("non-force mode inserts skills with portfolio_id when none exist", async () => {
      vi.mocked(supabaseChain.eq).mockReturnValue({ ...supabaseChain, data: [], error: null });

      const res = await request(app)
        .post("/api/v1/admin/seed")
        .set("x-admin-key", mockAdminKey)
        .query({ portfolioId })
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.summary.skills).toBe(6);
      expect(supabaseChain.insert).toHaveBeenCalledWith([
        expect.objectContaining({ name: "Python", portfolio_id: portfolioId }),
        expect.objectContaining({ name: "SQL", portfolio_id: portfolioId }),
        expect.objectContaining({ name: "JavaScript", portfolio_id: portfolioId }),
        expect.objectContaining({ name: "React", portfolio_id: portfolioId }),
        expect.objectContaining({ name: "Next.js", portfolio_id: portfolioId }),
        expect.objectContaining({ name: "Azure", portfolio_id: portfolioId }),
      ]);
    });

    it("returns summary with counts for each table", async () => {
      const res = await request(app)
        .post("/api/v1/admin/seed")
        .set("x-admin-key", mockAdminKey)
        .query({ portfolioId })
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("summary");
      expect(res.body.data.summary).toHaveProperty("hero");
      expect(res.body.data.summary).toHaveProperty("about");
      expect(res.body.data.summary).toHaveProperty("skills");
      expect(res.body.data.summary).toHaveProperty("projects");
      expect(res.body.data.summary).toHaveProperty("experience");
      expect(res.body.data.summary).toHaveProperty("certifications");

      expect(typeof res.body.data.summary.hero).toBe("number");
      expect(typeof res.body.data.summary.skills).toBe("number");
      expect(typeof res.body.data.summary.projects).toBe("number");
    });
  });
});
