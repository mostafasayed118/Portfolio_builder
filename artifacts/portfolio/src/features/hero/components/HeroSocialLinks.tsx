import { Github, Linkedin, Mail, Youtube, Facebook } from "lucide-react";
import type { HeroData } from "@/features/hero/types";

interface HeroSocialLinksProps {
  hero: HeroData;
}

export function HeroSocialLinks({ hero }: HeroSocialLinksProps) {
  const links = [
    { href: hero.github, icon: Github, label: "GitHub", testid: "link-github" },
    { href: hero.linkedin, icon: Linkedin, label: "LinkedIn", testid: "link-linkedin" },
    { href: hero.youtube, icon: Youtube, label: "YouTube", testid: "link-youtube" },
    { href: hero.facebook, icon: Facebook, label: "Facebook", testid: "link-facebook" },
    { href: `mailto:${hero.email}`, icon: Mail, label: "Email", testid: "link-email" },
  ];

  return (
    <div className="flex items-center gap-3 justify-center md:justify-start">
      {links.map(({ href, icon: Icon, label, testid }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer"
          className="h-10 w-10 rounded-xl flex items-center justify-center glass border hover:border-primary/40 hover:text-primary text-muted-foreground transition-all"
          aria-label={label} data-testid={testid}>
          <Icon className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}
