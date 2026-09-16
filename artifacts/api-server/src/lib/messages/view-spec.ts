import { z } from "zod";

/** Valid values for the list endpoint's `?status=` filter. Omitted = default view. */
export const messageStatusSchema = z.enum(["unread", "read", "archived", "spam", "all"]).optional();

/** Valid values for the list endpoint's `?preset=` compound views. */
export const messagePresetSchema = z.enum(["unread_today", "unread_or_archived", "needs_reply"]).optional();

export type MessageStatus = NonNullable<z.infer<typeof messageStatusSchema>>;

export type MessagePreset = NonNullable<z.infer<typeof messagePresetSchema>>;

/**
 * Declarative predicate spec defining a messages view — the SINGLE source of
 * truth shared by the list endpoint and the bulk-archive filter, so the two
 * can never drift apart (list shows a view, bulk-archive archives exactly
 * that view in one statement).
 *
 * - `unread_today` — active unread messages created since UTC midnight.
 * - `needs_reply` — read but never replied to (actionable: the sender is
 *   waiting). `replied_at IS NULL` excludes messages the admin answered.
 * - `unread_or_archived` — every row that is unread OR archived: visible
 *   unread messages plus anything soft-deleted, regardless of its status.
 *   Read-and-visible rows are excluded. One `.or()` disjunction (soft-delete
 *   off, since the clause already covers deleted rows).
 * - `archived` — the soft-deleted set (softDelete: "only").
 * - `unread` / `read` — the active rows with that status.
 * - omitted — every visible row (softDelete: true).
 */
export interface ViewSpec {
  softDelete?: boolean | "only";
  eq?: Record<string, string | number | boolean>;
  gte?: Record<string, string>;
  isNull?: string[];
  or?: string;
}

export function viewSpec(status?: MessageStatus, preset?: MessagePreset): ViewSpec {
  switch (preset) {
    case "unread_today": {
      const startOfToday = new Date();
      startOfToday.setUTCHours(0, 0, 0, 0);
      return {
        softDelete: true,
        eq: { status: "unread" },
        gte: { created_at: startOfToday.toISOString() },
      };
    }
    case "needs_reply":
      return { softDelete: true, eq: { status: "read" }, isNull: ["replied_at"] };
    case "unread_or_archived":
      return { or: "status.eq.unread,deleted_at.not.is.null" };
  }
  if (status === "archived") return { softDelete: "only" };
  if (status === "unread" || status === "read") return { softDelete: true, eq: { status } };
  if (status === "spam") return { softDelete: true, eq: { is_spam: true } };
  return { softDelete: true };
}

/** Structural filter-builder contract shared by select and update chains. */
interface FilterChain {
  eq(c: string, v: unknown): FilterChain;
  gte(c: string, v: string): FilterChain;
  is(c: string, v: null): FilterChain;
  not(c: string, op: string, v: unknown): FilterChain;
  or(f: string): FilterChain;
}

/**
 * Apply a ViewSpec's predicates to a supabase query chain (list or update).
 * The concrete builder type is preserved through the generic — it only needs
 * the structural FilterChain methods above, so no casts appear mid-chain.
 */
export function applyViewSpec<Q extends FilterChain>(q: Q, spec: ViewSpec): Q {
  let cur: FilterChain = q;
  if (spec.softDelete === "only") cur = cur.not("deleted_at", "is", null);
  else if (spec.softDelete) cur = cur.is("deleted_at", null);
  for (const [column, value] of Object.entries(spec.eq ?? {})) {
    cur = cur.eq(column, value);
  }
  for (const [column, value] of Object.entries(spec.gte ?? {})) {
    cur = cur.gte(column, value);
  }
  for (const column of spec.isNull ?? []) {
    cur = cur.is(column, null);
  }
  if (spec.or) cur = cur.or(spec.or);
  return cur as Q;
}
