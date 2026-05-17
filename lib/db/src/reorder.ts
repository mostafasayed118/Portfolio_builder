import type { SupabaseClient } from "@supabase/supabase-js";

type ReorderTable = "projects" | "skills" | "experience" | "certifications";

export async function reorderItems(
  supabase: SupabaseClient,
  table: ReorderTable,
  orderedIds: string[],
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();
    const results = await Promise.all(
      orderedIds.map((id, index) =>
        supabase
          .from(table)
          .update({ sort_order: (index + 1) * 10, updated_at: now })
          .eq("id", id),
      ),
    );

    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      return { success: false, error: errors[0].error?.message ?? "Update failed" };
    }

    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
