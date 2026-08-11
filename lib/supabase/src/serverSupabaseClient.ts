import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Lazy singleton for server-side Supabase access.
 * Uses SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from process.env.
 * Both admin.ts and server.ts previously duplicated this logic —
 * this file is the single source of truth.
 */

let _client: SupabaseClient<Database> | null = null;

export function getServerSupabase(): SupabaseClient<Database> {
  if (_client) return _client;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL environment variable is required for server client");
  }

  if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is required for server client");
  }

  _client = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _client;
}

export function resetServerSupabase() {
  _client = null;
}

// Alias for backward compatibility
export { getServerSupabase as getAdminSupabase, resetServerSupabase as resetAdminSupabase };
