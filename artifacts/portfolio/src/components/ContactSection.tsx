import { useState } from "react";
import { useLanguage } from "@/lib/language";
import {
  Mail,
  Phone,
  MapPin,
  Github,
  Linkedin,
  Send,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { CONTACT } from "@/data/portfolio";
import { useReveal } from "@/hooks/use-reveal";
import { useQuery } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-provider";
import { getContactInfo } from "@workspace/db/contact-info";
import { insertContactMessage } from "@workspace/db/contact-messages";
import { trackEvent } from "@workspace/db/analytics";
import { useFormValidation } from "@/hooks/useFormValidation";
import { contactFormSchema } from "@workspace/validation/schemas";

export default function ContactSection() {
  const { ref, revealed } = useReveal();
  const { t } = useLanguage();
  const { data: contactData } = useQuery({
    queryKey: ["contactInfo"],
    queryFn: () => getContactInfo(getSupabase()),
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

  const CONTACT_ITEMS = [
    {
      Icon: Mail,
      label: "Email",
      value: contact.email,
      href: `mailto:${contact.email}`,
    },
    {
      Icon: Phone,
      label: "Phone",
      value: contact.phone,
      href: `tel:${(contact.phone ?? "").replace(/\s/g, "")}`,
    },
    { Icon: MapPin, label: "Location", value: contact.location, href: null },
    {
      Icon: Github,
      label: "GitHub",
      value: contact.github?.replace("https://", ""),
      href: contact.github,
    },
    {
      Icon: Linkedin,
      label: "LinkedIn",
      value: contact.linkedin?.replace("https://", ""),
      href: contact.linkedin,
    },
  ];

  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useFormValidation(
    { name: "", email: "", message: "" },
    contactFormSchema,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.validateAll()) return;
    form.setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (!isSupabaseConfigured) {
        setSubmitError(t.contact.errorMessage);
        return;
      }

      const supabase = getSupabase();
      if (!supabase) {
        setSubmitError(t.contact.errorMessage);
        return;
      }

      const result = await insertContactMessage(supabase, {
        name: form.values.name,
        email: form.values.email,
        message: form.values.message,
      });

      if (!result.success) {
        setSubmitError(result.error || t.contact.errorMessage);
        return;
      }

      setSubmitted(true);
      form.reset();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t.contact.errorMessage);
    } finally {
      form.setIsSubmitting(false);
    }
  };

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
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full mb-4">
            {t.contact.title}
          </div>
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
          <div className="space-y-6">
            <div className="glass rounded-xl p-6 space-y-4 border">
              {CONTACT_ITEMS.map(({ Icon, label, value, href }) => (
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
                            trackEvent(getSupabase(), "contact_click", "/", { type });
                          }
                        }}
                      >
                        {value}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-foreground">
                        {value}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="glass rounded-xl overflow-hidden border h-48">
              <iframe
                title="Cairo, Egypt on map"
                src="https://www.openstreetmap.org/export/embed.html?bbox=31.2%2C30.0%2C31.4%2C30.15&layer=mapnik&marker=30.0626%2C31.2497"
                className="w-full h-full border-0"
                loading="lazy"
              />
            </div>
          </div>

          <div>
            {submitted ? (
              <div className="glass rounded-xl p-10 border flex flex-col items-center justify-center text-center h-full">
                <div className="h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                  <CheckCircle className="h-7 w-7 text-green-500" />
                </div>
                <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                  {t.contact.successTitle}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t.contact.successMessage}
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-6 px-5 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                  data-testid="btn-send-another"
                >
                  Send Another
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="glass rounded-xl p-6 border space-y-5"
                data-testid="form-contact"
              >
                <div>
                  <label
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block"
                    htmlFor="contact-name"
                  >
                    {t.contact.name}
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    autoComplete="name"
                    value={form.values.name}
                    onChange={(e) => form.setField("name", e.target.value)}
                    onBlur={() => form.handleBlur("name")}
                    placeholder="Mustafa Sayed"
                    maxLength={100}
                    aria-describedby={form.errors.name && form.touched.name ? "error-name" : undefined}
                    className={`w-full rounded-lg px-4 py-2.5 text-sm bg-muted/50 border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground ${form.errors.name && form.touched.name ? "border-red-500" : "border-border"}`}
                    data-testid="input-name"
                  />
                  {form.errors.name && form.touched.name && (
                    <p id="error-name" className="text-xs text-destructive mt-1" role="alert">
                      {form.errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block"
                    htmlFor="contact-email"
                  >
                    {t.contact.email}
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    autoComplete="email"
                    value={form.values.email}
                    onChange={(e) => form.setField("email", e.target.value)}
                    onBlur={() => form.handleBlur("email")}
                    placeholder="you@example.com"
                    aria-describedby={form.errors.email && form.touched.email ? "error-email" : undefined}
                    className={`w-full rounded-lg px-4 py-2.5 text-sm bg-muted/50 border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground ${form.errors.email && form.touched.email ? "border-red-500" : "border-border"}`}
                    data-testid="input-email"
                  />
                  {form.errors.email && form.touched.email && (
                    <p id="error-email" className="text-xs text-destructive mt-1" role="alert">
                      {form.errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block"
                    htmlFor="contact-message"
                  >
                    {t.contact.message}
                  </label>
                  <textarea
                    id="contact-message"
                    rows={5}
                    autoComplete="off"
                    value={form.values.message}
                    onChange={(e) => form.setField("message", e.target.value)}
                    onBlur={() => form.handleBlur("message")}
                    placeholder="Tell me about your project or just say hello..."
                    maxLength={2000}
                    aria-describedby={form.errors.message && form.touched.message ? "error-message" : undefined}
                    className={`w-full rounded-lg px-4 py-2.5 text-sm bg-muted/50 border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground resize-none ${form.errors.message && form.touched.message ? "border-red-500" : "border-border"}`}
                    data-testid="input-message"
                  />
                  {form.errors.message && form.touched.message && (
                    <p id="error-message" className="text-xs text-destructive mt-1" role="alert">
                      {form.errors.message}
                    </p>
                  )}
                </div>

                {submitError && (
                  <p className="text-xs text-destructive mt-1">{submitError}</p>
                )}
                <button
                  type="submit"
                  disabled={form.isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all shadow-[var(--shadow-float)] disabled:opacity-60"
                  data-testid="btn-send-message"
                >
                  {form.isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {form.isSubmitting ? t.contact.sending : t.contact.send}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
