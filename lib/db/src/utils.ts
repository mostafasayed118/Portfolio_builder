/** Convert empty, '#', or whitespace-only URL values to null */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed === "" || trimmed === "#") return null;
  return trimmed;
}
