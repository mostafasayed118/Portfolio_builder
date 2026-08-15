import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { setCaptureError } from "@workspace/logging";
import App from "./App";
import "./index.css";
import "./lib/api-client-setup";
import { AdminProviders } from "@/features/auth";

// Initialize Sentry error monitoring if VITE_SENTRY_DSN is configured.
// Dynamic import ensures @sentry/react is tree-shaken out of the bundle
// when the env var is not set (no dead code in production).
if (import.meta.env.VITE_SENTRY_DSN) {
  import("@sentry/react").then(({ init, captureException }) => {
    init({ dsn: import.meta.env.VITE_SENTRY_DSN, environment: import.meta.env.MODE });
    setCaptureError((error, extra) => {
      if (extra) captureException(error, { extra });
      else captureException(error);
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AdminProviders>
      <App />
    </AdminProviders>
  </StrictMode>,
);
