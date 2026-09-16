/**
 * Supabase query helpers — eliminates the ~60× `if (error) throw error;`
 * boilerplate that was duplicated across every lib/db module.
 *
 * Two flavors:
 *   - queryOrThrow(promise)         — single query, returns data, throws on error
 *   - queryOrThrowWithCount(promise) — list query with `{ count: "exact" }`,
 *                                       returns { data, count }
 *
 * Both attach a context tag so the error message identifies the table/operation
 * when it bubbles to the route layer's logSupabaseError().
 */

/**
 * Defensive cap for unpaginated list queries. Every current table is
 * personal-portfolio scale (hundreds of rows at most); the limit keeps a
 * runaway table from ever being fully loaded into memory in one query.
 */
export const MAX_LIST_ROWS = 500;

export interface QueryContext {
  table?: string;
  operation?: string;
}

/**
 * supabase-js surfaces PostgrestError as a plain object ({ message, code,
 * details, hint }), not an Error instance — extract the message from either
 * shape so real DB error text survives the wrap.
 */
function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  if (typeof err === "string") return err;
  return "Unknown Supabase error";
}

function enrichError(err: unknown, ctx?: QueryContext): Error {
  const message = extractErrorMessage(err);
  const prefix = ctx?.table ? `[${ctx.table}${ctx.operation ? `.${ctx.operation}` : ""}] ` : "";
  const fullMessage = prefix && !message.startsWith(prefix) ? `${prefix}${message}` : message;
  const wrapped = new Error(fullMessage);
  wrapped.cause = err;
  // PostgrestError carries a SQLSTATE-style `code`; surface it so callers
  // (e.g. safeErrorMessage) can map known codes without unwrapping cause.
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === "string") (wrapped as { code?: string }).code = code;
  }
  return wrapped;
}

/**
 * Run a single Supabase query (insert / update / upsert / delete) and
 * return the row data, or throw on error.
 */
export async function queryOrThrow<T>(
  promise: PromiseLike<{ data: T | null; error: unknown }>,
  ctx?: QueryContext,
): Promise<T> {
  const { data, error } = await promise;
  if (error) throw enrichError(error, ctx);
  return data as T;
}

/**
 * Run a paginated / list query that uses `{ count: "exact" }` and
 * return both the data and the total count.
 */
export async function queryOrThrowWithCount<T>(
  promise: PromiseLike<{ data: T[] | null; count: number | null; error: unknown }>,
  ctx?: QueryContext,
): Promise<{ data: T[]; count: number }> {
  const { data, count, error } = await promise;
  if (error) throw enrichError(error, ctx);
  return { data: data ?? [], count: count ?? 0 };
}
