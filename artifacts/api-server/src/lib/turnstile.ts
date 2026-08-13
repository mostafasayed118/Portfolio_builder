import { logger } from "./logger";
import { env } from "./env";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileVerifyResult {
  success: boolean;
  "error-codes"?: string[];
}

/**
 * Verifies a Cloudflare Turnstile response token with the siteverify API.
 *
 * Turnstile is an opt-in layer on top of the existing anti-abuse controls
 * (origin check, honeypot, time-trap, rate limit). It only runs when
 * `TURNSTILE_SECRET_KEY` is configured in the API server env; otherwise it is
 * a no-op that returns `true` so the contact flow keeps working without it.
 *
 * @param token the `cf-turnstile-response` token submitted by the client widget
 * @returns true when the token is valid, or when Turnstile is not configured
 */
export async function verifyTurnstileToken(token: string | undefined): Promise<boolean> {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Turnstile not configured — preserve existing behavior (no CAPTCHA gate).
    return true;
  }
  if (!token || typeof token !== "string" || token.length === 0) {
    logger.warn("TURNSTILE: no token supplied but secret is configured");
    return false;
  }

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, "TURNSTILE: siteverify HTTP error");
      return false;
    }
    const data = (await res.json()) as TurnstileVerifyResult;
    if (!data.success) {
      logger.warn(
        { error_codes: data["error-codes"] ?? [] },
        "TURNSTILE: verification failed",
      );
    }
    return data.success === true;
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, "TURNSTILE: verify error");
    return false;
  }
}
