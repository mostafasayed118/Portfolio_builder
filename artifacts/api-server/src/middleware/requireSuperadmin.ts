import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./adminAuth";

export function requireSuperadmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== "superadmin") {
    res.status(403).json({ success: false, message: "Superadmin access required" });
    return;
  }
  next();
}
