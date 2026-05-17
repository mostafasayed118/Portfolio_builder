import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

// Global error handler for unhandled validation errors
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err.name === "ValidationError") {
    res.status(400).json({ success: false, message: err.message });
    return;
  }

  logger.error({ err }, "Unhandled error");
  res.status(500).json({ success: false, message: "Internal server error" });
}
