import { Router, type IRouter } from "express";
import { contactLimiter } from "../../middleware/rateLimiter";
import { z } from "zod";
import type { Request, Response } from "express";
import { getSupabaseClient } from "../../lib/supabase-client";

/**
 * @public contact routes
 * Handles contact form submissions from the public portfolio
 * Rate limited to 5 requests per hour per IP
 */

const router: IRouter = Router();

const supabase = getSupabaseClient();

/**
 * Sanitizes HTML entities in user input to prevent XSS attacks
 * @param input - Raw user input string
 * @returns Sanitized string with HTML entities escaped
 */
function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be under 100 characters").trim(),
  email: z.string().email("Valid email is required").trim(),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000, "Message must be under 2000 characters").trim(),
});

router.post("/", contactLimiter, async (req: Request, res: Response) => {
  // Origin check — reject requests from unexpected sources
  const origin = req.headers.origin ?? req.headers.referer;
  if (origin) {
    const allowed = [process.env.VITE_SITE_URL, process.env.VITE_ADMIN_URL].filter(Boolean);
    let originAllowed = false;
    try {
      const originUrl = new URL(origin);
      originAllowed = allowed.some((u) => {
        try { return new URL(u!).origin === originUrl.origin; } catch { return false; }
      });
    } catch { /* invalid origin URL */ }
    if (!originAllowed) {
      return res.status(403).json({ success: false, message: "Origin not allowed" });
    }
  }
  const result = contactSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      errors: result.error.flatten().fieldErrors,
    });
  }

  const { name, email, message } = result.data;

  const { error } = await supabase.from("messages").insert({
    name: sanitizeHtml(name),
    email: sanitizeHtml(email),
    message: sanitizeHtml(message),
    status: "unread",
  });

  if (error) {
    return res.status(500).json({ success: false, message: "Failed to send message" });
  }

  return res.json({ success: true });
});

export default router;
