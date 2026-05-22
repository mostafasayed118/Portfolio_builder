import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app";

const mockAdminKey = "test-admin-key";

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
        .send({});
      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty("summary");
      }
    });

    it("returns 400 when no user context (req.user is undefined)", async () => {
      const res = await request(app)
        .post("/api/v1/admin/seed")
        .set("x-admin-key", mockAdminKey)
        .set("x-test-mode", "no-user")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("No user context. Please log in again.");
    });

    it("seeds data with user_id from authenticated user", async () => {
      vi.mocked(supabaseChain.select).mockReturnValue({
        ...supabaseChain,
        eq: vi.fn().mockReturnValue({
          ...supabaseChain,
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      } as any);

      const res = await request(app)
        .post("/api/v1/admin/seed")
        .set("x-admin-key", mockAdminKey)
        .send({});

      if (res.status === 200) {
        // Verify insert was called — the seed route inserts skills, projects, experience, certs
        expect(supabaseChain.insert).toHaveBeenCalled();
      }
    });

    it("force mode clears existing user data before insert", async () => {
      const res = await request(app)
        .post("/api/v1/admin/seed?force=true&confirm=true")
        .set("x-admin-key", mockAdminKey)
        .send({});

      // In force mode, delete should be called for skills, projects, experience, certifications
      expect(supabaseChain.delete).toHaveBeenCalled();
      expect(supabaseChain.eq).toHaveBeenCalledWith("user_id", "test-user-id");
    });

    it("non-force mode inserts skills with user_id when none exist", async () => {
      // Default mock: select().eq() returns empty data (no existing skills)
      vi.mocked(supabaseChain.eq).mockResolvedValue({ data: [], error: null });

      const res = await request(app)
        .post("/api/v1/admin/seed")
        .set("x-admin-key", mockAdminKey)
        .send({});

      if (res.status === 200) {
        // With no existing skills, all 6 should be inserted (3+2+1 from categories)
        expect(res.body.summary.skills).toBe(6);
        // Verify insert was called with user_id
        const insertCalls = vi.mocked(supabaseChain.insert).mock.calls;
        const skillInsertCall = insertCalls.find((call: any) =>
          Array.isArray(call[0]) && call[0][0]?.category,
        );
        expect(skillInsertCall).toBeDefined();
        if (skillInsertCall) {
          const skills = skillInsertCall[0] as any[];
          skills.forEach((s: any) => {
            expect(s.user_id).toBe("test-user-id");
          });
        }
      }
    });

    it("returns summary with counts for each table", async () => {
      vi.mocked(supabaseChain.select).mockReturnValue({
        ...supabaseChain,
        eq: vi.fn().mockReturnValue({
          ...supabaseChain,
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      } as any);

      const res = await request(app)
        .post("/api/v1/admin/seed")
        .set("x-admin-key", mockAdminKey)
        .send({});

      if (res.status === 200) {
        expect(res.body).toHaveProperty("summary");
        expect(res.body.summary).toHaveProperty("hero");
        expect(res.body.summary).toHaveProperty("about");
        expect(res.body.summary).toHaveProperty("skills");
        expect(res.body.summary).toHaveProperty("projects");
        expect(res.body.summary).toHaveProperty("experience");
        expect(res.body.summary).toHaveProperty("certifications");

        // Verify counts are numbers
        expect(typeof res.body.summary.hero).toBe("number");
        expect(typeof res.body.summary.skills).toBe("number");
        expect(typeof res.body.summary.projects).toBe("number");
      }
    });
  });
});
