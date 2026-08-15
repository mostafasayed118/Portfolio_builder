import { Mail, Phone, MapPin, Github, Linkedin, MessageCircle } from "lucide-react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-provider";
import { trackEvent } from "@workspace/db/analytics";
import { logWarn } from "@/lib/logger";
import { useLanguage } from "@/lib/language";

interface Contact {
  email: string;
  phone: string;
  location: string;
  github: string;
  linkedin: string;
  whatsapp: string;
}

const ICONS: Record<string, typeof Mail> = {
  Email: Mail,
  Phone: Phone,
  Location: MapPin,
  GitHub: Github,
  LinkedIn: Linkedin,
};

function buildItems(c: Contact, labels: { email: string; phone: string; location: string; github: string; linkedin: string }) {
  return [
    { key: "email", Icon: ICONS.Email, label: labels.email, value: c.email, href: `mailto:${c.email}` },
    { key: "phone", Icon: ICONS.Phone, label: labels.phone, value: c.phone, href: `tel:${(c.phone ?? "").replace(/\s/g, "")}` },
    { key: "location", Icon: ICONS.Location, label: labels.location, value: c.location, href: null as string | null },
    { key: "github", Icon: ICONS.GitHub, label: labels.github, value: c.github?.replace("https://", ""), href: c.github },
    { key: "linkedin", Icon: ICONS.LinkedIn, label: labels.linkedin, value: c.linkedin?.replace("https://", ""), href: c.linkedin },
  ];
}

export default function ContactInfoPanel({ contact }: { contact: Contact }) {
  const { t } = useLanguage();
  const items = buildItems(contact, t.contact.labels);

  // WhatsApp click-to-chat: https://wa.me/<digits>?text=<prefilled message>
  const waDigits = (contact.whatsapp ?? "").replace(/\D/g, "");
  const waHref = waDigits
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(t.contact.whatsappPrefill)}`
    : null;

  return (
    <div className="space-y-6">
      <div className="glass rounded-xl p-6 space-y-4 border">
        {items.map(({ key, Icon, label, value, href }) => (
          <div key={key} className="flex items-center gap-3">
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
                  data-testid={`link-contact-${key}`}
                  onClick={() => {
                    if (isSupabaseConfigured && (key === "email" || key === "github" || key === "linkedin")) {
                      const sb = getSupabase();
                      if (sb) trackEvent(sb, "contact_click", "/", { type: key }).catch((err) => logWarn("trackEvent failed", err));
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

        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1fb958]"
            data-testid="link-contact-whatsapp"
            onClick={() => {
              if (isSupabaseConfigured) {
                const sb = getSupabase();
                if (sb) trackEvent(sb, "contact_click", "/", { type: "whatsapp" }).catch((err) => logWarn("trackEvent failed", err));
              }
            }}
          >
            <MessageCircle className="h-4 w-4" />
            {t.contact.chatOnWhatsApp}
          </a>
        )}
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
