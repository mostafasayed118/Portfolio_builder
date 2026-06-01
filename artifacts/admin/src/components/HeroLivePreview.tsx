import { Github, Linkedin, Twitter, Mail, Download } from "lucide-react";
import { Button } from "@workspace/ui";

/** Only allow http/https URLs to prevent javascript: injection */
function safeHref(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? url : undefined;
  } catch {
    return undefined;
  }
}

type HeroFormData = {
  name: string;
  typewriter_lines: string[];
  subtitle: string;
  bio: string;
  avatar_url: string;
  cv_url: string;
  social_links: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    email?: string;
    [key: string]: string | undefined;
  };
  stats: Array<{ label: string; value: string }>;
};

export function HeroLivePreview({ data }: { data: Partial<HeroFormData> }) {
  const firstLine = data.typewriter_lines?.[0] || "Developer";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {data.avatar_url ? (
          <img
            src={data.avatar_url}
            alt="Avatar"
            className="h-20 w-20 rounded-full object-cover border-2 border-primary/20"
          />
        ) : (
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground">
            {data.name ? data.name.charAt(0) : "?"}
          </div>
        )}
        <div>
          <h2 className="text-2xl font-bold">
            Hi, I'm {data.name || "Your Name"}
          </h2>
          <div className="text-lg text-primary">
            {firstLine}
            <span className="animate-pulse">|</span>
          </div>
        </div>
      </div>

      {data.bio && (
        <p className="text-sm text-muted-foreground line-clamp-3">
          {data.bio}
        </p>
      )}

      <div className="flex gap-2">
        {data.social_links?.github && safeHref(data.social_links.github) && (
          <a href={safeHref(data.social_links.github)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
            <Github className="h-5 w-5" />
          </a>
        )}
        {data.social_links?.linkedin && safeHref(data.social_links.linkedin) && (
          <a href={safeHref(data.social_links.linkedin)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
            <Linkedin className="h-5 w-5" />
          </a>
        )}
        {data.social_links?.twitter && safeHref(data.social_links.twitter) && (
          <a href={safeHref(data.social_links.twitter)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
            <Twitter className="h-5 w-5" />
          </a>
        )}
        {data.social_links?.email && (
          <a href={`mailto:${data.social_links.email}`} className="text-muted-foreground hover:text-primary">
            <Mail className="h-5 w-5" />
          </a>
        )}
      </div>

      {safeHref(data.cv_url) && (
        <Button size="sm" variant="outline" asChild>
          <a href={safeHref(data.cv_url)} target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4 mr-2" />
            Download CV
          </a>
        </Button>
      )}

      {data.stats && data.stats.length > 0 && (
        <div className="flex gap-4 pt-2">
          {data.stats.map((stat) => (
            <div key={`${stat.label}-${stat.value}`}>
              <div className="font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
