import { doubleCsrf } from "csrf-csrf";
import type { Request } from "express";
import { env } from "../lib/env";

const getSecret = (): string | string[] => env.CSRF_SECRET;

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
    secure: env.IS_PRODUCTION,
    path: "/",
  },
  size: 64,
  getCsrfTokenFromRequest: (req: Request) => req.headers["x-csrf-token"] as string | undefined,
});
