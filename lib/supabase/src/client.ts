import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logWarn } from "@workspace/logging";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function createBrowserSupabase(): SupabaseClient<Database> | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    logWarn(
      "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — running in offline mode.",
      "supabase-client",
    );
    return null;
  }
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

let _client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> | null {
  if (!_client) {
    _client = createBrowserSupabase();
  }
  return _client;
}

export function resetSupabase() {
  _client = null;
}
