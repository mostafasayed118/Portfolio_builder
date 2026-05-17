import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "@clerk/backend";

const ADMIN_EMAILS = (process.env.VITE_ADMIN_EMAILS ?? "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_ISSUER = process.env.CLERK_ISSUER;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
const isProduction = process.env.NODE_ENV === "production";

export interface AuthenticatedRequest extends Request {
  adminEmail?: string;
}

async function verifyClerkJWT(token: string): Promise<string | null> {
  if (!CLERK_SECRET_KEY) return null;
  try {
    const payload = await verifyToken(token, {
      secretKey: CLERK_SECRET_KEY,
      ...(CLERK_ISSUER ? { issuer: CLERK_ISSUER } : {}),
    });
    const email = ((payload as Record<string, unknown>)?.email ?? (payload as Record<string, unknown>)?.emailAddress ?? "") as string;
    return email.toLowerCase();
  } catch {
    return null;
  }
}

export async function adminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const clerkToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const adminKey = req.headers["x-admin-key"] as string | undefined;

  // Admin API key (simplest path, works without Clerk)
  if (adminKey && adminKey === ADMIN_API_KEY) {
    req.adminEmail = "api-key-admin";
    next();
    return;
  }

  // Clerk JWT — properly verified against Clerk's JWKS
  if (clerkToken) {
    const verifiedEmail = await verifyClerkJWT(clerkToken);
    if (verifiedEmail && ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(verifiedEmail)) {
      req.adminEmail = verifiedEmail;
      next();
      return;
    }
  }

  // Dev mode: allow unauthenticated access when neither auth method is configured
  if (!isProduction && !ADMIN_API_KEY && ADMIN_EMAILS.length === 0 && !CLERK_SECRET_KEY) {
    next();
    return;
  }

  res.status(401).json({ success: false, message: "Unauthorized" });
}
