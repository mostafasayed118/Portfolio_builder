import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "./adminAuth";
import { getSupabaseClient, getRequestSupabaseClient } from "../lib/supabase-client";

/**
 * Attaches the request's Supabase client:
 * - Clerk callers get an anon-key client scoped to their verified JWT, so
 *   Postgres RLS (migrations 064-067) is the authorization boundary.
 * - The x-admin-key system path keeps the service-role client (no tenant
 *   identity exists for API-key scripts; system routes are allowlisted).
 */
export function attachRequestSupabase(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  req.supabase = req.clerkToken ? getRequestSupabaseClient(req.clerkToken) : getSupabaseClient();
  next();
}
