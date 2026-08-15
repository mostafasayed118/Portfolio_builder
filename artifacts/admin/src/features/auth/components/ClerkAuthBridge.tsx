import { useAuth, useUser } from "@clerk/clerk-react";
import { type ReactNode, useEffect, useMemo, useState, useRef } from "react";
import { type AuthContextValue, AuthContextProvider } from "@workspace/auth";
import { useLocation } from "wouter";
import { setAuthTokenGetter, setAuthMissingHandler, setAuthReady } from "@/lib/auth-token";
import { api, type User } from "@/lib/api-client";
import { diag } from "./diag";
import { SIGN_IN_URL } from "./constants";

/**
 * Root auth bridge that sits between ClerkProvider and the rest of the
 * app. Responsibilities:
 *  1. Registers the Clerk JWT template getter in auth-token.ts
 *  2. Arms the auth-ready gate (setAuthReady) based on Clerk state
 *  3. Registers the auth-missing handler (sign-out + redirect)
 *  4. Fetches /users/me for role (isSuperadmin check)
 *  5. Builds and exposes the AuthContextValue
 *
 * Mounted ONCE at the top of the provider tree. All effects run once
 * or react to Clerk state changes. The handler is registered without
 * cleanup so it persists across the app lifetime.
 */
export default function ClerkAuthBridge({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded, getToken, signOut: clerkSignOut } = useAuth();
  const { user: clerkUser } = useUser();
  const [location] = useLocation();
  const [, navigate] = useLocation();
  const [dbUser, setDbUser] = useState<Pick<User, "id" | "email" | "role"> | null>(null);
  // Server-authoritative admin check. Replaces the previous client-side
  // VITE_ADMIN_EMAILS allowlist lookup, which Vite inlined into the public
  // bundle and leaked the admin email list. "/users/me" is gated by the
  // admin allowlist server-side, so its success is the definitive signal.
  type AdminStatus = "checking" | "admin" | "denied";
  const [adminStatus, setAdminStatus] = useState<AdminStatus>("checking");

  // Refs so the auth-missing handler always sees the latest values
  // without needing to re-register (which previously caused the
  // handler to be cleared mid-render during Clerk's hydration
  // state transitions, then re-registered, creating a window
  // where a pre-loaded API call could falsely fire the handler).
  const clerkSignOutRef = useRef(clerkSignOut);
  const navigateRef = useRef(navigate);
  // Do not sign out during the first /users/me bootstrap request. A missing
  // API URL, CORS rejection, or briefly unavailable API must not turn a
  // successful Clerk login into a sign-in loop. Once the backend has verified
  // this session, later auth failures can safely trigger a fresh login.
  const verifiedAdminRef = useRef(false);
  useEffect(() => {
    clerkSignOutRef.current = clerkSignOut;
    navigateRef.current = navigate;
  }, [clerkSignOut, navigate]);

  // DIAGNOSTIC: log every Clerk state transition.
  useEffect(() => {
    diag("ClerkAuthBridge state", {
      isLoaded,
      isSignedIn,
      clerkUserId: clerkUser?.id ?? null,
      email: clerkUser?.primaryEmailAddress?.emailAddress ?? null,
      path: location,
    });
  }, [isLoaded, isSignedIn, clerkUser, location]);

  // Set token getter in effect to respect React's pure-render principle.
  const jwtTemplate = (import.meta.env.VITE_CLERK_JWT_TEMPLATE as string | undefined) ?? "admin";
  useEffect(() => {
    if (isLoaded && getToken) {
      diag(`setAuthTokenGetter called — using JWT template "${jwtTemplate}"`);
      // Prefer the configured template because it includes the email claim
      // used by the API allowlist. If the template is missing or rejected,
      // fall back to Clerk's normal session token so a valid Clerk session
      // is not trapped on the sign-in screen. `skipCache` is important for
      // the api-client's one-time 401 refresh retry.
      setAuthTokenGetter(async (forceRefresh = false) => {
        const options = {
          template: jwtTemplate,
          ...(forceRefresh ? { skipCache: true } : {}),
        };
        try {
          const templatedToken = await getToken(options);
          if (templatedToken) return templatedToken;
        } catch (error) {
          diag("JWT template token request failed; trying the default Clerk token", String(error));
        }

        try {
          return await getToken(forceRefresh ? { skipCache: true } : undefined);
        } catch (error) {
          diag("Default Clerk token request failed", String(error));
          return null;
        }
      });
    }
  }, [isLoaded, getToken, jwtTemplate]);

  // CRITICAL: Arm / disarm the auth-missing handler based on
  // Clerk's authoritative state. Until we have positive evidence
  // that the user is signed in, the auth-token layer treats every
  // null token as a pre-hydration artefact (a no-op) rather than a
  // fatal auth failure.
  useEffect(() => {
    if (!isLoaded) {
      diag("setAuthReady skipped — Clerk still hydrating");
      return;
    }
    diag(`setAuthReady(${isSignedIn}) — based on (isLoaded, isSignedIn)`);
    setAuthReady(isSignedIn);
  }, [isLoaded, isSignedIn]);

  // Register the auth-missing handler ONCE on mount; the handler
  // reads current values via refs so it never needs to be
  // re-registered. No cleanup: this lives for the whole app
  // lifetime because ClerkAuthBridge is at the root of the provider tree.
  useEffect(() => {
    diag("registering auth-missing handler (once, app-lifetime)");
    setAuthMissingHandler(() => {
      if (!verifiedAdminRef.current) {
        diag("auth-missing handler: ignoring failure during initial admin verification");
        return;
      }
      diag("auth-missing handler FIRED — signing out + navigating to /sign-in");
      if (typeof window === "undefined") return;
      const path = window.location.pathname;
      if (path.endsWith("/sign-in")) {
        diag("auth-missing handler: no-op (already on /sign-in)");
        return;
      }
      void clerkSignOutRef.current().catch(() => {});
      navigateRef.current(SIGN_IN_URL, { replace: true });
    });
  }, []);

  // Fetch user from DB after Clerk auth to get role.
  // Retries transient failures (network blip, server briefly unreachable)
  // with a short backoff so a healthy server is not downgraded to
  // "admin" (missing superadmin) silently on a single failed request.
  useEffect(() => {
    if (!isSignedIn || !clerkUser) {
      verifiedAdminRef.current = false;
      setDbUser(null);
      setAdminStatus("checking");
      return;
    }
    let cancelled = false;
    const attempt = (retries: number) => {
      diag("fetching /users/me for role lookup", { retries });
      api.users.me().then(res => {
        if (cancelled) return;
        if (res.success && res.data) {
          diag("/users/me returned", { email: res.data.email, role: res.data.role });
          verifiedAdminRef.current = true;
          setDbUser(res.data);
          setAdminStatus("admin");
        } else {
          diag("/users/me returned no data", res);
          if (retries > 0) setTimeout(() => attempt(retries - 1), 2000);
          else setAdminStatus("denied");
        }
      }).catch((err) => {
        diag("/users/me threw", String(err));
        if (retries > 0 && !cancelled) setTimeout(() => attempt(retries - 1), 2000);
        else if (!cancelled) setAdminStatus("denied");
      });
    };
    attempt(2);
    return () => { cancelled = true; };
  }, [isSignedIn, clerkUser]);

  const value: AuthContextValue = useMemo(() => {
    if (!isLoaded) {
      return { user: null, loading: true, signOut: async () => {}, isAdmin: false, isSuperadmin: false };
    }

    if (!isSignedIn) {
      return { user: null, loading: false, signOut: async () => {}, isAdmin: false, isSuperadmin: false };
    }

    // Clerk can report `isSignedIn=true` for a short interval before
    // `useUser()` exposes the hydrated user object after the sign-in
    // redirect. Keep the auth context loading during that interval so
    // SignInPage does not render a fresh sign-in form and ProtectedRoute
    // does not treat the session as expired.
    if (!clerkUser) {
      return { user: null, loading: true, signOut: async () => {}, isAdmin: false, isSuperadmin: false };
    }

    const email = clerkUser.primaryEmailAddress?.emailAddress ?? "";
    const isAdmin = adminStatus === "admin";
    const isSuperadmin = dbUser?.role === "superadmin";
    // Keep `loading` true until the /users/me check resolves so a valid
    // admin never flashes the "Access Denied" screen during the round-trip.
    const loading = adminStatus === "checking";

    const built: AuthContextValue = {
      user: { id: clerkUser.id, email, role: isSuperadmin ? "superadmin" as const : isAdmin ? "admin" as const : "visitor" as const },
      loading,
      signOut: async () => { await clerkSignOut(); },
      isAdmin,
      isSuperadmin,
    };

    diag("AuthContext value recomputed", { email, isAdmin, isSuperadmin, loading, role: built.user?.role });
    return built;
  }, [isLoaded, isSignedIn, clerkUser, clerkSignOut, dbUser, adminStatus]);

  return <AuthContextProvider value={value}>{children}</AuthContextProvider>;
}
