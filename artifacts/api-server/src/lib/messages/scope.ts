import type { AuthenticatedRequest } from "../../middleware/adminAuth";

export function scopeMessagesQuery<T>(query: T, _req: AuthenticatedRequest): T {
  return query;
}
