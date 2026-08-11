import { useLanguage } from "@/lib/language";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useTheme } from "@/lib/theme";
import { Moon, Sun } from "lucide-react";

const NAV_LINKS = [
  { key: "about", href: "#about" },
  { key: "skills", href: "#skills" },
  { key: "projects", href: "#projects" },
  { key: "experience", href: "#experience" },
  { key: "certifications", href: "#certifications" },
  { key: "contact", href: "#contact" },
];

interface NavLinksProps {
  activeSection: string;
  onNavClick: (href: string) => void;
}

export default function NavLinks({ activeSection, onNavClick }: NavLinksProps) {
  const { t } = useLanguage();
  const { theme, toggle } = useTheme();

  return (
    <nav className="hidden md:flex items-center gap-1">
      {NAV_LINKS.map((link) => {
        const isActive = activeSection === link.href.slice(1);
        const label = t.nav[link.key as keyof typeof t.nav] as string;
        return (
          <button
            key={link.href}
            onClick={() => onNavClick(link.href)}
            aria-current={isActive ? "page" : undefined}
            className={`relative px-3 py-2 text-sm font-medium rounded-lg transition-all ${
              isActive
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            data-testid={`nav-${link.key}`}
          >
            {label}
            {isActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        );
      })}
      <div className="w-px h-5 bg-border mx-2" />
      <LanguageToggle />
      <button
        onClick={toggle}
        className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        aria-label="Toggle theme"
        data-testid="btn-theme-toggle"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </nav>
  );
}