import { useLanguage } from "@/lib/language";

export function LanguageToggle() {
  const { lang, toggleLanguage, t, showToggle } = useLanguage();

  if (!showToggle) return null;

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                 border border-border text-sm font-medium
                 hover:bg-muted transition-colors cursor-pointer"
      title={`Switch to ${lang === "en" ? "Arabic" : "English"}`}
      aria-label={`Switch language to ${lang === "en" ? "Arabic" : "English"}`}
    >
      <span className="text-base">
        {lang === "en" ? "\uD83C\uDDF8\uD83C\uDDE6" : "\uD83C\uDDEC\uD83C\uDDE7"}
      </span>
      <span className="font-semibold tracking-wide">
        {t.language.switch}
      </span>
    </button>
  );
}
