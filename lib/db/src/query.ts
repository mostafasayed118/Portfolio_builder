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

export interface QueryContext {
  table?: string;
  operation?: string;
}

function enrichError(err: unknown, ctx?: QueryContext): Error {
  if (err instanceof Error) {
    const prefix = ctx?.table ? `[${ctx.table}${ctx.operation ? `.${ctx.operation}` : ""}] ` : "";
    if (prefix && !err.message.startsWith(prefix)) {
      // Preserve the original error but annotate it for log triage
      const wrapped = new Error(`${prefix}${err.message}`);
      wrapped.cause = err;
      return wrapped;
    }
    return err;
  }
  return new Error(typeof err === "string" ? err : "Unknown Supabase error");
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
