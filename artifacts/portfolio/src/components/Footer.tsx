import { Github, Linkedin, Mail, Heart } from "lucide-react";
import { HERO } from "@/data/portfolio";
import { useBranding } from "@/lib/branding";
import { useLanguage } from "@/lib/language";

export default function Footer() {
  const { siteName } = useBranding();
  const { t } = useLanguage();

  return (
    <footer className="relative py-12 px-6 border-t border-border/50 bg-muted/10">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="font-display font-bold text-primary text-sm">
              {siteName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <span className="text-sm font-medium text-foreground">{siteName}</span>
            <span className="block text-xs text-muted-foreground">Data Engineer · Cairo, Egypt</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {[
            { href: HERO.github, icon: Github, label: "GitHub" },
            { href: HERO.linkedin, icon: Linkedin, label: "LinkedIn" },
            { href: `mailto:${HERO.email}`, icon: Mail, label: "Email" },
          ].map(({ href, icon: Icon, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all border border-transparent hover:border-primary/20"
              aria-label={label}
              data-testid={`footer-link-${label.toLowerCase()}`}
            >
              <Icon className="h-3.5 w-3.5" />
            </a>
          ))}
        </div>

        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {t.footer.madeWith} <Heart className="h-3 w-3 text-red-400 fill-red-400/30" /> Cairo
          <span className="hidden sm:inline"> · {new Date().getFullYear()}</span>
        </p>
      </div>
    </footer>
  );
}
