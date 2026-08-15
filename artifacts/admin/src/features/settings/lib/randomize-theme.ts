import type { ThemePreviewData } from "@/features/settings/components/ThemePreview";

/**
 * Random palette generator for the Theme Manager's "Randomize" button.
 *
 * Produces a harmonious light + dark scheme from a single random base hue:
 *
 *   - Primary and accent are analogous colors (30–45° apart on the wheel),
 *     which is the simplest proven "harmonious" pairing.
 *   - Every neutral (background, foreground, card, border, muted) is derived
 *     from the same family hue with small shifts, so the scheme reads as one
 *     palette rather than a set of unrelated colors.
 *   - Light mode uses high-luminance surfaces (96–98% bg, ~100% card) with a
 *     dark foreground; dark mode inverts to low-luminance surfaces (5–8% bg)
 *     with a light foreground and a brighter primary — guaranteed contrast in
 *     both directions.
 *
 * Like presets, this only pre-fills the form: nothing is persisted until
 * "Save Changes" is clicked, and every color stays manually editable.
 * `mode` and `radius` are preserved from the current theme.
 */

const rint = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const normalizeHue = (h: number): number => ((h % 360) + 360) % 360;

const hsl = (h: number, s: number, l: number): string =>
  `${normalizeHue(h)} ${s}% ${l}%`;

const ACCENT_OFFSETS = [30, 45];

export function randomizeTheme(current: ThemePreviewData): ThemePreviewData {
  const base = rint(0, 359);
  const direction = Math.random() < 0.5 ? -1 : 1;
  const accent = normalizeHue(base + direction * ACCENT_OFFSETS[rint(0, ACCENT_OFFSETS.length - 1)]);
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
    lightRing: hsl(base, lightPrimaryS, Math.min(lightPrimaryL + 4, 55)),

    darkPrimary: hsl(base, rint(78, 95), darkPrimaryL),
    darkAccent: hsl(accent, rint(88, 100), Math.min(lightAccentL + 14, 62)),
    darkBackground: hsl(bgHue, rint(42, 54), rint(5, 8)),
    darkForeground: hsl(fgHue, rint(25, 32), rint(95, 97)),
    darkCard: hsl(bgHue, rint(32, 44), rint(8, 10)),
    darkBorder: hsl(bgHue, rint(18, 26), rint(16, 20)),
    darkMuted: hsl(bgHue, rint(26, 34), rint(11, 14)),
    darkMutedForeground: hsl(bgHue, rint(15, 22), rint(68, 74)),
    darkRing: hsl(base, rint(78, 95), darkPrimaryL),

    radius: current.radius,
  };
}
