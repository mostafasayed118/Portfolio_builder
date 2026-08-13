import { useEffect } from "react";
import { useAuthUser } from "@workspace/auth";
import { SignIn } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { diag } from "./diag";
import { POST_SIGN_IN_URL } from "./constants";

/**
 * Standalone sign-in route.
 *
 * Contract:
 *  - While Clerk is still resolving the session, render a loading shell.
 *  - If the session resolves to "signed in", redirect to
 *    `POST_SIGN_IN_URL` via useEffect (NOT <Redirect>).
 *  - Otherwise render Clerk's `<SignIn />` with `forceRedirectUrl`
 *    hardcoded to `POST_SIGN_IN_URL`.
 *
 * IMPORTANT: We use ONLY useEffect for the post-login redirect.
 * The previous version used BOTH useEffect AND <Redirect>, which
 * raced each other and caused unpredictable navigation. The useEffect
 * approach fires after render, which is the correct timing for
 * wouter navigation triggered by state changes.
 */
export function SignInPage() {
  const { user, loading } = useAuthUser();
  const [location, navigate] = useLocation();

  // DIAGNOSTIC: trace the SignInPage decision tree
  diag("SignInPage render", {
    path: location,
    loading,
    userId: user?.id ?? null,
    role: user?.role ?? null,
    POST_SIGN_IN_URL,
  });

  // Post-login redirect: ONLY via useEffect (not <Redirect>).
  // useEffect fires after render completes, avoiding the render-loop
  // race that the dual-redirect caused.
  useEffect(() => {
    if (!loading && user) {
      diag("SignInPage: redirecting to POST_SIGN_IN_URL", { url: POST_SIGN_IN_URL });
      navigate(POST_SIGN_IN_URL, { replace: true });
    }
  }, [loading, user, navigate]);

  // Loading state: Clerk still hydrating
  if (loading) {
    diag("SignInPage: rendering loading shell (Clerk not yet hydrated)");
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  // Signed in: return null — the useEffect above will handle
  // navigation to POST_SIGN_IN_URL. Returning null avoids the
  // render-loop race that <Redirect> caused.
  if (user) {
    diag("SignInPage: user truthy — returning null (useEffect will redirect)");
    return null;
  }

  // Not signed in: render Clerk's SignIn form
  // `routing="path"` is used instead of `routing="hash"` so that
  // `forceRedirectUrl` performs a real path navigation (which wouter
  // can see) rather than setting a hash (which wouter ignores).
  diag("SignInPage: rendering <Clerk SignIn> with forceRedirectUrl=" + POST_SIGN_IN_URL);
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md w-full">
        <SignIn routing="path" path="/sign-in" forceRedirectUrl={POST_SIGN_IN_URL} />
      </div>
    </div>
  );
}
