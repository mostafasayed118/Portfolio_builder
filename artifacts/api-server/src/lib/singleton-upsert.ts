import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@workspace/supabase/types";

type TableName = keyof Database["public"]["Tables"];

/**
 * Upsert a singleton row in a settings table.
 * If a row exists, updates it. Otherwise, inserts a new one.
 */
export async function singletonUpsert<T extends TableName>(
  supabase: SupabaseClient<Database>,
  table: T,
  payload: Record<string, unknown>,
): Promise<{ success: true }> {
  const merged = { ...payload, updated_at: new Date().toISOString() };

  // All settings tables have an `id` column, but the generic Table type
  // can't express this — cast through `any` for the select/update/insert.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedSupabase = supabase as unknown as SupabaseClient<any>;

  const { data: existing } = await typedSupabase
    .from(table)
    .select("id")
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await typedSupabase
      .from(table)
      .update(merged)
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await typedSupabase
      .from(table)
      .insert(merged);
    if (error) throw error;
  }

  return { success: true };
}
