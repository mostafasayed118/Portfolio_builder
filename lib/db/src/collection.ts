import type { SupabaseClient } from "@supabase/supabase-js";
import { queryOrThrow, queryOrThrowWithCount } from "./query";
import { isUniqueViolationError } from "./singleton-upsert";

export { isUniqueViolationError };

/**
 * Allowlist of tables the generic collection helpers may touch. The admin
 * generic CRUD helpers (collection-router, route-helpers) are table-agnostic
 * by design; this list is the security boundary that keeps the generic
 * helpers from ever reaching a table outside the admin CMS surface. Add a
 * table here only when a route genuinely needs generic CRUD for it.
 */
export const COLLECTION_TABLES = [
  "blog_posts",
  "certifications",
  "experience",
  "messages",
  "projects",
  "section_settings",
  "skills",
  "theme_presets",
] as const;

export type CollectionTable = (typeof COLLECTION_TABLES)[number];

function assertCollectionTable(table: string): CollectionTable {
  const match = COLLECTION_TABLES.find((allowed) => allowed === table);
  if (!match) {
    throw new Error(`[collection] table "${table}" is not in the collection allowlist`);
  }
  return match;
}

export interface CollectionFilters {
  /** Applied as `.eq(column, value)` for each entry. */
  eq?: Record<string, string | number | boolean>;
  /** Applied as `.gte(column, value)` for each entry (e.g. `created_at >= today`). */
  gte?: Record<string, string>;
  /** Applied as `.is(column, null)` for each entry (e.g. `replied_at IS NULL`). */
  isNull?: string[];
}

export interface CollectionQueryOptions {
  select?: string;
  /**
   * `true` → only rows where deleted_at IS NULL (not soft-deleted).
   * `"only"` → only rows where deleted_at IS NOT NULL (soft-deleted only),
   * for views that page through the trash/archived set.
   */
  softDelete?: boolean | "only";
  orderBy?: string;
  orderAsc?: boolean;
  /** Column used for user scoping (default: "user_id"). */
  userColumn?: string;
  /** When set, rows are scoped to this user id. */
  targetUserId?: string | null;
  /** Also return rows whose user_id IS NULL (public contact-form messages). */
  includeOrphans?: boolean;
  filters?: CollectionFilters;
  /**
   * Raw PostgREST `or()` expression, AND-composed with everything else.
   * Chaining a second `.or()` yields a second `or=` query parameter, which
   * PostgREST combines with AND.
   */
  or?: string;
  /** Page size (already parsed/validated by the caller). */
  limit: number;
  /** Page offset (already parsed/validated by the caller). */
  offset: number;
}

/**
 * Generic, allowlisted collection SELECT built on queryOrThrowWithCount.
 * Applies soft-delete, filters, user scoping, ordering and range pagination
 * in a fixed order; the caller owns pagination parsing, user-scope
 * resolution and the response envelope.
 */
export async function collectionQuery(
  supabase: SupabaseClient,
  table: string,
  options: CollectionQueryOptions,
): Promise<{ data: Record<string, unknown>[]; count: number }> {
  const allowed = assertCollectionTable(table);
  const userColumn = options.userColumn ?? "user_id";

  let query = supabase
    .from(allowed)
    .select(options.select ?? "*", { count: "exact" });

  if (options.softDelete === "only") {
    query = query.not("deleted_at", "is", null);
  } else if (options.softDelete) {
    query = query.is("deleted_at", null);
  }

  if (options.filters?.eq) {
    for (const [column, value] of Object.entries(options.filters.eq)) {
      query = query.eq(column, value);
    }
  }
  if (options.filters?.gte) {
    for (const [column, value] of Object.entries(options.filters.gte)) {
      query = query.gte(column, value);
    }
  }
  if (options.filters?.isNull) {
    for (const column of options.filters.isNull) {
      query = query.is(column, null);
    }
  }
  if (options.or) {
    query = query.or(options.or);
  }

  if (options.targetUserId) {
    if (options.includeOrphans) {
      // Public contact-form messages carry no user_id; admins must see them
      // in addition to rows explicitly assigned to themselves.
      query = query.or(`user_id.eq.${options.targetUserId},user_id.is.null`);
    } else {
      query = query.eq(userColumn, options.targetUserId);
    }
  }
  // No targetUserId — the caller decided the scope (e.g. superadmin "All users").

  if (options.orderBy) {
    query = query.order(options.orderBy, { ascending: options.orderAsc ?? true });
  }

  query = query.range(options.offset, options.offset + options.limit - 1);

  return queryOrThrowWithCount<Record<string, unknown>>(
    query.returns<Record<string, unknown>[]>(),
    {
      table: allowed,
      operation: "collectionQuery",
    },
  );
}

/** Discriminated mutation for the allowlisted collection tables. */
export type CollectionMutation =
  | { action: "insert"; row: Record<string, unknown> }
  | {
      action: "update";
      id: string;
      patch: Record<string, unknown>;
      /** When set, the update is additionally scoped to `.eq(userColumn, userId)`. */
      userId?: string;
      /** Column used for the user scope (default: "user_id"). */
      userColumn?: string;
    };

/**
 * Generic, allowlisted collection mutation built on queryOrThrow.
 *
 * - `insert` resolves once the row is written (data is null).
 * - `update` resolves with the `.select("id")` rows so the caller can
 *   distinguish "updated" from "no row matched" (Supabase leaves `count`
 *   null on `.update().select()`; the returned rows are the source of truth).
 */
export async function collectionMutate(
  supabase: SupabaseClient,
  table: string,
  mutation: CollectionMutation,
): Promise<Record<string, unknown>[] | null> {
  const allowed = assertCollectionTable(table);

  if (mutation.action === "insert") {
    await queryOrThrow(
      supabase.from(allowed).insert(mutation.row),
      { table: allowed, operation: "collectionMutate.insert" },
    );
    return null;
  }

  let query = supabase.from(allowed).update(mutation.patch).eq("id", mutation.id);
  if (mutation.userId !== undefined) {
    query = query.eq(mutation.userColumn ?? "user_id", mutation.userId);
  }
  return queryOrThrow<Record<string, unknown>[] | null>(
    query.select("id"),
    { table: allowed, operation: "collectionMutate.update" },
  );
}
