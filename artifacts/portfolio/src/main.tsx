import { createRoot } from "react-dom/client";
import { setCaptureError } from "@workspace/logging";
import App from "./App";
import { RootErrorBoundary } from "./components/RootErrorBoundary";
import "./lib/env";
import "./index.css";

// Initialize Sentry error monitoring if VITE_SENTRY_DSN is configured.
// Dynamic import ensures @sentry/react is tree-shaken out of the bundle
// when the env var is not set.
if (import.meta.env.VITE_SENTRY_DSN) {
  import("@sentry/react").then(({ init, captureException }) => {
    init({ dsn: import.meta.env.VITE_SENTRY_DSN, environment: import.meta.env.MODE });
    setCaptureError((error, extra) => {
      if (extra) captureException(error, { extra });
      else captureException(error);
    });
  });
}

// Google Fonts are loaded non-blocking (media="print"); apply them as soon
// as the bundle runs. An inline `onload` swap would be blocked by the
// nonce-based CSP enforced in production (middleware.ts).
const fontsLink = document.getElementById("fonts-stylesheet") as HTMLLinkElement | null;
if (fontsLink) fontsLink.media = "all";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");
createRoot(rootEl).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
