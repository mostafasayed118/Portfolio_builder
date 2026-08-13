import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { diag } from "./diag";

/**
 * Diagnostic component that logs Clerk state on mount and transitions.
 * Only active in DEV mode. Renders nothing — pure side-effect component.
 *
 * Logs:
 * - Whether VITE_CLERK_PUBLISHABLE_KEY is set
 * - Clerk hydration state (isLoaded, isSignedIn)
 * - Publishable key prefix (to verify correct key without exposing it)
 * - Window origin (to verify Clerk's allowed origins)
 */
export function ClerkConfigCheck() {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

    if (!publishableKey) {
      diag("ClerkConfigCheck: ERROR — VITE_CLERK_PUBLISHABLE_KEY is missing! Clerk will not initialize.");
      return;
    }

    diag("ClerkConfigCheck state", {
      isLoaded,
      isSignedIn,
      publishableKeyPrefix: publishableKey.slice(0, 10) + "...",
      origin: typeof window !== "undefined" ? window.location.origin : "SSR",
    });
  }, [isLoaded, isSignedIn]);

  return null;
}
