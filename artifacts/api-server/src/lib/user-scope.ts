import type { AuthenticatedRequest } from "../middleware/adminAuth";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Thrown when a superadmin passes a non-UUID `?userId=`. Thrown (rather
 * than sanitized silently) so the route layer maps it to a 400 instead of
 * letting an arbitrary string reach the PostgREST `.or()` filter — a
 * malformed value would otherwise inject additional filter clauses.
 */
export class InvalidTargetUserIdError extends Error {
  constructor() {
    super("Invalid userId format — must be a valid UUID");
    this.name = "InvalidTargetUserIdError";
  }
}

/**
 * Compute the target user ID for a scoped collection query.
 *
 *  - Superadmins may pass `?userId=…` to query on behalf of a specific user;
 *    without it they resolve to `null`, meaning "all users" (no user filter).
 *    A non-UUID `?userId` fails closed: it throws `InvalidTargetUserIdError`
 *    instead of reaching the PostgREST filter.
 *  - Non-superadmins always see their own rows (a `?userId` they pass is
 *    ignored — no privilege escalation).
 *  - Returns `null` when a non-superadmin has no `req.user.id` — callers
 *    should short-circuit to an empty result.
 */
export function resolveTargetUserId(
  req: AuthenticatedRequest,
  queryUserId?: string,
): string | null {
  const isSuperadmin = req.user?.role === "superadmin";
  const requesterId = req.user?.id ?? null;

  if (isSuperadmin) {
    if (queryUserId) {
      if (!UUID_PATTERN.test(queryUserId)) throw new InvalidTargetUserIdError();
      return queryUserId;
    }
    return null;
  }
  return requesterId;
}
