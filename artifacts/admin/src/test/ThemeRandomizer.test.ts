import { describe, it, expect } from "vitest";
import { randomizeTheme } from "@/features/settings/lib/randomize-theme";
import type { ThemePreviewData } from "@/features/settings/components/ThemePreview";

const BASE: ThemePreviewData = {
  mode: "dark",
  lightPrimary: "204 92% 42%", lightAccent: "189 90% 38%", lightBackground: "220 30% 97%",
  lightForeground: "222 40% 10%", lightCard: "0 0% 100%", lightBorder: "220 18% 84%",
  lightMuted: "220 20% 91%", lightMutedForeground: "220 15% 42%", lightRing: "204 92% 45%",
  darkPrimary: "204 92% 62%", darkAccent: "189 95% 53%", darkBackground: "222 48% 6%",
  darkForeground: "210 30% 96%", darkCard: "222 40% 9%", darkBorder: "220 22% 18%",
  darkMuted: "222 32% 12%", darkMutedForeground: "215 18% 72%", darkRing: "204 92% 62%",
  radius: "0.75rem",
};

const HSL_RE = /^(\d{1,3}) (\d{1,3})% (\d{1,3})%$/;

function parseHsl(v: string): { h: number; s: number; l: number } {
  const m = HSL_RE.exec(v);
  if (!m) throw new Error(`invalid HSL: ${v}`);
  return { h: Number(m[1]), s: Number(m[2]), l: Number(m[3]) };
}

const COLOR_KEYS: (keyof ThemePreviewData)[] = [
  "lightPrimary", "lightAccent", "lightBackground", "lightForeground", "lightCard",
  "lightBorder", "lightMuted", "lightMutedForeground", "lightRing",
  "darkPrimary", "darkAccent", "darkBackground", "darkForeground", "darkCard",
  "darkBorder", "darkMuted", "darkMutedForeground", "darkRing",
];

describe("randomizeTheme", () => {
  it("returns a complete palette with valid HSL triplets and preserves mode/radius", () => {
    for (let i = 0; i < 100; i++) {
      const out = randomizeTheme(BASE);
      expect(out.mode).toBe("dark");
      expect(out.radius).toBe("0.75rem");
      for (const key of COLOR_KEYS) {
        const { h, s, l } = parseHsl(out[key]);
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThan(360);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(100);
        expect(l).toBeGreaterThanOrEqual(0);
        expect(l).toBeLessThanOrEqual(100);
      }
    }
  });

  it("keeps primary and accent analogous (30 or 45 degrees apart)", () => {
    for (let i = 0; i < 100; i++) {
      const out = randomizeTheme(BASE);
      const { h: ph } = parseHsl(out.lightPrimary);
      const { h: ah } = parseHsl(out.lightAccent);
      const diff = Math.abs(((ah - ph) % 360 + 360) % 360);
      expect([30, 45, 315, 330]).toContain(diff);
    }
  });

  it("produces a genuine light/dark inversion (high vs low surface luminance)", () => {
    for (let i = 0; i < 100; i++) {
      const out = randomizeTheme(BASE);
      expect(parseHsl(out.lightBackground).l).toBeGreaterThan(94);
      expect(parseHsl(out.darkBackground).l).toBeLessThan(10);
      expect(parseHsl(out.lightForeground).l).toBeLessThan(15);
      expect(parseHsl(out.darkForeground).l).toBeGreaterThan(94);
      // Dark primary must be lighter than its light-mode counterpart so it
      // reads well on a dark background.
      expect(parseHsl(out.darkPrimary).l).toBeGreaterThan(parseHsl(out.lightPrimary).l);
    }
  });

  it("generates a different palette each call", () => {
    const palettes = Array.from({ length: 5 }, () => randomizeTheme(BASE));
    const unique = new Set(palettes.map((p) => JSON.stringify(p)));
    expect(unique.size).toBeGreaterThan(1);
  });
});
