import { doubleCsrf } from "csrf-csrf";
import type { Request } from "express";
import { env } from "../lib/env";

const getSecret = (): string | string[] => env.CSRF_SECRET;

export const {
  generateCsrfToken,
  doubleCsrfProtection,
  invalidCsrfTokenError,
} = doubleCsrf({
  getSecret,
  getSessionIdentifier: (req: Request) =>
    `${req.ip ?? "unknown"}-${req.headers["user-agent"] ?? "unknown"}`,
  cookieName: "x-csrf-token",
  cookieOptions: {
    httpOnly: true,
    // The admin SPA is deployed on a separate origin from the API
    // (e.g. portfolio-builder-admin.vercel.app → portfolio-builder-api-six.vercel.app).
    // SameSite=Lax cookies are never attached to cross-site XHR/fetch,
    // which silently broke every admin mutation (including seed/import).
    // In production we must use SameSite=None (with Secure) so the
    // double-submit token cookie travels with the request; the header
    // + cookie value match is still enforced by doubleCsrfProtection.
    sameSite: env.IS_PRODUCTION ? "none" : "lax",
    secure: env.IS_PRODUCTION,
    path: "/",
  },
  size: 64,
  getCsrfTokenFromRequest: (req: Request) => req.headers["x-csrf-token"] as string | undefined,
});
