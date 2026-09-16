import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Widen a typed Supabase client to the structural untyped handle so queries
 * against tables missing from the generated `Database` types compile. Route
 * files may not import `@supabase/supabase-js` directly (route-file lint
 * rule), so they call this helper instead of doing the assertion inline.
 */
export function asUntypedClient(client: SupabaseClient): SupabaseClient {
  return client;
}
