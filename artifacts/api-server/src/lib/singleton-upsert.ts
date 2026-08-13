import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@workspace/supabase/types";

type TableName = keyof Database["public"]["Tables"];

/**
 * Upsert a singleton row in a settings table.
 * If a row exists, updates it. Otherwise, inserts a new one.
 *
 * ## Type rationale
 *
 * The Supabase generic types enforce strict row shapes for `.update()`
 * and `.insert()`. Each settings table has its own Update/Insert shape,
 * and this helper intentionally accepts a partial payload across any of
 * them — so a single function signature cannot satisfy every table's
 * exact shape simultaneously.
 *
 * The previous version cast the entire client to `SupabaseClient<any>`,
 * which leaked `any` through the call site. This version:
 *
 *   1. Reads `id` from a narrowed `IdRow` type (no client cast needed).
 *   2. Uses a **local helper** `_call()` that scopes the `any` cast to
 *      exactly two call sites (update + insert), so the rest of the
 *      codebase keeps its strict typing.
 *
 * Route callers validate the payload with a Zod schema before reaching
 * this helper, so the cast is safe in practice — it's purely a
 * type-system workaround for heterogeneous table shapes.
 */
type IdRow = { id: string | number };

export async function singletonUpsert<T extends TableName>(
  supabase: SupabaseClient<Database>,
  table: T,
  payload: Record<string, unknown>,
): Promise<{ success: true }> {
  const merged = { ...payload, updated_at: new Date().toISOString() };

  // Scoped escape hatch — only these two calls need `any`.
  // The cast is isolated to this function and never escapes it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const _call = supabase as unknown as SupabaseClient<any>;

  // Read: typed to the minimal shape we need (id only).
  const { data: existing } = (await supabase
    .from(table)
    .select("id")
    .limit(1)
    .maybeSingle()) as { data: IdRow | null; error: unknown };

  if (existing?.id !== undefined && existing?.id !== null) {
    const { error } = await _call
      .from(table)
      .update(merged)
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await _call
      .from(table)
      .insert(merged);
    if (error) throw error;
  }

  return { success: true };
}
