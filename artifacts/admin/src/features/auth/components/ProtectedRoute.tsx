import { type ReactNode, useEffect, useCallback, useRef } from "react";
import { useAuthUser } from "@workspace/auth";
import { useAuth } from "@clerk/clerk-react";
import { Redirect, useLocation } from "wouter";
import { diag } from "./diag";
import { SIGN_IN_URL } from "./constants";
import { NotAdminScreen } from "./NotAdminScreen";

/**
 * Guard for every authenticated Admin route.
 *
 * State matrix:
 *
 *   isLoaded | isSignedIn | user.role | isAdmin | action
 *   ---------|-----------|-----------|---------|----------------------------------
 *   false    | *         | *         | *       | Show "Loading…" — no URL change
 *   true     | false     | null      | false   | Redirect to /sign-in
 *   true     | true      | visitor   | false   | NotAdminScreen (not authorized)
 *   true     | true      | admin     | true    | Render children
 *   true     | true      | null      | false   | Session Expired screen
 *
 * The "Session Expired" case (isSignedIn=true, user=null) breaks
 * the infinite loop where /sign-in → (Clerk signed in) → /overview
 * → (backend user null) → /sign-in → ...
 *
 * The `location` dependency is intentionally REMOVED from the
 * redirect useEffect. It was causing the effect to fire on every
 * URL change, including changes triggered by Clerk's own redirect
 * logic, creating a loop. The synchronous `<Redirect>` (State 2)
 * handles the redirect correctly; the useEffect is a safety net
 * that only fires when `isLoaded` or `isSignedIn` changes.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin } = useAuthUser();
  const { isLoaded, isSignedIn, signOut: clerkSignOut } = useAuth();
  const [location, navigate] = useLocation();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  diag("ProtectedRoute render", {
    path: location,
    isLoaded,
    isSignedIn,
    loading,
    user: user ? { id: user.id, email: user.email, role: user.role } : null,
    isAdmin,
  });

  const handleSignOut = useCallback(() => {
    diag("ProtectedRoute: handleSignOut — clearing Clerk session");
    void clerkSignOut().catch(() => {});
    navigate(SIGN_IN_URL, { replace: true });
  }, [clerkSignOut, navigate]);

  // bfcache defense: reload on browser restore to re-validate auth.
  // Debounced to prevent the reload itself from being cached and
  // triggering another reload (infinite reload loop).
  useEffect(() => {
    const RELOAD_KEY = "__auth_bfcache_reloaded";
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted && mountedRef.current) {
        // If we already reloaded once this session, don't reload again.
        // This prevents the reload → cache → reload → cache loop.
        if (sessionStorage.getItem(RELOAD_KEY) === "1") {
          diag("pageshow(persisted=true) — already reloaded once, skipping");
          sessionStorage.removeItem(RELOAD_KEY);
          return;
        }
        diag("pageshow(persisted=true) — reloading to invalidate bfcache");
        sessionStorage.setItem(RELOAD_KEY, "1");
        window.location.reload();
      }
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // Redirect ONLY when Clerk finishes loading and confirms not signed in.
  //
  // CRITICAL FIX: `location` is intentionally excluded from the
  // dependency array. Including it caused the effect to re-fire
  // on every URL change (including changes triggered by Clerk's
  // forceRedirectUrl), creating an infinite redirect loop.
  // The synchronous `<Redirect>` (State 2) handles the initial
  // redirect; this useEffect is a safety net for the case where
  // `isSignedIn` transitions from false → false after a stale render.
  useEffect(() => {
    if (mountedRef.current && isLoaded && !isSignedIn) {
      diag("ProtectedRoute: redirecting to /sign-in (Clerk not signed in)");
      navigate(SIGN_IN_URL, { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  // ── State 1: Clerk still resolving ────────────────────────────────────
  if (loading) {
    diag("ProtectedRoute: loading (Clerk still hydrating)");
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  // ── State 2: Not signed in → redirect to /sign-in ────────────────────
  if (!user && !isSignedIn) {
    diag("ProtectedRoute: not signed in → redirecting to /sign-in");
    return <Redirect to={SIGN_IN_URL} />;
  }

  // ── State 3: Session mismatch — Clerk signed in, backend rejected ────
  // Instead of redirecting (which would loop from /sign-in), show
  // "Session Expired" with a sign-out button.
  if (isSignedIn && !user) {
    diag("ProtectedRoute: session mismatch — Clerk signed in but backend user null", {
      path: location,
    });
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4 p-8 rounded-xl border border-border bg-card">
          <div className="text-4xl">🔒</div>
          <h1 className="text-2xl font-bold text-foreground">Session Expired</h1>
          <p className="text-muted-foreground text-sm">
            Your Clerk session is active, but the server could not
            verify your admin credentials. This can happen when:
          </p>
          <ul className="text-muted-foreground text-sm text-left list-disc list-inside space-y-1">
            <li>Your JWT token has expired</li>
            <li>Your email is not in the admin allow-list</li>
            <li>The server is temporarily unreachable</li>
          </ul>
          <p className="text-muted-foreground text-sm mt-2">
            Sign out and sign back in to refresh your session.
          </p>
          <button
            onClick={handleSignOut}
            className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary min-h-[44px]"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // ── State 4: Signed in but NOT admin → NotAdminScreen ─────────────────
  if (user && !isAdmin) {
    diag("ProtectedRoute: signed in but not admin → NotAdminScreen", { email: user.email });
    return <NotAdminScreen email={user.email} />;
  }

  // ── State 5: All checks pass — render children ────────────────────────
  diag("ProtectedRoute: PASS — rendering children");
  return <>{children}</>;
}
