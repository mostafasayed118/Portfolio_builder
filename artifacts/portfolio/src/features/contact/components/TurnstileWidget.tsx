import { useEffect, useRef } from "react";

// Read the site key straight from the build env rather than via the
// (commonly-mocked) "@/lib/env" module, so component tests in jsdom that mock
// that module don't break on an absent `portfolioEnv` export.
const turnstileSiteKey: string | undefined =
  import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, opts: Record<string, unknown>) => string;
      remove?: (widgetId: string) => void;
    };
  }
}

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

const pending: Array<() => void> = [];

function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.turnstile) {
      resolve();
      return;
    }
    if (document.getElementById(SCRIPT_ID)) {
      pending.push(resolve);
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      pending.forEach((cb) => cb());
      pending.length = 0;
      resolve();
    };
    document.head.appendChild(script);
  });
}

interface TurnstileWidgetProps {
  siteKey: string;
  onToken: (token: string | null) => void;
}

/**
 * Cloudflare Turnstile widget, only mounted when `VITE_TURNSTILE_SITE_KEY` is
 * configured. Loads the Cloudflare script lazily and reports the verification
 * token via `onToken` (or `null` on expire/error). In jsdom tests this is
 * inert — `window.turnstile` is never defined, so the container stays empty.
 */
export default function TurnstileWidget({ siteKey, onToken }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    let disposed = false;
    loadTurnstileScript().then(() => {
      if (disposed || !containerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action: "contact",
        callback: (token: string) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(null),
        "error-callback": () => onTokenRef.current(null),
      });
    });
    return () => {
      disposed = true;
      if (widgetIdRef.current && window.turnstile?.remove) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* noop */ }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  return (
    <div
      ref={containerRef}
      data-testid="turnstile-widget"
      style={{ minHeight: "65px" }}
      aria-label="Security check"
    />
  );
}

export function isTurnstileConfigured(): boolean {
  return Boolean(turnstileSiteKey);
}

export function getTurnstileSiteKey(): string | undefined {
  return turnstileSiteKey;
}
