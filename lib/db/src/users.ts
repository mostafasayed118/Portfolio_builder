import type { SupabaseClient } from "@supabase/supabase-js";
import type { User as DbUser } from "@workspace/supabase/types";
import { queryOrThrow, queryOrThrowWithCount } from "./query";

export type UserListItem = Pick<
  DbUser,
  "id" | "clerk_id" | "email" | "name" | "role" | "created_at"
>;

export type UserRole = DbUser["role"];

const USERS_TABLE = "users" as const;

/**
 * List-scope columns for user management — `updated_at` stays out of
 * payloads (never displayed in the admin users table).
 */
export const USER_COLUMNS = "id, clerk_id, email, name, role, created_at";

export interface ListUsersArgs {
  limit: number;
  offset: number;
}

export interface ListUsersResult {
  rows: UserListItem[];
  count: number;
}

export async function listUsers(
  supabase: SupabaseClient,
  args: ListUsersArgs,
): Promise<ListUsersResult> {
  const { data, count } = await queryOrThrowWithCount(
    supabase
      .from(USERS_TABLE)
      .select(USER_COLUMNS, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(args.offset, args.offset + args.limit - 1),
    { table: USERS_TABLE, operation: "listUsers" },
  );
  return { rows: data, count };
}

/**
 * Update a user's role and return the matched rows (0 or 1 — `id` is the
 * primary key). Supabase leaves `count` null on update+select, so row
 * presence must be read from the returned array (same contract as
 * route-helpers' updateByIdAndUser); callers respond 404 when it is empty.
 */
export async function updateUserRole(
  supabase: SupabaseClient,
  id: string,
  role: UserRole,
): Promise<UserListItem[]> {
  return queryOrThrow<UserListItem[]>(
    supabase
      .from(USERS_TABLE)
      .update({ role })
      .eq("id", id)
      .select(USER_COLUMNS),
    { table: USERS_TABLE, operation: "updateUserRole" },
  );
}
