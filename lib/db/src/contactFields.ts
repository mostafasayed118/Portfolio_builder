import type { ContactInfo, HeroContent } from "@workspace/supabase/types";
import { sanitizeUrl } from "./utils";

// ============================================================================
// Contact identity canonicalization (social links + email).
//
// Migrations 050/051 corrected legacy placeholder handles directly in SQL
// (`mustafasayed` / `mustafa-sayed` → `mostafasayed118` / `mustafa-sayed11`)
// and 053 fixes the placeholder email (`admin@example.com`) seeded by
// migration 001. But a migration can only fix the patterns it knows about,
// so this module is the read-time backstop: every social URL and email that
// flows out of the db layer is checked against the known placeholder patterns
// and replaced with the canonical value, so a placeholder row can never render
// as a broken link or dead email on the site.
// ============================================================================

/** Canonical social URLs — single source of truth for defaults and fixes. */
export const SOCIAL_LINKS = {
  github: "https://github.com/mostafasayed118",
  linkedin: "https://www.linkedin.com/in/mustafa-sayed11",
  youtube: "https://www.youtube.com/@MustafaSayed273",
  facebook: "https://www.facebook.com/mustafa.sayed.91259",
} as const;

/** Canonical contact email — matches the live contact_info row. */
export const CANONICAL_EMAIL = "mustafasayed20002@gmail.com";

/**
 * Generic placeholder markers found in seeded rows and starter templates.
 * Kept deliberately conservative — "yourname" variants, "example.com", and
 * the literal word "placeholder" — so real handles are never misflagged.
 */
const PLACEHOLDER_MARKERS =
  /(yourusername|your-username|your_username|yourname|your-name|yourhandle|your-handle|yourchannel|your-channel|yourprofile|your-profile|example\.com|example\.org|placeholder)/i;

/**
 * Legacy handles that migration 050 rewrote in SQL. Checked as exact path
 * segments (not substrings) so the canonical `mustafa-sayed11` handle is not
 * mistaken for the legacy `mustafa-sayed`.
 */
const LEGACY_GITHUB_HANDLES = new Set(["mustafasayed", "mustafa-sayed"]);
const LEGACY_LINKEDIN_HANDLES = new Set(["mustafasayed", "mustafa-sayed"]);

/** True when the URL is a seed placeholder / legacy handle, not a real link. */
export function isPlaceholderSocialUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const lower = url.trim().toLowerCase();
  if (PLACEHOLDER_MARKERS.test(lower)) return true;

  let parsed: URL;
  try {
    parsed = new URL(lower);
  } catch {
    return false;
  }

  const host = parsed.hostname.replace(/^www\./, "");
  if (host === "github.com") {
    const handle = parsed.pathname.split("/").filter(Boolean)[0];
    return handle ? LEGACY_GITHUB_HANDLES.has(handle) : false;
  }
  if (host === "linkedin.com") {
    const segments = parsed.pathname.split("/").filter(Boolean);
    return segments.length >= 2 && segments[0] === "in"
      ? LEGACY_LINKEDIN_HANDLES.has(segments[1])
      : false;
  }
  return false;
}

/** Placeholder email domains from starter templates (example.com and friends). */
const PLACEHOLDER_EMAIL_DOMAINS =
  /@(example\.(com|org|net)|yourdomain\.(com|org|net)|yourmail\.com|testmail\.com|examplemail\.com)$/i;

/** Template local parts that are placeholders on any domain. */
const PLACEHOLDER_EMAIL_LOCAL =
  /^(yourname|your-name|your_name|yourusername|your-username|your_username|name)$/i;

/** True when the address is a seed placeholder (e.g. `admin@example.com`). */
export function isPlaceholderEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.trim().toLowerCase();
  if (PLACEHOLDER_EMAIL_DOMAINS.test(lower)) return true;
  const [local] = lower.split("@");
  return local ? PLACEHOLDER_EMAIL_LOCAL.test(local) : false;
}

/**
 * Returns the canonical URL when `url` is a placeholder or empty, the trimmed
 * URL when it is a real link, or `null` when the stored value was nullish.
 */
export function normalizeSocialUrl(
  url: string | null | undefined,
  canonical: string,
): string | null {
  if (url == null) return null;
  const trimmed = sanitizeUrl(url);
  if (trimmed == null) return canonical; // empty / "#" → canonical, never a dead link
  return isPlaceholderSocialUrl(trimmed) ? canonical : trimmed;
}

/**
 * Returns the canonical email when `email` is a placeholder or empty, the
 * trimmed address when it is real, or `null` when the stored value was
 * nullish.
 */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (email == null) return null;
  const trimmed = sanitizeUrl(email);
  if (trimmed == null) return CANONICAL_EMAIL; // empty → canonical, never a dead mailto
  return isPlaceholderEmail(trimmed) ? CANONICAL_EMAIL : trimmed;
}

/**
 * Spreads `value` into the row only when it is a non-null string, preserving
 * the row's exact shape (null stays null, absent stays absent) while still
 * replacing placeholders with the canonical value.
 */
function overrideWhenString<T extends object>(
  row: T,
  key: keyof T,
  value: string | null,
): T {
  return value === null ? row : { ...row, [key]: value };
}

/** Normalizes the identity fields (social URLs + email) of a contact_info row. */
export function normalizeContactInfoFields(
  info: ContactInfo,
): ContactInfo {
  let out = info;
  out = overrideWhenString(out, "github", normalizeSocialUrl(info.github, SOCIAL_LINKS.github));
  out = overrideWhenString(out, "linkedin", normalizeSocialUrl(info.linkedin, SOCIAL_LINKS.linkedin));
  out = overrideWhenString(out, "youtube", normalizeSocialUrl(info.youtube, SOCIAL_LINKS.youtube));
  out = overrideWhenString(out, "facebook", normalizeSocialUrl(info.facebook, SOCIAL_LINKS.facebook));
  out = overrideWhenString(out, "email", normalizeEmail(info.email));
  return out;
}

/** Normalizes the identity fields (social URLs + email) of a hero_content row. */
export function normalizeHeroContentFields(
  info: HeroContent,
): HeroContent {
  let out = info;
  out = overrideWhenString(out, "github_url", normalizeSocialUrl(info.github_url, SOCIAL_LINKS.github));
  out = overrideWhenString(out, "linkedin_url", normalizeSocialUrl(info.linkedin_url, SOCIAL_LINKS.linkedin));
  out = overrideWhenString(out, "youtube_url", normalizeSocialUrl(info.youtube_url, SOCIAL_LINKS.youtube));
  out = overrideWhenString(out, "facebook_url", normalizeSocialUrl(info.facebook_url, SOCIAL_LINKS.facebook));
  out = overrideWhenString(out, "email", normalizeEmail(info.email));
  return out;
}
