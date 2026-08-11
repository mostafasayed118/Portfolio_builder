import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

let _serverClient: SupabaseClient<Database> | null = null;

export function getServerSupabase(): SupabaseClient<Database> {
  if (_serverClient) return _serverClient;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL environment variable is required for server client");
  }

  if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is required for server client");
  }

  _serverClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _serverClient;
}

export function resetServerSupabase() {
  _serverClient = null;
}
