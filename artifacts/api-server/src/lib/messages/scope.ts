import type { AuthenticatedRequest } from "../../middleware/adminAuth";

/**
 * User scoping for messages queries — the SINGLE implementation shared by
 * every endpoint in the admin messages route (previously re-implemented six
 * times inline). Mirrors `runCollectionQuery`'s semantics:
 *   - Superadmin with `?userId=` → that user's rows (plus orphans when
 *     `includeOrphans`, i.e. public contact-form rows with no owner).
 *   - Superadmin without `?userId=` → every row.
 *   - Regular admin → own rows (plus orphans when `includeOrphans`); a
 *     `?userId` they pass is ignored (no privilege escalation). A missing
 *     identity fails closed to `""` (matches nothing).
 */
export function scopeMessagesQuery<
  T extends { or(f: string): T; eq(c: string, v: unknown): T },
>(query: T, req: AuthenticatedRequest, opts: { includeOrphans?: boolean } = {}): T {
  const includeOrphans = opts.includeOrphans ?? false;
  const isSuperadmin = req.user?.role === "superadmin";
  const requestedUserId =
    typeof req.query.userId === "string" && req.query.userId.length > 0
      ? req.query.userId
      : undefined;

  if (isSuperadmin) {
    if (requestedUserId) {
      return includeOrphans
        ? query.or(`user_id.eq.${requestedUserId},user_id.is.null`)
        : query.eq("user_id", requestedUserId);
    }
    return query;
  }
  const ownId = req.user?.id ?? "";
  return includeOrphans
    ? query.or(`user_id.eq.${ownId},user_id.is.null`)
    : query.eq("user_id", ownId);
}
