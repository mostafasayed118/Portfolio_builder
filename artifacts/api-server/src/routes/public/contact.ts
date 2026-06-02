import { Router, type IRouter } from "express";
import { contactLimiter } from "../../middleware/rateLimiter";
import { z } from "zod";
import type { Request, Response } from "express";
import { getSupabaseClient } from "../../lib/supabase-client";
import { ok, badRequest, serverError, forbidden } from "../../lib/api-response";
import { logger } from "../../lib/logger";
import { env } from "../../lib/env";

/**
 * @public contact routes
 * Handles contact form submissions from the public portfolio
 * Rate limited to 5 requests per hour per IP
 *
 * Abuse controls:
 *  - Origin / referer header check
 *  - Honeypot field ("website") — hidden from real users, bots fill it
 *  - Time-trap (form must take >= 2s to fill — bots submit instantly)
 *  - Rate limiting (5 req/hour/IP via contactLimiter)
 *  - Stricter Zod validation + input normalization
 *  - Sanitized error responses (don't leak DB internals)
 *  - Structured logging for rejections (without leaking user content)
 */

const router: IRouter = Router();

const contactSchema = z.object({
  name: z.string()
    .min(1, "Name is required")
    .max(100, "Name must be under 100 characters")
    .trim()
    // eslint-disable-next-line no-control-regex -- intentionally stripping control chars for security
    .transform((s) => s.replace(/[\u0000-\u001f\u007f]/g, "")),
  email: z.string()
    .email("Valid email is required")
    .trim()
    .toLowerCase()
    .max(254), // RFC 5321 max email length
  message: z.string()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message must be under 2000 characters")
    .trim()
    // eslint-disable-next-line no-control-regex -- intentionally stripping control chars for security
    .transform((s) => s.replace(/[\u0000-\u001f\u007f]/g, "")),
  // Honeypot: must be empty. Real users won't see/fill this field.
  // Bots that auto-fill all fields will trip this.
  website: z.string().optional(),
  // Time-trap: client supplies the timestamp at which the form was rendered.
  // Must be at least 2s old — bots submit in < 100ms.
  _formLoadedAt: z.number().int().nonnegative().optional(),
});

function logAbuse(req: Request, reason: string, extra: Record<string, unknown> = {}): void {
  logger.info(
    {
      reason,
      ip: req.ip,
      ua: req.headers["user-agent"],
      origin: req.headers.origin,
      referer: req.headers.referer,
      path: req.path,
      ...extra,
    },
    "CONTACT: rejected",
  );
}

router.post("/", contactLimiter, async (req: Request, res: Response) => {
  // 1. Origin / referer check
  const origin = req.headers.origin ?? req.headers.referer;
  if (!origin) {
    if (env.IS_PRODUCTION) {
      logAbuse(req, "no_origin_in_production");
      return forbidden(res, "Origin header required");
    }
  } else {
    const allowed = [
      env.VITE_SITE_URL,
      env.VITE_ADMIN_URL,
      ...(env.IS_PRODUCTION ? [] : ["http://localhost:5173", "http://localhost:5174"]),
    ].filter(Boolean) as string[];
    let originAllowed = false;
    try {
      const originUrl = new URL(origin);
      originAllowed = allowed.some((u) => {
        try { return new URL(u).origin === originUrl.origin; } catch { return false; }
      });
    } catch { /* invalid origin URL */ }
    if (!originAllowed) {
      logAbuse(req, "origin_not_allowed", { origin });
      return forbidden(res, "Origin not allowed");
    }
  }

  // 2. Body must be an object (not array, not null)
  if (req.body === null || typeof req.body !== "object" || Array.isArray(req.body)) {
    return badRequest(res, { _form: ["Invalid payload"] });
  }

  // 3. Honeypot: silently reject if the hidden "website" field has any value.
  // Return success to avoid tipping off the bot, but do not insert.
  const body = req.body as Record<string, unknown>;
  if (typeof body.website === "string" && body.website.trim() !== "") {
    logAbuse(req, "honeypot_triggered", { website_length: body.website.length });
    return ok(res, undefined); // silently drop
  }

  // 4. Time-trap: form must take at least 2 seconds to fill.
  // Bots typically submit in < 500ms; a real user needs at least 2s.
  const formLoadedAt = body._formLoadedAt;
  if (typeof formLoadedAt === "number" && formLoadedAt > 0) {
    const elapsed = Date.now() - formLoadedAt;
    if (elapsed < 2000) {
      logAbuse(req, "time_trap_too_fast", { elapsed_ms: elapsed });
      return ok(res, undefined); // silently drop
    }
    // Reject timestamps in the future or too old (> 1 hour = likely replay)
    if (elapsed > 3_600_000) {
      logAbuse(req, "time_trap_stale", { elapsed_ms: elapsed });
      return badRequest(res, { _form: ["Form expired, please reload"] });
    }
  }

  // 5. Validate + normalize
  const result = contactSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors);
  }

  // Strip honeypot + time-trap fields before insert
  const { name, email, message } = result.data;
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("messages").insert({
    name,
    email,
    message,
    status: "unread",
  });

  if (error) {
    logger.error(
      {
        err: error.message,
        ip: req.ip,
        // Do NOT log message content (PII) — only metadata
        email_domain: email.split("@")[1] ?? null,
      },
      "CONTACT: insert failed",
    );
    return serverError(res, "Failed to send message");
  }

  logger.info(
    {
      ip: req.ip,
      email_domain: email.split("@")[1] ?? null,
      message_length: message.length,
    },
    "CONTACT: message accepted",
  );

  return ok(res, undefined);
});

export default router;
