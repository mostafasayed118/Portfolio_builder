import type { SupabaseClient } from "@supabase/supabase-js";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/adminAuth";
import { badRequest } from "./api-response";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Raised when the caller owns no portfolio and none was requested. */
export class NoActivePortfolioError extends Error {
  constructor() {
    super("No portfolio available for this account");
    this.name = "NoActivePortfolioError";
  }
}

// The portfolios table exists in the hand-maintained Database types, but the
// query goes through the structural untyped handle — the same pattern lib/db
// helpers use. RLS (owner_select policy) also scopes the read on JWT clients;
// the explicit owner_user_id filter is defense in depth against the 064
// public_select_published_portfolios policy, which would otherwise surface
// a foreign PUBLISHED portfolio here (fallback) — and the service-role
// admin-key path has no RLS scoping at all.
async function fetchFirstOwnedPortfolioId(
  client: SupabaseClient,
  ownerSub: string | undefined,
): Promise<unknown> {
  let query = client.from("portfolios").select("id");
  if (ownerSub) query = query.eq("owner_user_id", ownerSub);
  const { data, error } = await query
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error !== null) throw new NoActivePortfolioError();
  if (data === null) throw new NoActivePortfolioError();
  const id: unknown = data.id;
  return id;
}

/**
 * Resolve the portfolio an CMS write should target:
 * 1. an explicit, valid-UUID portfolioId (query or body) — ownership is then
 *    enforced by RLS (a foreign id yields 42501 → mapped to 404);
 * 2. otherwise the caller's first owned portfolio, read through the
 *    JWT-scoped client (owner_select policy), cached on the request.
 */
export async function resolveActivePortfolioId(req: AuthenticatedRequest): Promise<string> {
  const raw: unknown = req.query.portfolioId ?? req.body?.portfolioId;
  if (typeof raw === "string" && UUID_RE.test(raw)) return raw;

  const cached = req.activePortfolioId;
  if (cached) return cached;

  if (!req.supabase) throw new NoActivePortfolioError();
  const id = await fetchFirstOwnedPortfolioId(req.supabase, req.clerkSub);
  if (typeof id !== "string" || !UUID_RE.test(id)) throw new NoActivePortfolioError();
  req.activePortfolioId = id;
  return id;
}

/**
 * Route-helper form: resolves the active portfolio, answering 400 itself
 * when the caller owns none (same envelope as the collection router).
 * Returns the portfolio id, or null when the response has been sent.
 */
export async function resolveActivePortfolioOr400(
  req: AuthenticatedRequest,
  res: Response,
): Promise<string | null> {
  try {
    return await resolveActivePortfolioId(req);
  } catch (error) {
    if (error instanceof NoActivePortfolioError) {
      badRequest(res, { portfolioId: ["Create a portfolio first"] });
      return null;
    }
    throw error;
  }
}
