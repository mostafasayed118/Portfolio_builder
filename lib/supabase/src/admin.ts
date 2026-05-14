import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined;

function createAdminSupabase() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY. " +
        "Set both in your admin .env.local file.",
    );
  }
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

let _adminClient: ReturnType<typeof createAdminSupabase> | null = null;

export function getAdminSupabase() {
  if (!_adminClient) {
    _adminClient = createAdminSupabase();
  }
  return _adminClient;
}

export function resetAdminSupabase() {
  _adminClient = null;
}
