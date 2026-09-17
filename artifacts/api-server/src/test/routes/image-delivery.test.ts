import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../app";

const state = vi.hoisted(() => ({ published: false, owner: "owner", prefix: "11111111-1111-4111-8111-111111111111" }));
const portfolioId = "11111111-1111-4111-8111-111111111111";
const imageId = "22222222-2222-4222-8222-222222222222";

vi.mock("../../middleware/adminAuth", () => ({
  adminAuth: (req: { headers: { authorization?: string }; clerkSub?: string; clerkToken?: string }, _res: unknown, next: () => void) => {
    req.clerkSub = req.headers.authorization?.slice(7);
    req.clerkToken = req.clerkSub;
    next();
  },
}));
vi.mock("../../lib/supabase-client", () => {
  function client() {
    let table = "";
    const chain = {
      from: (name: string) => { table = name; return chain; },
      select: () => chain,
      eq: () => chain,
      limit: () => chain,
      maybeSingle: async () => ({ error: null, data: table === "image_metadata"
        ? { id: imageId, portfolio_id: portfolioId, storage_path: `${state.prefix}/projects/hash/original.png` }
        : table === "public_portfolios"
          ? state.published ? { id: portfolioId } : null
          : { id: portfolioId, owner_user_id: state.owner } }),
    };
    return chain;
  }
  return { getSupabaseClient: vi.fn(client), getAnonSupabaseClient: vi.fn(client), getRequestSupabaseClient: vi.fn(client) };
});

beforeEach(() => {
  state.published = false;
  state.owner = "owner";
  state.prefix = portfolioId;
  vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([137, 80, 78, 71]), { headers: { "Content-Type": "image/png" } })));
});

describe("publication checked image delivery", () => {
  it("returns the API 404 envelope for anonymous drafts", async () => {
    const res = await request(app).get(`/api/v1/images/serve/${imageId}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: "Image not found" });
  });
  it("streams published images anonymously", async () => {
    state.published = true;
    const res = await request(app).get(`/api/v1/images/serve/${imageId}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("image/png");
    expect(res.body).toEqual(Buffer.from([137, 80, 78, 71]));
  });
  it("allows authenticated owner draft previews", async () => {
    const res = await request(app).get(`/api/v1/images/serve/${imageId}`).set("Authorization", "Bearer owner");
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toContain("no-store");
  });
  it("denies foreign draft previews", async () => {
    const res = await request(app).get(`/api/v1/images/serve/${imageId}`).set("Authorization", "Bearer foreign");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
  it("rejects metadata with a different portfolio prefix", async () => {
    state.published = true;
    state.prefix = imageId;
    const res = await request(app).get(`/api/v1/images/serve/${imageId}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Image not found");
  });
  it.each(["project_images", "projects", "certifications", "avatars"])("serves published %s paths", async (bucket) => {
    state.published = true;
    const res = await request(app).get(`/api/v1/images/serve/${bucket}/${portfolioId}/photo.png`);
    expect(res.status).toBe(200);
  });
  it("rejects malformed path prefixes", async () => {
    state.published = true;
    const res = await request(app).get("/api/v1/images/serve/avatars/wrong/photo.png");
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Image not found");
  });
});
