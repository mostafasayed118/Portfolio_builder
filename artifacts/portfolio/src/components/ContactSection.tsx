import { useLanguage } from "@/lib/language";
import { CONTACT } from "@/data/portfolio";
import { useReveal } from "@/hooks/use-reveal";
import { useQuery } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-provider";
import { getContactInfo } from "@workspace/db/contact-info";
import SectionLabel from "./SectionLabel";
import ContactInfoPanel from "./ContactInfoPanel";
import ContactForm from "./ContactForm";

export default function ContactSection() {
  const { ref, revealed } = useReveal();
  const { t } = useLanguage();
  const { data: contactData } = useQuery({
    queryKey: ["contactInfo"],
    queryFn: () => {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not configured");
      return getContactInfo(supabase);
    },
    refetchInterval: 15_000,
    enabled: isSupabaseConfigured,
  });

  const contact = contactData
    ? {
        email: contactData.email ?? CONTACT.email,
        phone: contactData.phone ?? CONTACT.phone,
        location: contactData.location ?? CONTACT.location,
        github: contactData.github ?? CONTACT.github,
        linkedin: contactData.linkedin ?? CONTACT.linkedin,
      }
    : CONTACT;

  return (
    <section
      id="contact"
      ref={ref as React.RefObject<HTMLElement>}
      className="relative py-24 px-6 overflow-hidden"
    >
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-accent/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-primary/5 rounded-full blur-[120px]" />
      </div>
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <SectionLabel>{t.contact.title}</SectionLabel>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-3">
            {t.contact.title}
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            Have a project in mind or want to discuss data engineering? I'd love
            to hear from you.
          </p>
        </div>

        <div
          className={`grid md:grid-cols-2 gap-8 md:gap-12 section-reveal ${revealed ? "revealed" : ""}`}
        >
          <ContactInfoPanel contact={contact} />
          <ContactForm
            labels={{
              name: t.contact.name,
              email: t.contact.email,
              message: t.contact.message,
              sending: t.contact.sending,
              send: t.contact.send,
              successTitle: t.contact.successTitle,
              successMessage: t.contact.successMessage,
              errorMessage: t.contact.errorMessage,
            }}
          />
        </div>
      </div>
    </section>
  );
}
