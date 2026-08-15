import type { AuthenticatedRequest } from "../middleware/adminAuth";

/**
 * Compute the target user ID for a scoped collection query.
 *
 *  - Superadmins may pass `?userId=…` to query on behalf of another user.
 *  - Non-superadmins always see their own rows.
 *  - Returns `null` when a non-superadmin has no `req.user.id` — callers
 *    should short-circuit to an empty result.
 */
export function resolveTargetUserId(
  req: AuthenticatedRequest,
  queryUserId?: string,
): string | null {
  const isSuperadmin = req.user?.role === "superadmin";
  const requesterId = req.user?.id ?? null;

  if (isSuperadmin && queryUserId) return queryUserId;
  return requesterId;
}
