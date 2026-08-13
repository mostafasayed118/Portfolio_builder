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
): Promise<void> {
  await queryOrThrow(
    supabase.from(TABLE).update({ ...args, updated_at: new Date().toISOString() }).eq("id", id),
    { table: TABLE, operation: "updateSectionSetting" },
  );
}

export async function reorderSectionSettings(
  supabase: SupabaseClient,
  items: { id: string; sort_order: number }[],
): Promise<void> {
  const now = new Date().toISOString();
  const results = await Promise.allSettled(
    items.map(({ id, sort_order }) =>
      queryOrThrow(
        supabase.from("section_settings").update({ sort_order, updated_at: now }).eq("id", id),
        { table: "section_settings", operation: "reorderSectionSettings.update" },
      ),
    ),
  );
const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failures.length > 0) {
    const summary = failures.map((f, i) => `${items[i].id}: ${f.reason?.message ?? "Unknown error"}`).join("; ");
    throw new Error(`${failures.length} of ${items.length} section order updates failed: ${summary}`);
  }
}
