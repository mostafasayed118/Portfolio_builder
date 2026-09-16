import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@workspace/supabase/types";
import { env } from "./env";

let _client: SupabaseClient<Database> | null = null;

/**
 * Service-role client — SYSTEM ROUTES ONLY (see the plan's Global
 * Constraints). Bypasses RLS; must never serve tenant-scoped request paths.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!_client) {
    _client = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _client;
}

/**
 * Request-scoped client: anon key + the caller's verified Clerk JWT. RLS
 * evaluates auth.jwt() ->> 'sub' against portfolios.owner_user_id, so every
 * query through this client is tenant-scoped by the database itself.
 */
export function getRequestSupabaseClient(token: string): SupabaseClient<Database> {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    accessToken: async () => token,
  });
}

/** Plain anon client for public (unauthenticated) request paths. */
export function getAnonSupabaseClient(): SupabaseClient<Database> {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
