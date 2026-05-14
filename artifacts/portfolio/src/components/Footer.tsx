import { Github, Linkedin, Mail, Heart } from "lucide-react";
import { HERO } from "@/data/portfolio";

export default function Footer() {
  return (
    <footer className="py-10 px-6 border-t border-border/50 bg-muted/10">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-primary text-sm">MS</span>
          <span className="text-xs text-muted-foreground">
            — Mustafa Sayed · Data Engineer · Cairo, Egypt
          </span>
        </div>

        <div className="flex items-center gap-3">
          <a href={HERO.github} target="_blank" rel="noopener noreferrer"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
            aria-label="GitHub" data-testid="footer-link-github">
            <Github className="h-3.5 w-3.5" />
          </a>
          <a href={HERO.linkedin} target="_blank" rel="noopener noreferrer"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
            aria-label="LinkedIn" data-testid="footer-link-linkedin">
            <Linkedin className="h-3.5 w-3.5" />
          </a>
          <a href={`mailto:${HERO.email}`}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
            aria-label="Email" data-testid="footer-link-email">
            <Mail className="h-3.5 w-3.5" />
          </a>
        </div>

        <p className="text-xs text-muted-foreground flex items-center gap-1">
          Built with <Heart className="h-3 w-3 text-red-400" /> in Cairo, Egypt · 2025
        </p>
      </div>
    </footer>
  );
}
