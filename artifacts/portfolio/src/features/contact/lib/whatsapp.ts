/**
 * Builds a WhatsApp click-to-chat link from a phone number and a prefilled
 * message. Digits are stripped from whatever format the admin stores
 * (e.g. "+20 115 458 0512" -> "201154580512"), and the message is
 * URL-encoded into the `text` query param.
 *
 * Returns null when the number contains no digits, so callers can skip
 * rendering the button entirely instead of linking to an empty wa.me URL.
 */
export function buildWhatsAppHref(
  whatsapp: string | null | undefined,
  message: string,
): string | null {
  const digits = (whatsapp ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
