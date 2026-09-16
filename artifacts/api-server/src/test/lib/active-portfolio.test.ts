import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolveActivePortfolioId,
  NoActivePortfolioError,
} from "../../lib/active-portfolio";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";

const PORTFOLIO_ID = "123e4567-e89b-12d3-a456-426614174000";

interface ReqOptions {
  clerkSub?: string;
  explicitId?: string;
  withClient?: boolean;
}

function makeReq(opts: ReqOptions = {}): AuthenticatedRequest {
  const req = {
    query: opts.explicitId ? { portfolioId: opts.explicitId } : {},
    body: {},
  } as unknown as AuthenticatedRequest;
  if (opts.clerkSub !== undefined) req.clerkSub = opts.clerkSub;
  if (opts.withClient !== false) {
    req.supabase = makeClient({ id: PORTFOLIO_ID }).client;
  }
  return req;
}

function makeClient(row: { id: string } | null, error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(async () => ({ data: row, error })),
  };
  const client = { from: vi.fn(() => chain) } as unknown as SupabaseClient;
  return { client, chain };
}

describe("resolveActivePortfolioId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fallback scopes the lookup to the caller's verified clerk sub", async () => {
    const { client, chain } = makeClient({ id: PORTFOLIO_ID });
    const req = makeReq({ clerkSub: "user_1" });
    req.supabase = client;

    const id = await resolveActivePortfolioId(req);

    expect(id).toBe(PORTFOLIO_ID);
    expect(chain.eq).toHaveBeenCalledWith("owner_user_id", "user_1");
  });

  it("caches the resolved id on the request", async () => {
    const req = makeReq({ clerkSub: "user_1" });
    const first = await resolveActivePortfolioId(req);
    const { client } = makeClient({ id: PORTFOLIO_ID });
    req.supabase = client;

    const second = await resolveActivePortfolioId(req);

    expect(second).toBe(first);
    expect(client.from).not.toHaveBeenCalled();
  });

  it("explicit valid-UUID portfolioId short-circuits without a db call", async () => {
    const { client } = makeClient(null);
    const req = makeReq({ explicitId: PORTFOLIO_ID });
    req.supabase = client;

    const id = await resolveActivePortfolioId(req);

    expect(id).toBe(PORTFOLIO_ID);
    expect(client.from).not.toHaveBeenCalled();
  });

  it("admin-key path (no clerkSub) resolves the first portfolio unfiltered", async () => {
    const { client, chain } = makeClient({ id: PORTFOLIO_ID });
    const req = makeReq();
    req.supabase = client;

    const id = await resolveActivePortfolioId(req);

    expect(id).toBe(PORTFOLIO_ID);
    expect(chain.eq).not.toHaveBeenCalled();
  });

  it("no owned row raises NoActivePortfolioError", async () => {
    const { client } = makeClient(null);
    const req = makeReq({ clerkSub: "user_1" });
    req.supabase = client;

    await expect(resolveActivePortfolioId(req)).rejects.toBeInstanceOf(
      NoActivePortfolioError,
    );
  });

  it("missing request client raises NoActivePortfolioError", async () => {
    const req = makeReq({ clerkSub: "user_1", withClient: false });

    await expect(resolveActivePortfolioId(req)).rejects.toBeInstanceOf(
      NoActivePortfolioError,
    );
  });
});
