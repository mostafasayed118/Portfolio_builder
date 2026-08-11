export type ThemePreviewData = {
  mode: "light" | "dark";
  lightPrimary: string; lightAccent: string; lightBackground: string;
  lightForeground: string; lightCard: string; lightBorder: string;
  lightMuted: string; lightMutedForeground: string; lightRing: string;
  darkPrimary: string; darkAccent: string; darkBackground: string;
  darkForeground: string; darkCard: string; darkBorder: string;
  darkMuted: string; darkMutedForeground: string; darkRing: string;
  radius: string;
};

export function PreviewPalette({ theme, mode }: { theme: ThemePreviewData; mode: "light" | "dark" }) {
  const primary = mode === "light" ? theme.lightPrimary : theme.darkPrimary;
  const accent = mode === "light" ? theme.lightAccent : theme.darkAccent;
  const bg = mode === "light" ? theme.lightBackground : theme.darkBackground;
  const card = mode === "light" ? theme.lightCard : theme.darkCard;
  const fg = mode === "light" ? theme.lightForeground : theme.darkForeground;
  const muted = mode === "light" ? theme.lightMuted : theme.darkMuted;
  const border = mode === "light" ? theme.lightBorder : theme.darkBorder;

  return (
    <div className="rounded-xl p-4 space-y-3 border" style={{ background: `hsl(${bg})`, borderColor: `hsl(${border})` }}>
      <div style={{ color: `hsl(${fg})` }} className="text-sm font-semibold">
        {mode === "light" ? "\u2600\uFE0F" : "\uD83C\uDF19"} {mode.charAt(0).toUpperCase() + mode.slice(1)} Mode Preview
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Primary", bg: primary, fg: "0 0% 100%" },
          { label: "Accent", bg: accent, fg: "0 0% 100%" },
          { label: "Muted", bg: muted, fg: fg },
        ].map(({ label, bg: btnBg, fg: btnFg }) => (
          <div key={label} className="px-3 py-1 rounded-md text-xs font-medium"
            style={{ background: `hsl(${btnBg})`, color: `hsl(${btnFg})`, borderRadius: theme.radius }}>
            {label}
          </div>
        ))}
      </div>
      <div className="rounded-lg p-3 border" style={{ background: `hsl(${card})`, borderColor: `hsl(${border})`, borderRadius: theme.radius }}>
        <div style={{ color: `hsl(${fg})` }} className="text-xs font-medium">Card Surface</div>
        <div style={{ color: `hsl(${fg})`, opacity: 0.6 }} className="text-xs mt-1">Body text & content area</div>
      </div>
    </div>
  );
}
