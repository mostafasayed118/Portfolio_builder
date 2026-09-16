import type { SupabaseClient } from "@supabase/supabase-js";
import { queryOrThrow } from "./query";

type IdRow = { id: string | number };

/** True when the error is the Postgres unique_violation (23505). */
export function isUniqueViolationError(err: unknown): boolean {
  return err instanceof Error && "code" in err && err.code === "23505";
}

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
 * Route callers validate the payload with a Zod schema before reaching
 * this helper, so the runtime values are safe. The client is intentionally
 * untyped (`SupabaseClient` with its default generic) — this helper accepts
 * a partial payload across ANY singleton table, which the per-table
 * generated types cannot express without casts.
 */
export async function singletonUpsert(
  supabase: SupabaseClient,
  table: string,
  payload: Record<string, unknown>,
): Promise<{ success: true }> {
  const merged = { ...payload, updated_at: new Date().toISOString() };

  // Read: typed to the minimal shape we need (id only). The singleton
  // guard (047) guarantees at most one row, so `.maybeSingle()` is safe.
  const existing = await queryOrThrow<IdRow | null>(
    supabase.from(table).select("id").limit(1).maybeSingle(),
    { table, operation: "singletonUpsert.read" },
  );

  // Single atomic upsert on the primary key. No window between "check the
  // row exists" and "write" — a racing insert of a second singleton row is
  // impossible through this helper.
  const row = existing
    ? { ...merged, id: existing.id }
    : merged;

  try {
    await queryOrThrow(
      supabase.from(table).upsert(row, { onConflict: "id" }),
      { table, operation: "singletonUpsert.upsert" },
    );
  } catch (err: unknown) {
    // unique_violation — the 047 singleton guard rejected a racing insert.
    // Another request won the race; update its row instead.
    if (isUniqueViolationError(err) && !existing) {
      const winner = await queryOrThrow<IdRow | null>(
        supabase.from(table).select("id").limit(1).maybeSingle(),
        { table, operation: "singletonUpsert.raceRetry.read" },
      );
      if (winner) {
        await queryOrThrow(
          supabase.from(table).update(merged).eq("id", winner.id),
          { table, operation: "singletonUpsert.raceRetry.update" },
        );
        return { success: true };
      }
    }
    throw err;
  }

  return { success: true };
}
