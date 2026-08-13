import type { Response } from "express";

export function ok(res: Response, data: unknown) {
  return res.json({ success: true, data });
}

export function created(res: Response, data?: unknown) {
  return res.status(201).json({ success: true, data });
}

export function noContent(res: Response) {
  return res.status(204).end();
}

export function notFound(res: Response, message = "Not found") {
  return res.status(404).json({ success: false, message });
}

export function badRequest(res: Response, errors: Record<string, string[]>) {
  return res.status(400).json({ success: false, errors });
}

export function forbidden(res: Response, message = "Forbidden") {
  return res.status(403).json({ success: false, message });
}

export function unauthorized(res: Response, message = "Unauthorized") {
  return res.status(401).json({ success: false, message });
}

export function rateLimited(res: Response, message = "Too many requests, please try again later") {
  return res.status(429).json({ success: false, message });
}

export function serverError(res: Response, message = "Internal server error") {
  return res.status(500).json({ success: false, message });
}

export function paginated(
  res: Response,
  data: unknown[],
  total: number,
  limit: number,
  offset: number,
) {
  return res.json({
    success: true,
    data,
    pagination: {
      total,
      limit,
      offset,
      hasMore: total > offset + limit,
    },
  });
}
