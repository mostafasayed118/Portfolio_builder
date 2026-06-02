import { Mail, Phone, MapPin, Github, Linkedin } from "lucide-react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-provider";
import { trackEvent } from "@workspace/db/analytics";
import { logWarn } from "@/lib/logger";

interface Contact {
  email: string;
  phone: string;
  location: string;
  github: string;
  linkedin: string;
}

const ICONS: Record<string, typeof Mail> = {
  Email: Mail,
  Phone: Phone,
  Location: MapPin,
  GitHub: Github,
  LinkedIn: Linkedin,
};

function buildItems(c: Contact) {
  return [
    { Icon: ICONS.Email, label: "Email", value: c.email, href: `mailto:${c.email}` },
    { Icon: ICONS.Phone, label: "Phone", value: c.phone, href: `tel:${(c.phone ?? "").replace(/\s/g, "")}` },
    { Icon: ICONS.Location, label: "Location", value: c.location, href: null as string | null },
    { Icon: ICONS.GitHub, label: "GitHub", value: c.github?.replace("https://", ""), href: c.github },
    { Icon: ICONS.LinkedIn, label: "LinkedIn", value: c.linkedin?.replace("https://", ""), href: c.linkedin },
  ];
}

export default function ContactInfoPanel({ contact }: { contact: Contact }) {
  const items = buildItems(contact);

  return (
    <div className="space-y-6">
      <div className="glass rounded-xl p-6 space-y-4 border">
        {items.map(({ Icon, label, value, href }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{label}</p>
              {href ? (
                <a
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
                  data-testid={`link-contact-${label.toLowerCase()}`}
                  onClick={() => {
                    const type = label.toLowerCase();
                    if (isSupabaseConfigured && (type === "email" || type === "github" || type === "linkedin")) {
                      const sb = getSupabase();
                      if (sb) trackEvent(sb, "contact_click", "/", { type }).catch((err) => logWarn("trackEvent failed", err));
                    }
                  }}
                >
                  {value}
                </a>
              ) : (
                <p className="text-sm font-medium text-foreground">{value}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-xl overflow-hidden border aspect-video min-h-36 max-h-64">
        <iframe
          title="Cairo, Egypt on map"
          src="https://www.openstreetmap.org/export/embed.html?bbox=31.2%2C30.0%2C31.4%2C30.15&layer=mapnik&marker=30.0626%2C31.2497"
          className="w-full h-full border-0"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}
