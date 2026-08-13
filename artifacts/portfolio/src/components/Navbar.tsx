import { useState, useEffect, useCallback } from "react";
import { Moon, Sun } from "lucide-react";
import { useLocation } from "wouter";
import { useTheme } from "@/lib/theme";
import { useBranding } from "@/lib/branding";
import { useThrottledScroll } from "@/hooks/use-throttled-scroll";
import ThemeSyncBanner from "@/components/navbar/ThemeSyncBanner";
import NavLinks from "@/components/navbar/NavLinks";
import MobileMenu from "@/components/navbar/MobileMenu";

const NAVBAR_SCROLL_THRESHOLD = 20;
const ACTIVE_SECTION_THRESHOLD = 150;

const NAV_KEYS = ["about", "skills", "projects", "experience", "certifications", "contact"];

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const { siteName, logoUrl } = useBranding();
  const [location, navigate] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useThrottledScroll(() => {
    setScrolled(window.scrollY > NAVBAR_SCROLL_THRESHOLD);
    const reversed = [...NAV_KEYS].reverse();
    for (const id of reversed) {
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

  const toggleMobile = useCallback(() => setMobileOpen((v) => !v), []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
      return;
    }
    navigate("/");
    window.setTimeout(() => {
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  };

  const handleLogoClick = () => {
    setMobileOpen(false);
    if (location === "/") {
      document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    navigate("/");
  };

  const themeToggle = (
    <button
      onClick={toggle}
      className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
      aria-label="Toggle theme"
      data-testid="btn-theme-toggle"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm">
        Skip to content
      </a>
      <ThemeSyncBanner />
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass-strong shadow-[var(--shadow-card)]" : "bg-transparent"
      }`}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={handleLogoClick}
            className="flex items-center gap-2 font-display font-bold text-lg text-primary hover:opacity-80 transition-opacity"
            data-testid="nav-logo">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="h-8 w-auto object-contain"
                onError={(e) => { e.currentTarget.style.display = "none"; }} />
            ) : (
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{siteName}</span>
            )}
          </button>
          <NavLinks activeSection={activeSection} onNavClick={handleNavClick} />
          <MobileMenu
            open={mobileOpen}
            onToggle={toggleMobile}
            onNavClick={handleNavClick}
            activeSection={activeSection}
            themeToggle={themeToggle}
          />
        </div>
      </header>
    </div>
  );
}
