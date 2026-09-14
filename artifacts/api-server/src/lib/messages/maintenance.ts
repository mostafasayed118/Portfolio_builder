import { getSupabaseClient } from "../supabase-client";
import { safeErrorMessage } from "../safe-error";

/**
 * Email predicate for automated test submissions. Shared by the count and
 * update statements so they can never drift apart: any row whose email
 * starts with `e2e-` or `qa.verify.` (the E2E suite and the QA verify
 * fixture), or is exactly `test@test.com` (the generic test inbox), is a
 * test submission — never a real inquiry.
 *
 * One `.or()` expression (not chained `.ilike()`s, which would AND together).
 * All three patterns are ILIKE so matching is case-insensitive; `@` and `.`
 * are literal in ILIKE, so `email.ilike.test@test.com` only ever matches the
 * exact test@test.com address.
 */
export const TEST_SUBMISSION_EMAILS =
  "email.ilike.e2e-%,email.ilike.qa.verify.%,email.ilike.test@test.com";

/**
 * Predicate selecting every soft-deleted (archived) row: `deleted_at IS NOT
 * NULL`. Shared by the count and update statements of restore-all-archived so
 * they can never drift apart.
 */
export const ARCHIVED_ROWS = ["deleted_at", "is", null] as const;

/** `ok` carries the head-count (`count ?? 0`); `db_error` a sanitized message. */
export type CountedUpdateOutcome =
  | { ok: true; count: number }
  | { ok: false; message: string };

/**
 * One-click cleanup: archive every automated test submission that is still
 * visible. Count the visible test rows first (typed head-count, same as
 * unread-count) so the response can report how many were archived; the
 * update then targets the identical predicate. Any row inserted between the
 * two statements is out of scope for this run — fine for a cleanup tool.
 */
export async function archiveTestSubmissions(): Promise<CountedUpdateOutcome> {
  const supabase = getSupabaseClient();
  const { count, error: countError } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .or(TEST_SUBMISSION_EMAILS)
    .is("deleted_at", null);
  if (countError) return { ok: false, message: safeErrorMessage(countError) };

  const { error } = await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString() })
    .or(TEST_SUBMISSION_EMAILS)
    .is("deleted_at", null);
  if (error) return { ok: false, message: safeErrorMessage(error) };
  return { ok: true, count: count ?? 0 };
}

/**
 * One-click restore: bring every archived (soft-deleted) message back to the
 * inbox in one server-side statement — the inverse of archiveTestSubmissions,
 * so the whole Archived tab can be emptied in one call. Count the archived
 * rows first (typed head-count) so the response can report how many were
 * restored; the update then targets the identical predicate. Any row
 * archived between the two statements is out of scope for this run — fine
 * for a bulk restore tool.
 */
export async function restoreAllArchived(): Promise<CountedUpdateOutcome> {
  const supabase = getSupabaseClient();
  const { count, error: countError } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .not(...ARCHIVED_ROWS);
  if (countError) return { ok: false, message: safeErrorMessage(countError) };

  const { error } = await supabase
    .from("messages")
    .update({ deleted_at: null })
    .not(...ARCHIVED_ROWS);
  if (error) return { ok: false, message: safeErrorMessage(error) };
  return { ok: true, count: count ?? 0 };
}
