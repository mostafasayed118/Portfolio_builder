import { Router, type IRouter } from "express";
import { contactLimiter } from "../../middleware/rateLimiter";
import type { Request, Response } from "express";
import { contactSubmissionSchema } from "@workspace/api-zod";
import { getSupabaseClient } from "../../lib/supabase-client";
import { ok, badRequest, serverError, forbidden, rateLimited } from "../../lib/api-response";
import { logger } from "../../lib/logger";
import { env } from "../../lib/env";
import { verifyTurnstileToken } from "../../lib/turnstile";
import { notifyNewContact } from "../../lib/mailer";

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

const contactSchema = contactSubmissionSchema;

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

  // 4.5 Cloudflare Turnstile (opt-in). When configured, require a valid
  // client token before accepting the message.
  const turnstileOk = await verifyTurnstileToken(body.cfTurnstileToken as string | undefined);
  if (!turnstileOk) {
    logAbuse(req, "turnstile_failed");
    return forbidden(res, "CAPTCHA verification failed, please try again");
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
    // Distinguish the DB-level per-email spam guard (migration
    // 044_contact_spam_guard.sql raises "Rate limit exceeded: too many
    // messages from this email") from genuine insert failures. That rejection
    // is expected anti-abuse behavior, not a server fault — return a friendly
    // 429 so the UI can tell the user to slow down.
    const isPerEmailRateLimit =
      typeof error.message === "string" &&
      /rate limit exceeded|too many messages/i.test(error.message);

    if (isPerEmailRateLimit) {
      logger.info(
        {
          ip: req.ip,
          // Do NOT log message content (PII) — only metadata
          email_domain: email.split("@")[1] ?? null,
        },
        "CONTACT: rejected by DB per-email spam guard",
      );
      return rateLimited(res, "Too many messages sent, please try again later");
    }

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

  // Fire-and-forget email notification to the site owner (opt-in).
  // Never awaited/blocked-on; failures are logged by the mailer.
  notifyNewContact({ name, email, message }).catch(() => {});

  return ok(res, undefined);
});

export default router;
