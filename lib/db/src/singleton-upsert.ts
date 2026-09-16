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
  opts: { portfolioId?: string } = {},
): Promise<{ success: true }> {
  // Tenanted singletons must carry portfolio_id for the owner RLS policies
  // (owner_insert checks owns_portfolio(portfolio_id)); an unstamped insert
  // through a JWT-scoped client would be rejected. Per-portfolio uniqueness
  // (Phase 1) means one row per portfolio — reads must target the active
  // portfolio's row, not just any row the caller can see.
  const portfolioStamp = opts.portfolioId ? { portfolio_id: opts.portfolioId } : {};
  const merged: Record<string, unknown> = { ...portfolioStamp, ...payload, updated_at: new Date().toISOString() };

  // Read: typed to the minimal shape we need (id only). The read is scoped to
  // the active portfolio when one is given (JWT clients rely on RLS for the
  // ownership half of that filter).
  const readId = async (operation: string): Promise<IdRow | null> => {
    let q = supabase.from(table).select("id").limit(1);
    if (opts.portfolioId) q = q.eq("portfolio_id", opts.portfolioId);
    return queryOrThrow<IdRow | null>(q.maybeSingle(), { table, operation });
  };

  const existing = await readId("singletonUpsert.read");

  // Single atomic upsert on the primary key. No window between "check the
  // row exists" and "write" — a racing insert of a second singleton row is
  // impossible through this helper.
  const row: Record<string, unknown> = existing
    ? { ...merged, id: existing.id }
    : merged;

  try {
    await queryOrThrow(
      supabase.from(table).upsert(row, { onConflict: "id" }),
      { table, operation: "singletonUpsert.upsert" },
    );
  } catch (err: unknown) {
    // unique_violation — the singleton guard rejected a racing insert.
    // Another request won the race; update its row instead.
    if (isUniqueViolationError(err) && !existing) {
      const winner = await readId("singletonUpsert.raceRetry.read");
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
