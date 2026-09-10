import { z } from "zod";

/**
 * A saved custom theme template (admin's personal palettes, synced across
 * devices). `palette` mirrors the client `ThemePreviewData` shape — mode,
 * the 18 HSL color tokens, and the border radius — so the stored JSONB can
 * be mapped straight back onto the Theme Manager form.
 */
const paletteSchema = z.object({
  mode: z.enum(["light", "dark"]),
  lightPrimary: z.string().min(1).max(50),
  lightAccent: z.string().min(1).max(50),
  lightBackground: z.string().min(1).max(50),
  lightForeground: z.string().min(1).max(50),
  lightCard: z.string().min(1).max(50),
  lightBorder: z.string().min(1).max(50),
  lightMuted: z.string().min(1).max(50),
  lightMutedForeground: z.string().min(1).max(50),
  lightRing: z.string().min(1).max(50),
  darkPrimary: z.string().min(1).max(50),
  darkAccent: z.string().min(1).max(50),
  darkBackground: z.string().min(1).max(50),
  darkForeground: z.string().min(1).max(50),
  darkCard: z.string().min(1).max(50),
  darkBorder: z.string().min(1).max(50),
  darkMuted: z.string().min(1).max(50),
  darkMutedForeground: z.string().min(1).max(50),
  darkRing: z.string().min(1).max(50),
  radius: z.string().min(1).max(20),
});

export const themePresetSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  description: z.string().max(200).default(""),
  palette: paletteSchema,
});

export type ThemePresetInput = z.infer<typeof themePresetSchema>;
