import { getAdminSupabase } from "@workspace/supabase/admin";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey);

export function getSupabase() {
  return getAdminSupabase();
}
