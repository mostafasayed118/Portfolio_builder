import type { Request } from "express";

export const MAX_LIMIT = 200;
export const DEFAULT_LIMIT = 50;

/** Parsed pagination params with safe defaults and a hard cap. */
export interface PaginationParams {
  limit: number;
  offset: number;
  page: number; // 1-indexed for convenience
}

/**
 * Parse `limit` / `offset` from the query string.
 * Clamps limit to [1, MAX_LIMIT] and offset to >= 0.
 */
export function parsePagination(req: Request): PaginationParams {
  const rawLimit = parseInt((req.query.limit as string) ?? `${DEFAULT_LIMIT}`, 10);
  const rawOffset = parseInt((req.query.offset as string) ?? "0", 10);

  const limit = Math.min(
    Math.max(Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );
  const offset = Math.max(Number.isFinite(rawOffset) ? rawOffset : 0, 0);
  const page = Math.floor(offset / limit) + 1;

  return { limit, offset, page };
}
