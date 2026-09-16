import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_LIST_ROWS } from "./query";

type ReorderTable = "projects" | "skills" | "experience" | "certifications";

/**
 * Reorders rows by fanning out one UPDATE per item. Deliberate fan-out: no
 * single RPC exists for these tables (only reorder_sections covers
 * section_settings), and the tables are personal-portfolio scale — a
 * handful of rows per call. Inputs above MAX_LIST_ROWS are rejected up
 * front instead of being issued as 500+ parallel UPDATEs.
 */
export async function reorderItems(
  supabase: SupabaseClient,
  table: ReorderTable,
  orderedIds: string[],
): Promise<{ success: boolean; error?: string }> {
  if (orderedIds.length > MAX_LIST_ROWS) {
    return {
      success: false,
      error: `reorderItems: ${orderedIds.length} ids exceeds the per-request limit of ${MAX_LIST_ROWS}`,
    };
  }

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
