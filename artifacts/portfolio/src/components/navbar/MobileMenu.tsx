import { useRef, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { useLanguage } from "@/lib/language";

const NAV_LINKS = [
  { key: "about", href: "#about" },
  { key: "skills", href: "#skills" },
  { key: "projects", href: "#projects" },
  { key: "experience", href: "#experience" },
  { key: "certifications", href: "#certifications" },
  { key: "contact", href: "#contact" },
];

interface MobileMenuProps {
  open: boolean;
  onToggle: () => void;
  onNavClick: (href: string) => void;
  activeSection: string;
  themeToggle: React.ReactNode;
}

export default function MobileMenu({ open, onToggle, onNavClick, activeSection, themeToggle }: MobileMenuProps) {
  const { t } = useLanguage();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      menuButtonRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const menu = document.querySelector("[data-mobile-menu]");
    if (!menu) return;
    const focusable = menu.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };

    document.addEventListener("keydown", handleTab);
    first?.focus();
    return () => document.removeEventListener("keydown", handleTab);
  }, [open, onToggle]);

  return (
    <>
      <div className="flex items-center gap-2 md:hidden">
        {themeToggle}
        <button
          ref={menuButtonRef}
          onClick={onToggle}
          onKeyDown={(e) => e.key === "Escape" && onToggle()}
          className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          data-testid="btn-mobile-menu"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={onToggle} />
      )}
      <div
        id="mobile-nav"
        className={`md:hidden fixed top-16 left-0 right-0 overflow-hidden transition-all duration-300 z-40 ${
          open ? "max-h-[calc(100dvh-4rem)] opacity-100 overflow-y-auto" : "max-h-0 opacity-0"
        }`}
        data-mobile-menu
        role="navigation"
        aria-label="Mobile navigation"
        aria-hidden={!open}
        inert={!open}
      >
        <div className="glass-strong border-t border-border/50 px-6 py-4 space-y-1">
          {NAV_LINKS.map((link) => {
            const label = t.nav[link.key as keyof typeof t.nav] as string;
            return (
              <button
                key={link.href}
                onClick={() => { onNavClick(link.href); onToggle(); }}
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
    </>
  );
}