import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

const uuidSchema = z.string().uuid();

/**
 * Validate req.query.userId as a UUID (if present).
 * Used by collection routes that support superadmin user switching.
 */
export function validateQueryUserId(req: Request, res: Response, next: NextFunction): void {
  const { userId } = req.query;
  if (userId !== undefined) {
    const result = uuidSchema.safeParse(userId);
    if (!result.success) {
      res.status(400).json({ success: false, message: "Invalid userId format — must be a valid UUID" });
      return;
    }
  }
  next();
}

/**
 * Validate req.params.id as a UUID.
 * Used by PUT/DELETE routes that operate on a specific resource.
 */
export function validateParamId(req: Request, res: Response, next: NextFunction): void {
  const result = uuidSchema.safeParse(req.params.id);
  if (!result.success) {
    res.status(400).json({ success: false, message: "Invalid id format — must be a valid UUID" });
    return;
  }
  next();
}
