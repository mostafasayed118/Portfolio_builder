import { doubleCsrf } from "csrf-csrf";
import type { Request } from "express";

const CSRF_SECRET = process.env.CSRF_SECRET;
if (!CSRF_SECRET) {
  throw new Error("CSRF_SECRET environment variable is required");
}
const getSecret = (): string | string[] => CSRF_SECRET;

export const {
  generateCsrfToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret,
  getSessionIdentifier: (req: Request) =>
    `${req.ip ?? "unknown"}-${req.headers["user-agent"] ?? "unknown"}`,
  cookieName: "x-csrf-token",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  },
  size: 64,
  getCsrfTokenFromRequest: (req: Request) => req.headers["x-csrf-token"] as string | undefined,
});
