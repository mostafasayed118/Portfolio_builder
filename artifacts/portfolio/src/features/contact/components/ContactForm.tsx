import { useRef, useState } from "react";
import { Send, CheckCircle, Loader2 } from "lucide-react";
import { useFormValidation, SmartInput, SmartTextarea, createValidationRules } from "@workspace/ui";
import { contactFormSchema } from "@workspace/validation/schemas";
import { getCsrfToken, clearCsrfCache } from "@/lib/csrf";
import { getApiUrl } from "@/lib/env";
import TurnstileWidget, { isTurnstileConfigured, getTurnstileSiteKey } from "@/features/contact/components/TurnstileWidget";

const apiBase = getApiUrl();

interface Labels {
  name: string;
  email: string;
  message: string;
  sending: string;
  send: string;
  successTitle: string;
  successMessage: string;
  errorMessage: string;
}

const HONEYPOT_FIELD = "website";

const TURNSTILE_ENABLED = isTurnstileConfigured();
const TURNSTILE_SITE_KEY = getTurnstileSiteKey();

export default function ContactForm({ labels }: { labels: Labels }) {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileTokenRef = useRef<string | null>(null);
  const form = useFormValidation({ name: "", email: "", message: "" }, contactFormSchema);
  const rules = createValidationRules();
  // Real form-mount timestamp for the server-side time-trap check
  // (bots submit instantly; humans take >= 2s to fill the form).
  const formLoadedAtRef = useRef<number | null>(null);
  if (formLoadedAtRef.current === null) {
    formLoadedAtRef.current = Date.now();
  }

  const handleTurnstileToken = (token: string | null) => {
    turnstileTokenRef.current = token;
    setTurnstileToken(token);
  };

  const submitContact = async () => {
    setSubmitError(null);
    if (!form.validateAll()) return;
    if (TURNSTILE_ENABLED && !turnstileTokenRef.current) {
      setSubmitError(labels.errorMessage);
      return;
    }
    form.setIsSubmitting(true);
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch(`${apiBase}/api/v1/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
        credentials: "include",
        body: JSON.stringify({
          name: form.values.name,
          email: form.values.email,
          message: form.values.message,
          [HONEYPOT_FIELD]: "", // hidden anti-bot field; bots that auto-fill it get silently dropped
          _formLoadedAt: formLoadedAtRef.current ?? Date.now(),
          cfTurnstileToken: turnstileTokenRef.current ?? undefined,
        }),
      });
      if (!res.ok) {
        let message = labels.errorMessage;
        try {
          const errData = await res.json();
          if (errData.message) message = errData.message;
          else if (errData.errors?._root) message = errData.errors._root;
        } catch { /* non-JSON error response */ }
        setSubmitError(message);
        return;
      }
      const result = await res.json();
      if (!result.success) {
        setSubmitError(result.message || labels.errorMessage);
        return;
      }
      setSubmitted(true);
      form.reset();
    } catch (err) {
      if (err instanceof Error && err.message.includes("CSRF")) {
        clearCsrfCache();
        setSubmitError(labels.errorMessage);
      } else {
        setSubmitError(err instanceof Error ? err.message : labels.errorMessage);
      }
    } finally {
      form.setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="glass rounded-xl p-10 border flex flex-col items-center justify-center text-center h-full">
        <div className="h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
          <CheckCircle className="h-7 w-7 text-green-500" />
        </div>
        <h3 className="font-display font-semibold text-lg text-foreground mb-2">{labels.successTitle}</h3>
        <p className="text-muted-foreground text-sm">{labels.successMessage}</p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-6 px-5 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
          data-testid="btn-send-another"
        >
          Send Another
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); submitContact(); }}
      className="glass rounded-xl p-6 border space-y-5"
      data-testid="form-contact"
    >
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block" htmlFor="contact-name">
          {labels.name}
        </label>
        <SmartInput
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
          validationRules={[rules.required(labels.name + " is required"), rules.maxLength(100)]}
        />
        {form.errors.name && form.touched.name && (
          <p id="error-name" className="text-xs text-destructive mt-1" role="alert">{form.errors.name}</p>
        )}
        <div className="text-xs text-muted-foreground text-right mt-1">{form.values.name.length}/100</div>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block" htmlFor="contact-email">
          {labels.email}
        </label>
        <SmartInput
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
          validationRules={[rules.required(labels.email + " is required"), rules.email()]}
        />
        {form.errors.email && form.touched.email && (
          <p id="error-email" className="text-xs text-destructive mt-1" role="alert">{form.errors.email}</p>
        )}
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block" htmlFor="contact-message">
          {labels.message}
        </label>
        <SmartTextarea
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
          validationRules={[rules.required(labels.message + " is required"), rules.maxLength(2000)]}
        />
        {form.errors.message && form.touched.message && (
          <p id="error-message" className="text-xs text-destructive mt-1" role="alert">{form.errors.message}</p>
        )}
        <div className="text-xs text-muted-foreground text-right mt-1">{form.values.message.length}/2000</div>
      </div>

      {TURNSTILE_ENABLED && TURNSTILE_SITE_KEY && (
        <div>
          <TurnstileWidget
            siteKey={TURNSTILE_SITE_KEY}
            onToken={handleTurnstileToken}
          />
          {!turnstileToken && (
            <p className="text-xs text-muted-foreground mt-1">
              Complete the security check before sending.
            </p>
          )}
        </div>
      )}

      {submitError && (
        <div className="space-y-2">
          <p className="text-xs text-destructive mt-1" role="alert">{submitError}</p>
          <button type="button" onClick={submitContact} className="text-xs text-primary hover:underline">Try again</button>
        </div>
      )}
      <button
        type="submit"
        disabled={form.isSubmitting || (TURNSTILE_ENABLED && !turnstileToken)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all shadow-[var(--shadow-float)] disabled:opacity-60"
        data-testid="btn-send-message"
      >
        {form.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {form.isSubmitting ? labels.sending : labels.send}
      </button>

      {/* Honeypot — invisible to humans, auto-filled by spam bots.
          The server silently drops submissions containing a non-empty value. */}
      <input
        type="text"
        name={HONEYPOT_FIELD}
        aria-hidden="true"
        tabIndex={-1}
        autoComplete="off"
        className="sr-only"
      />
    </form>
  );
}
