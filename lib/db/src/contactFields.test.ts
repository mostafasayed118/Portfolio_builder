import { describe, it, expect } from "vitest";
import {
  CANONICAL_EMAIL,
  SOCIAL_LINKS,
  isPlaceholderEmail,
  isPlaceholderSocialUrl,
  normalizeContactInfoFields,
  normalizeEmail,
  normalizeHeroContentFields,
  normalizeSocialUrl,
} from "./contactFields";
import type { ContactInfo, HeroContent } from "@workspace/supabase/types";

describe("SOCIAL_LINKS", () => {
  it("holds the canonical URLs the site should always render", () => {
    expect(SOCIAL_LINKS).toEqual({
      github: "https://github.com/mostafasayed118",
      linkedin: "https://www.linkedin.com/in/mustafa-sayed11",
      youtube: "https://www.youtube.com/@MustafaSayed273",
      facebook: "https://www.facebook.com/mustafa.sayed.91259",
    });
  });
});

describe("isPlaceholderSocialUrl", () => {
  it("flags the yourusername placeholder that slipped past migration 050", () => {
    expect(isPlaceholderSocialUrl("https://github.com/yourusername")).toBe(true);
    expect(isPlaceholderSocialUrl("https://github.com/your-username")).toBe(true);
    expect(isPlaceholderSocialUrl("https://github.com/your_username")).toBe(true);
    expect(isPlaceholderSocialUrl("https://www.linkedin.com/in/yourusername")).toBe(true);
  });

  it("flags the legacy handles migration 050 rewrote", () => {
    expect(isPlaceholderSocialUrl("https://github.com/mustafasayed")).toBe(true);
    expect(isPlaceholderSocialUrl("https://github.com/mustafa-sayed")).toBe(true);
    expect(isPlaceholderSocialUrl("https://linkedin.com/in/mustafasayed")).toBe(true);
    expect(isPlaceholderSocialUrl("https://linkedin.com/in/mustafa-sayed")).toBe(true);
    expect(isPlaceholderSocialUrl("https://www.linkedin.com/in/mustafa-sayed")).toBe(true);
  });

  it("flags generic starter-template placeholders", () => {
    expect(isPlaceholderSocialUrl("https://www.youtube.com/yourchannel")).toBe(true);
    expect(isPlaceholderSocialUrl("https://www.facebook.com/yourname")).toBe(true);
    expect(isPlaceholderSocialUrl("https://example.com/johndoe")).toBe(true);
    expect(isPlaceholderSocialUrl("https://example.org/profile")).toBe(true);
  });

  it("does not flag real or canonical URLs", () => {
    expect(isPlaceholderSocialUrl(SOCIAL_LINKS.github)).toBe(false);
    expect(isPlaceholderSocialUrl(SOCIAL_LINKS.linkedin)).toBe(false);
    expect(isPlaceholderSocialUrl(SOCIAL_LINKS.youtube)).toBe(false);
    expect(isPlaceholderSocialUrl(SOCIAL_LINKS.facebook)).toBe(false);
    // The canonical handle "mustafa-sayed11" contains "mustafa-sayed" as a
    // substring — this is the exact false-positive the exact-segment check
    // exists to avoid.
    expect(isPlaceholderSocialUrl("https://www.linkedin.com/in/mustafa-sayed11")).toBe(false);
    expect(isPlaceholderSocialUrl("https://github.com/octocat")).toBe(false);
  });

  it("returns false for nullish and unparseable values", () => {
    expect(isPlaceholderSocialUrl(null)).toBe(false);
    expect(isPlaceholderSocialUrl(undefined)).toBe(false);
    expect(isPlaceholderSocialUrl("")).toBe(false);
    expect(isPlaceholderSocialUrl("not a url")).toBe(false);
  });
});

describe("isPlaceholderEmail", () => {
  it("flags the admin@example.com placeholder seeded by migration 001", () => {
    expect(isPlaceholderEmail("admin@example.com")).toBe(true);
    expect(isPlaceholderEmail("user@example.com")).toBe(true);
    expect(isPlaceholderEmail("yourname@example.org")).toBe(true);
    expect(isPlaceholderEmail("name@example.net")).toBe(true);
    expect(isPlaceholderEmail("anything@yourdomain.com")).toBe(true);
    expect(isPlaceholderEmail("anything@yourmail.com")).toBe(true);
  });

  it("flags yourname-style local parts on any domain", () => {
    expect(isPlaceholderEmail("yourname@gmail.com")).toBe(true);
    expect(isPlaceholderEmail("your-username@yahoo.com")).toBe(true);
    expect(isPlaceholderEmail("name@hotmail.com")).toBe(true);
  });

  it("does not flag real addresses", () => {
    expect(isPlaceholderEmail(CANONICAL_EMAIL)).toBe(false);
    expect(isPlaceholderEmail("someone@realcompany.com")).toBe(false);
    expect(isPlaceholderEmail("admin@mycompany.com")).toBe(false);
    expect(isPlaceholderEmail("user@protonmail.com")).toBe(false);
    expect(isPlaceholderEmail("m.sayed@outlook.com")).toBe(false);
  });

  it("returns false for nullish and unparseable values", () => {
    expect(isPlaceholderEmail(null)).toBe(false);
    expect(isPlaceholderEmail(undefined)).toBe(false);
    expect(isPlaceholderEmail("")).toBe(false);
    expect(isPlaceholderEmail("not an email")).toBe(false);
  });
});

describe("normalizeSocialUrl", () => {
  it("replaces legacy github handles with the canonical URL", () => {
    expect(normalizeSocialUrl("https://github.com/mustafasayed", SOCIAL_LINKS.github)).toBe(
      SOCIAL_LINKS.github,
    );
    expect(normalizeSocialUrl("https://github.com/mustafa-sayed", SOCIAL_LINKS.github)).toBe(
      SOCIAL_LINKS.github,
    );
    expect(normalizeSocialUrl("https://github.com/yourusername", SOCIAL_LINKS.github)).toBe(
      SOCIAL_LINKS.github,
    );
  });

  it("replaces legacy linkedin handles without touching the canonical handle", () => {
    expect(normalizeSocialUrl("https://linkedin.com/in/mustafasayed", SOCIAL_LINKS.linkedin)).toBe(
      SOCIAL_LINKS.linkedin,
    );
    expect(normalizeSocialUrl("https://www.linkedin.com/in/mustafa-sayed", SOCIAL_LINKS.linkedin)).toBe(
      SOCIAL_LINKS.linkedin,
    );
    expect(normalizeSocialUrl(SOCIAL_LINKS.linkedin, SOCIAL_LINKS.linkedin)).toBe(
      SOCIAL_LINKS.linkedin,
    );
  });

  it("replaces empty and '#' values with the canonical URL", () => {
    expect(normalizeSocialUrl("", SOCIAL_LINKS.github)).toBe(SOCIAL_LINKS.github);
    expect(normalizeSocialUrl("   ", SOCIAL_LINKS.github)).toBe(SOCIAL_LINKS.github);
    expect(normalizeSocialUrl("#", SOCIAL_LINKS.github)).toBe(SOCIAL_LINKS.github);
  });

  it("passes through real, non-placeholder URLs and nullish values", () => {
    expect(normalizeSocialUrl("https://github.com/octocat", SOCIAL_LINKS.github)).toBe(
      "https://github.com/octocat",
    );
    expect(normalizeSocialUrl(null, SOCIAL_LINKS.github)).toBeNull();
    expect(normalizeSocialUrl(undefined, SOCIAL_LINKS.github)).toBeNull();
  });
});

describe("normalizeEmail", () => {
  it("replaces placeholder addresses with the canonical email", () => {
    expect(normalizeEmail("admin@example.com")).toBe(CANONICAL_EMAIL);
    expect(normalizeEmail("yourname@gmail.com")).toBe(CANONICAL_EMAIL);
    expect(normalizeEmail("anything@yourdomain.org")).toBe(CANONICAL_EMAIL);
  });

  it("replaces empty values with the canonical email", () => {
    expect(normalizeEmail("")).toBe(CANONICAL_EMAIL);
    expect(normalizeEmail("   ")).toBe(CANONICAL_EMAIL);
  });

  it("passes through real addresses and nullish values", () => {
    expect(normalizeEmail(CANONICAL_EMAIL)).toBe(CANONICAL_EMAIL);
    expect(normalizeEmail("someone@realcompany.com")).toBe("someone@realcompany.com");
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
  });
});

describe("normalizeContactInfoFields", () => {
  it("replaces placeholder rows with the canonical values (the 050/051/053 regression)", () => {
    const row = {
      id: "1",
      email: "admin@example.com",
      github: "https://github.com/yourusername",
      linkedin: "https://linkedin.com/in/mustafasayed",
      youtube: "https://www.youtube.com/yourchannel",
      facebook: null,
    } as unknown as ContactInfo;

    expect(normalizeContactInfoFields(row)).toMatchObject({
      email: CANONICAL_EMAIL,
      github: SOCIAL_LINKS.github,
      linkedin: SOCIAL_LINKS.linkedin,
      youtube: SOCIAL_LINKS.youtube,
      facebook: null,
    });
  });

  it("leaves real values untouched", () => {
    const row = {
      id: "1",
      email: "someone@realcompany.com",
      github: "https://github.com/octocat",
      linkedin: SOCIAL_LINKS.linkedin,
      youtube: null,
      facebook: "https://www.facebook.com/some.real.page",
    } as unknown as ContactInfo;

    expect(normalizeContactInfoFields(row)).toMatchObject({
      email: "someone@realcompany.com",
      github: "https://github.com/octocat",
      linkedin: SOCIAL_LINKS.linkedin,
      youtube: null,
      facebook: "https://www.facebook.com/some.real.page",
    });
  });
});

describe("normalizeHeroContentFields", () => {
  it("replaces placeholder hero rows with the canonical values", () => {
    const row = {
      id: "1",
      email: "admin@example.com",
      github_url: "https://github.com/yourusername",
      linkedin_url: "https://www.linkedin.com/in/mustafa-sayed",
      youtube_url: null,
      facebook_url: "https://www.facebook.com/yourname",
    } as unknown as HeroContent;

    expect(normalizeHeroContentFields(row)).toMatchObject({
      email: CANONICAL_EMAIL,
      github_url: SOCIAL_LINKS.github,
      linkedin_url: SOCIAL_LINKS.linkedin,
      youtube_url: null,
      facebook_url: SOCIAL_LINKS.facebook,
    });
  });

  it("leaves real hero values untouched", () => {
    const row = {
      id: "1",
      email: CANONICAL_EMAIL,
      github_url: SOCIAL_LINKS.github,
      linkedin_url: SOCIAL_LINKS.linkedin,
      youtube_url: SOCIAL_LINKS.youtube,
      facebook_url: SOCIAL_LINKS.facebook,
    } as unknown as HeroContent;

    expect(normalizeHeroContentFields(row)).toMatchObject({
      email: CANONICAL_EMAIL,
      github_url: SOCIAL_LINKS.github,
      linkedin_url: SOCIAL_LINKS.linkedin,
      youtube_url: SOCIAL_LINKS.youtube,
      facebook_url: SOCIAL_LINKS.facebook,
    });
  });
});
