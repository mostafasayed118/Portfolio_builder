import { themePresetSchema } from "@workspace/api-zod";
import { createCollectionRouter } from "../../lib/collection-router";

/**
 * Custom theme templates — the admin's saved palettes, now a server-side
 * collection so they sync across devices instead of living in localStorage.
 *
 * CRUD matches the standard collection contract (GET list / POST / PUT / DELETE
 * soft-delete), ordered newest-first to mirror the Theme Manager's template
 * grid, which previously prepended freshly saved templates.
 *
 * Saving a template whose name already exists (case-insensitive) returns 409
 * with the existing row's id instead of stacking a duplicate; the client then
 * offers to overwrite via PUT. A partial unique index on (user_id, name) for
 * non-deleted rows makes the same guarantee race-safe at the database level.
 */
export default createCollectionRouter({
  table: "theme_presets",
  entityName: "ThemePreset",
  schema: themePresetSchema,
  orderBy: "created_at",
  orderAsc: false,
  findDuplicate: async (supabase, data, userId) => {
    if (!userId) return null;
    const name = typeof data.name === "string" ? data.name.trim().toLowerCase() : "";
    if (!name) return null;
    const { data: rows } = await supabase
      .from("theme_presets")
      .select("id, name")
      .eq("user_id", userId)
      .is("deleted_at", null);
    const match = (rows ?? []).find(
      (row) => String(row.name).trim().toLowerCase() === name,
    );
    return match ? { id: match.id, name: match.name } : null;
  },
});
