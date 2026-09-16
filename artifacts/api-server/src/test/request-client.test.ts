import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/adminAuth";
import { attachRequestSupabase } from "../middleware/requestClient";
import {
  resolveActivePortfolioId,
  NoActivePortfolioError,
} from "../lib/active-portfolio";
import {
  getRequestSupabaseClient,
  getSupabaseClient,
} from "../lib/supabase-client";

// Override the shared setup.ts mock (which only defines getSupabaseClient):
// this file needs all three Task 1 factories.
vi.mock("../lib/supabase-client", () => ({
  getSupabaseClient: vi.fn(() => ({})),
  getRequestSupabaseClient: vi.fn(() => ({})),
  getAnonSupabaseClient: vi.fn(() => ({})),
}));

function makeReq(): AuthenticatedRequest {
  return { headers: {}, query: {}, body: {} } as unknown as AuthenticatedRequest;
}

function chainable(id: string | null) {
  const builder: Record<string, unknown> = {};
  for (const key of ["select", "eq", "order", "limit", "range", "not", "is", "or", "returns"]) {
    builder[key] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(() =>
    Promise.resolve({ data: id === null ? null : { id }, error: null }),
  );
  builder.then = undefined;
  return builder;
}

describe("attachRequestSupabase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("attaches a JWT-scoped client when a clerk token is present", async () => {
    const req = makeReq();
    req.clerkToken = "tok";
    const res = {} as unknown as Response;
    await new Promise<void>((resolve) => {
      attachRequestSupabase(req, res, () => resolve());
    });
    expect(vi.mocked(getRequestSupabaseClient)).toHaveBeenCalledWith("tok");
    expect(req.supabase).toBeDefined();
  });

  it("attaches the service-role client when no clerk token is present", async () => {
    const req = makeReq();
    const res = {} as unknown as Response;
    await new Promise<void>((resolve) => {
      attachRequestSupabase(req, res, () => resolve());
    });
    expect(vi.mocked(getSupabaseClient)).toHaveBeenCalled();
    expect(req.supabase).toBeDefined();
  });
});

describe("resolveActivePortfolioId", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("prefers the explicit portfolioId from query or body", async () => {
    const req = makeReq();
    req.query = { portfolioId: "11111111-1111-1111-1111-111111111111" };
    const id = await resolveActivePortfolioId(req);
    expect(id).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("falls back to the caller's first owned portfolio via RLS", async () => {
    const req = makeReq();
    const pfId = "22222222-2222-2222-2222-222222222222";
    req.supabase = {
      from: vi.fn(() => chainable(pfId)),
    } as unknown as AuthenticatedRequest["supabase"];
    const id = await resolveActivePortfolioId(req);
    expect(id).toBe(pfId);
    expect(await resolveActivePortfolioId(req)).toBe(pfId); // cached on req
  });

  it("throws NoActivePortfolioError when the caller owns no portfolio", async () => {
    const req = makeReq();
    req.supabase = {
      from: vi.fn(() => chainable(null)),
    } as unknown as AuthenticatedRequest["supabase"];
    await expect(resolveActivePortfolioId(req)).rejects.toThrow(NoActivePortfolioError);
  });
});
