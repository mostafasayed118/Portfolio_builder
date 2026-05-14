import { useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Github,
  Linkedin,
  Send,
  CheckCircle,
} from "lucide-react";
import { CONTACT } from "@/data/portfolio";
import { useReveal } from "@/hooks/use-reveal";
import { useQuery } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-provider";
import { getContactInfo } from "@workspace/db/contact-info";
import { sendMessage } from "@workspace/db/messages";

export default function ContactSection() {
  const { ref, revealed } = useReveal();
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

  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name || form.name.length < 2)
      e.name = "Name must be at least 2 characters";
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Please enter a valid email";
    if (!form.message || form.message.length < 10)
      e.message = "Message must be at least 10 characters";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSending(true);
    try {
      if (isSupabaseConfigured) {
        await sendMessage(getSupabase(), {
          name: form.name,
          email: form.email,
          message: form.message,
        });
      } else {
        setErrors({
          message: "Messaging is unavailable. Please try again later.",
        });
        setSending(false);
        return;
      }
      setSubmitted(true);
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      setErrors({
        message:
          err instanceof Error
            ? err.message
            : "Failed to send. Please try again.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <section
      id="contact"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 px-6"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full mb-4">
            Contact
          </div>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-3">
            Get In Touch
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
                  Message Sent!
                </h3>
                <p className="text-muted-foreground text-sm">
                  Thank you for reaching out. I'll get back to you as soon as
                  possible.
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
                    Your Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Mustafa Sayed"
                    className="w-full rounded-lg px-4 py-2.5 text-sm bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
                    data-testid="input-name"
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block"
                    htmlFor="contact-email"
                  >
                    Email Address
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="you@example.com"
                    className="w-full rounded-lg px-4 py-2.5 text-sm bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
                    data-testid="input-email"
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block"
                    htmlFor="contact-message"
                  >
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    rows={5}
                    value={form.message}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, message: e.target.value }))
                    }
                    placeholder="Tell me about your project or just say hello..."
                    className="w-full rounded-lg px-4 py-2.5 text-sm bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground resize-none"
                    data-testid="input-message"
                  />
                  {errors.message && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all shadow-[var(--shadow-float)] disabled:opacity-60"
                  data-testid="btn-send-message"
                >
                  <Send className="h-4 w-4" />
                  {sending ? "Sending…" : "Send Message"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
