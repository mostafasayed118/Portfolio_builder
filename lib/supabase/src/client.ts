import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function createBrowserSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Set both in your .env file.",
    );
  }
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

let _client: ReturnType<typeof createBrowserSupabase> | null = null;

export function getSupabase() {
  if (!_client) {
    _client = createBrowserSupabase();
  }
  return _client;
}

export function resetSupabase() {
  _client = null;
}
