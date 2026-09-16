import type { Request, Response, NextFunction } from "express";
import * as zod from "zod";
import { invalidCsrfTokenError } from "./csrf";
import { forbidden, badRequest, serverError } from "../lib/api-response";
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
    forbidden(res, "Invalid or missing CSRF token");
    return;
  }

  // Real Zod errors are safe to map: their messages come from our own
  // schema definitions, never from library internals. Field issues map to
  // per-field arrays (same shape as the route-level safeParse handlers);
  // form-level issues (no path) land under "_form".
  if (err instanceof zod.ZodError) {
    const flat = err.flatten();
    const errors: Record<string, string[]> = {};
    for (const [field, messages] of Object.entries(flat.fieldErrors)) {
      if (messages) errors[field] = messages;
    }
    if (flat.formErrors.length > 0) errors._form = flat.formErrors;
    badRequest(res, errors);
    return;
  }

  // Handle malformed JSON body from express.json()
  if (err.name === "SyntaxError" && "body" in err) {
    badRequest(res, { _form: ["Invalid JSON in request body"] });
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
  serverError(res);
}
