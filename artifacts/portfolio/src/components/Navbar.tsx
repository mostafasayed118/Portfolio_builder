import { useState, useEffect } from "react";
import { Moon, Sun, Menu, X } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useBranding } from "@/lib/branding";
import { useThrottledScroll } from "@/hooks/use-throttled-scroll";
import { useLanguage } from "@/lib/language";
import { LanguageToggle } from "@/components/LanguageToggle";

const NAVBAR_SCROLL_THRESHOLD = 20;
const ACTIVE_SECTION_THRESHOLD = 150;

const NAV_LINKS = [
  { key: "about", href: "#about" },
  { key: "skills", href: "#skills" },
  { key: "projects", href: "#projects" },
  { key: "experience", href: "#experience" },
  { key: "certifications", href: "#certifications" },
  { key: "contact", href: "#contact" },
];

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const { siteName, logoUrl } = useBranding();
  const { t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useThrottledScroll(() => {
    setScrolled(window.scrollY > NAVBAR_SCROLL_THRESHOLD);
    const sections = [...NAV_LINKS.map(l => l.href.slice(1))].reverse();
    for (const id of sections) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= ACTIVE_SECTION_THRESHOLD) {
        setActiveSection(id);
        break;
      }
    }
  }, 16);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const menu = document.querySelector("[data-mobile-menu]");
    if (!menu) return;
    const focusable = menu.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleTab);
    first?.focus();
    return () => document.removeEventListener("keydown", handleTab);
  }, [mobileOpen]);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "glass-strong shadow-[var(--shadow-card)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <button
          onClick={() => handleNavClick("#hero")}
          className="flex items-center gap-2 font-display font-bold text-lg text-primary hover:opacity-80 transition-opacity"
          data-testid="nav-logo"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={siteName}
              className="h-8 w-auto object-contain"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          ) : (
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {siteName}
            </span>
          )}
        </button>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = activeSection === link.href.slice(1);
            const label = t.nav[link.key as keyof typeof t.nav] as string;
            return (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
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

        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={toggle}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            onKeyDown={(e) => e.key === "Escape" && setMobileOpen(false)}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            data-testid="btn-mobile-menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

        {mobileOpen && ( // FIX: UX-013
          <div
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <div
          id="mobile-nav"
          className={`md:hidden overflow-hidden transition-all duration-300 z-40 ${
            mobileOpen ? "max-h-[calc(100dvh-4rem)] opacity-100 overflow-y-auto" : "max-h-0 opacity-0"
          }`}
          data-mobile-menu
          role="navigation"
          aria-label="Mobile navigation"
        >
        <div className="glass-strong border-t border-border/50 px-6 py-4 space-y-1">
          {NAV_LINKS.map((link) => {
            const label = t.nav[link.key as keyof typeof t.nav] as string;
            return (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                aria-current={activeSection === link.href.slice(1) ? "page" : undefined}
                className={`block w-full text-start px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeSection === link.href.slice(1)
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                data-testid={`mobile-nav-${link.key}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
