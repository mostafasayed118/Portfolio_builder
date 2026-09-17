import { MessageCircle } from "lucide-react";
import { useContact } from "../hooks/useContact";
import { buildWhatsAppHref } from "../lib/whatsapp";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-provider";
import { trackEvent } from "@workspace/db/analytics";
import { resolveDefaultPortfolioId } from "@/lib/analytics-portfolio";
import { logWarn } from "@/lib/logger";
import { useLanguage } from "@/lib/language";

export default function WhatsAppFloat() {
  const { contact } = useContact();
  const { t } = useLanguage();

  const href = buildWhatsAppHref(contact.whatsapp, t.contact.whatsappPrefill);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t.contact.chatOnWhatsApp}
      title={t.contact.chatOnWhatsApp}
      data-testid="btn-whatsapp-float"
      className="fixed bottom-4 left-4 md:bottom-8 md:left-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/25 transition-transform duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      onClick={() => {
        if (isSupabaseConfigured) {
          const sb = getSupabase();
          if (sb) void resolveDefaultPortfolioId().then(async (portfolioId) => {
            if (portfolioId) await trackEvent(sb, "contact_click", "/", { type: "whatsapp", placement: "floating" }, portfolioId);
          }).catch((err: unknown) => logWarn("trackEvent failed", undefined, { error: err }));
        }
      }}
    >
      <MessageCircle className="h-7 w-7" aria-hidden="true" />
    </a>
  );
}
