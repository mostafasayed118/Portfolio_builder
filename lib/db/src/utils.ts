const HAS_URI_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
const SAFE_URI_SCHEME = /^(?:https?|mailto|tel):/i;

/**
 * Convert empty, '#', or whitespace-only URL values to null, and reject
 * dangerous URI schemes (javascript:, data:, vbscript:, file:, ...).
 * Site-relative paths (/path) and scheme-less values pass through — browsers
 * resolve those as relative URLs, so they cannot execute script content.
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed === "" || trimmed === "#") return null;
  if (HAS_URI_SCHEME.test(trimmed) && !SAFE_URI_SCHEME.test(trimmed)) return null;
  return trimmed;
}
