import { useLanguage } from "@/lib/language";
import { useReveal } from "@/hooks/use-reveal";
import { useContact } from "@/features/contact/hooks/useContact";
import ContactInfoPanel from "@/features/contact/components/ContactInfoPanel";
import ContactForm from "@/features/contact/components/ContactForm";
import SectionHeader from "@/components/SectionHeader";

export default function ContactSection() {
  const { ref, revealed } = useReveal();
  const { t } = useLanguage();
  const { contact } = useContact();

  return (
    <section id="contact" ref={ref} className="relative py-24 px-6 overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-accent/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-primary/5 rounded-full blur-[120px]" />
      </div>
      <div className="max-w-5xl mx-auto relative z-10">
        <SectionHeader
          label={t.contact.title}
          title={t.contact.title}
          description="Have a project in mind or want to discuss data engineering? I'd love to hear from you."
        />
        <div className={`grid md:grid-cols-2 gap-8 md:gap-12 section-reveal ${revealed ? "revealed" : ""}`}>
          <ContactInfoPanel contact={contact} />
          <ContactForm labels={{
            name: t.contact.name, email: t.contact.email, message: t.contact.message,
            sending: t.contact.sending, send: t.contact.send,
            successTitle: t.contact.successTitle, successMessage: t.contact.successMessage,
            errorMessage: t.contact.errorMessage,
          }} />
        </div>
      </div>
    </section>
  );
}
