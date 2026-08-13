import type { Request, Response, NextFunction } from "express";
import { invalidCsrfTokenError } from "./csrf";
import { logger } from "../lib/logger";

/**
 * Global error handler.
 *
 * Captures route context (path, method, IP, request ID) so an unhandled
 * error in production can be traced back to the specific request that
 * triggered it. Never logs full request bodies (may contain PII or
 * auth tokens) — only the error itself plus the route metadata.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // CSRF double-submit mismatch (missing/invalid token header+cookie).
  // Rejected explicitly so the client sees a clear 403 instead of an
  // opaque 500 "Internal server error".
  if (err === invalidCsrfTokenError) {
    res.status(403).json({ success: false, message: "Invalid or missing CSRF token" });
    return;
  }

  if (err.name === "ValidationError") {
    res.status(400).json({ success: false, message: err.message });
    return;
  }

  // Handle malformed JSON body from express.json()
  if (err.name === "SyntaxError" && "body" in err) {
    res.status(400).json({ success: false, message: "Invalid JSON in request body" });
    return;
  }

  logger.error(
    {
      err: {
        name: err.name,
        message: err.message,
        stack: err.stack,
      },
      route: req.path,
      method: req.method,
      ip: req.ip,
      requestId: req.headers?.["x-request-id"],
      contentType: req.headers?.["content-type"],
      contentLength: req.headers?.["content-length"],
    },
    "Unhandled error",
  );
  res.status(500).json({ success: false, message: "Internal server error" });
}
