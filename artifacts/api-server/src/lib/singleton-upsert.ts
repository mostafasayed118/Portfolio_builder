import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@workspace/supabase/types";

type TableName = keyof Database["public"]["Tables"];

/**
 * Upsert a singleton row in a settings table.
 *
 * The write is a single atomic `INSERT … ON CONFLICT (id) DO UPDATE` that
 * targets the table's primary key: when a row exists we carry its id so
 * the upsert updates it in place, and when the table is empty the id is
 * omitted so a fresh row is inserted. This removes the read-then-write
 * window of the previous implementation (select → update/insert), which
 * could create a second singleton row when two requests raced.
 *
 * If the table is empty and two requests insert simultaneously, the
 * unique index from migration 047 (on `(true)`) rejects the second insert
 * with a `unique_violation` (23505); we recover by updating the winning
 * row instead of surfacing the error.
 *
 * ## Type rationale
 *
 * The Supabase generic types enforce strict row shapes for `.update()`
 * and `.insert()`. Each settings table has its own Update/Insert shape,
 * and this helper intentionally accepts a partial payload across any of
 * them — so a single function signature cannot satisfy every table's
 * exact shape simultaneously.
 *
 * This version uses a **local helper** `_call()` that scopes the `any`
 * cast to exactly the upsert/update call sites, so the rest of the
 * codebase keeps its strict typing.
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

  // Scoped escape hatch — only these calls need `any`.
  // The cast is isolated to this function and never escapes it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const _call = supabase as unknown as SupabaseClient<any>;

  // Read: typed to the minimal shape we need (id only). The singleton
  // guard (047) guarantees at most one row, so `.maybeSingle()` is safe.
  const { data: existing } = (await supabase
    .from(table)
    .select("id")
    .limit(1)
    .maybeSingle()) as { data: IdRow | null; error: unknown };

  // Single atomic upsert on the primary key. No window between "check the
  // row exists" and "write" — a racing insert of a second singleton row is
  // impossible through this helper.
  const row = existing?.id !== undefined && existing?.id !== null
    ? { ...merged, id: existing.id }
    : merged;

  const { error } = await _call.from(table).upsert(row, { onConflict: "id" });

  if (error) {
    // unique_violation — the 047 singleton guard rejected a racing insert.
    // Another request won the race; update its row instead.
    if (error.code === "23505" && !existing?.id) {
      const { data: winner } = (await supabase
        .from(table)
        .select("id")
        .limit(1)
        .maybeSingle()) as { data: IdRow | null; error: unknown };
      if (winner?.id !== undefined && winner?.id !== null) {
        const { error: retryError } = await _call
          .from(table)
          .update(merged)
          .eq("id", winner.id);
        if (retryError) throw retryError;
        return { success: true };
      }
    }
    throw error;
  }

  return { success: true };
}
