import { useThemeSync } from "@/lib/theme-sync-context";
import { useTheme } from "@/lib/theme";

export default function ThemeSyncBanner() {
  const { isSynced, mode, previousTheme, acknowledge } = useThemeSync();
  const { setTheme } = useTheme();

  if (!isSynced) return null;

  const handleUndo = () => {
    const undoTheme = (sessionStorage.getItem("theme_undo") as "light" | "dark" | null) ?? previousTheme;
    if (undoTheme) {
      setTheme(undoTheme);
      localStorage.setItem("theme_explicit", "true");
    }
    sessionStorage.removeItem("theme_undo");
    acknowledge();
  };

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-center gap-3 text-sm">
      <span>
        Theme set to{" "}
        <strong>{mode === "dark" ? "Dark mode" : "Light mode"}</strong>
      </span>
      <span>from site settings</span>
      <button onClick={handleUndo} className="underline text-primary hover:text-primary/80 font-medium">Undo</button>
      <button onClick={acknowledge} className="text-muted-foreground hover:text-foreground">Dismiss</button>
    </div>
  );
}