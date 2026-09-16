import type { SupabaseClient } from "@supabase/supabase-js";
import type { SectionSetting, InsertSectionSetting } from "@workspace/supabase/types";
import { queryOrThrow } from "./query";

const TABLE = "section_settings" as const;

export async function listSectionSettings(
  supabase: SupabaseClient,
): Promise<SectionSetting[]> {
  return queryOrThrow<SectionSetting[]>(
    supabase.from(TABLE).select("*").order("sort_order", { ascending: true }),
    { table: TABLE, operation: "listSectionSettings" },
  );
}

export async function updateSectionSetting(
  supabase: SupabaseClient,
  id: string,
  args: Omit<Partial<InsertSectionSetting>, 'id' | 'created_at'>,
): Promise<number> {
  const data = await queryOrThrow<{ id: string }[] | null>(
    supabase
      .from(TABLE)
      .update({ ...args, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id"),
    { table: TABLE, operation: "updateSectionSetting" },
  );
  return data?.length ?? 0;
}

/**
 * Reorders section settings atomically via the reorder_sections RPC
 * (mirrors api-server's admin section-settings route). Args match the RPC
 * signature in lib/supabase/src/types.ts: parallel `section_ids` and
 * `sort_orders` arrays. Any RPC error is re-thrown with the usual
 * [table.operation] prefix.
 */
export async function reorderSectionSettings(
  supabase: SupabaseClient,
  items: { id: string; sort_order: number }[],
): Promise<void> {
  await queryOrThrow(
    supabase.rpc("reorder_sections", {
      section_ids: items.map((item) => item.id),
      sort_orders: items.map((item) => item.sort_order),
    }),
    { table: TABLE, operation: "reorderSectionSettings.reorder_sections" },
  );
}
