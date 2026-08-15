import type { ThemePreviewData } from "@/features/settings/components/ThemePreview";

/**
 * Random palette generator for the Theme Manager's "Randomize" button.
 *
 * Produces a harmonious light + dark scheme from a single random base hue,
 * in one of three color-harmony families (cycled on each click):
 *
 *   - Analogous:      accent sits 30–45° from the base — the classic soft pairing.
 *   - Complementary:  accent is the base's opposite (180°) — high contrast.
 *   - Triadic:        accent and the focus-ring color sit at 120° and 240°,
 *                     the three corners of an equilateral wheel.
 *
 * Every neutral (background, foreground, card, border, muted) is derived
 * from the same family hue with small shifts, so the scheme reads as one
 * palette rather than a set of unrelated colors. Light mode uses
 * high-luminance surfaces (96–98% bg, ~100% card) with a dark foreground;
 * dark mode inverts to low-luminance surfaces (5–8% bg) with a light
 * foreground and a brighter primary — guaranteed contrast in both
 * directions.
 *
 * A `seed` string makes the whole draw deterministic: the same
 * (seed, harmony) pair always produces the exact same palette, so a palette
 * can be bookmarked and regenerated identically on any device. Without a
 * seed, Math.random is used (the original behavior). Only the colors are
 * seeded — `mode` and `radius` are preserved from the current theme, since
 * they are preferences rather than palette content.
 *
 * Like presets, this only pre-fills the form: nothing is persisted until
 * "Save Changes" is clicked, and every color stays manually editable.
 */

export type HarmonyType = "analogous" | "complementary" | "triadic";

/** Click order for the Randomize button. */
export const HARMONY_ORDER: HarmonyType[] = ["analogous", "complementary", "triadic"];

export const HARMONY_LABELS: Record<HarmonyType, string> = {
  analogous: "Analogous",
  complementary: "Complementary",
  triadic: "Triadic",
};

/** The harmony the next Randomize click will use. */
export function nextHarmonyType(current: HarmonyType): HarmonyType {
  return HARMONY_ORDER[(HARMONY_ORDER.indexOf(current) + 1) % HARMONY_ORDER.length];
}

const ACCENT_OFFSETS = [30, 45];

// ---------------------------------------------------------------------------
// Deterministic randomness: xmur3 string hash → mulberry32 PRNG. A fixed
// seed reproduces the identical sequence of draws, so the same seed string
// always yields the same palette (for a given harmony).
// ---------------------------------------------------------------------------
function xmur3(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Readable seed alphabet — no 0/1/l/o so seeds are easy to retype. */
const SEED_ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";

/** A fresh random seed string representing the next palette. */
export function generateSeed(length = 10): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    const idx =
      typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function"
        ? crypto.getRandomValues(new Uint32Array(1))[0] % SEED_ALPHABET.length
        : Math.floor(Math.random() * SEED_ALPHABET.length);
    out += SEED_ALPHABET[idx];
  }
  return out;
}

/** Accent + focus-ring hues for a harmony, derived from the random base hue. */
function harmonyHues(base: number, harmony: HarmonyType, rand: () => number): { accent: number; ring: number } {
  const rint = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
  switch (harmony) {
    case "complementary":
      return { accent: normalizeHue(base + 180), ring: normalizeHue(base + 180) };
    case "triadic":
      return { accent: normalizeHue(base + 120), ring: normalizeHue(base + 240) };
    case "analogous":
    default: {
      const direction = rand() < 0.5 ? -1 : 1;
      return {
        accent: normalizeHue(base + direction * ACCENT_OFFSETS[rint(0, ACCENT_OFFSETS.length - 1)]),
        ring: base,
      };
    }
  }
}

const normalizeHue = (h: number): number => ((h % 360) + 360) % 360;

const hsl = (h: number, s: number, l: number): string =>
  `${normalizeHue(h)} ${s}% ${l}%`;

export function randomizeTheme(
  current: ThemePreviewData,
  harmony: HarmonyType = "analogous",
  seed?: string,
): ThemePreviewData {
  // A non-empty seed switches the draw to a deterministic PRNG keyed by
  // seed + harmony, so identical inputs always reproduce the same palette.
  const trimmedSeed = seed?.trim();
  const rand = trimmedSeed
    ? mulberry32(xmur3(`${trimmedSeed}|${harmony}`))
    : Math.random;
  const rint = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

  const base = rint(0, 359);
  const { accent, ring } = harmonyHues(base, harmony, rand);
  const bgHue = normalizeHue(base + rint(-8, 8));
  const fgHue = normalizeHue(bgHue + rint(-4, 4));

  const lightPrimaryS = rint(70, 88);
  const lightPrimaryL = rint(40, 48);
  const darkPrimaryL = Math.min(lightPrimaryL + 18, 68);
  const lightAccentL = rint(38, 46);

  return {
    mode: current.mode,

    lightPrimary: hsl(base, lightPrimaryS, lightPrimaryL),
    lightAccent: hsl(accent, rint(80, 92), lightAccentL),
    lightBackground: hsl(bgHue, rint(22, 34), rint(96, 98)),
    lightForeground: hsl(fgHue, rint(35, 45), rint(8, 12)),
    lightCard: hsl(bgHue, rint(14, 24), 100),
    lightBorder: hsl(bgHue, rint(16, 26), rint(82, 88)),
    lightMuted: hsl(bgHue, rint(18, 28), rint(90, 94)),
    lightMutedForeground: hsl(bgHue, rint(12, 20), rint(40, 46)),
    lightRing: hsl(ring, lightPrimaryS, Math.min(lightPrimaryL + 4, 55)),

    darkPrimary: hsl(base, rint(78, 95), darkPrimaryL),
    darkAccent: hsl(accent, rint(88, 100), Math.min(lightAccentL + 14, 62)),
    darkBackground: hsl(bgHue, rint(42, 54), rint(5, 8)),
    darkForeground: hsl(fgHue, rint(25, 32), rint(95, 97)),
    darkCard: hsl(bgHue, rint(32, 44), rint(8, 10)),
    darkBorder: hsl(bgHue, rint(18, 26), rint(16, 20)),
    darkMuted: hsl(bgHue, rint(26, 34), rint(11, 14)),
    darkMutedForeground: hsl(bgHue, rint(15, 22), rint(68, 74)),
    darkRing: hsl(ring, rint(78, 95), darkPrimaryL),

    radius: current.radius,
  };
}
