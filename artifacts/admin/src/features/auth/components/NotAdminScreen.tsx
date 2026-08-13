import { useAuth } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { diag } from "./diag";
import { SIGN_IN_URL } from "./constants";

/**
 * Screen shown when the user is signed in with Clerk but is NOT
 * an authorized admin (role === "visitor" or isAdmin === false).
 *
 * This is distinct from "Session Expired" — the user IS authenticated,
 * just not authorized for admin access. This screen provides clear
 * feedback and a sign-out button so they can switch accounts.
 */
export function NotAdminScreen({ email }: { email: string }) {
  const { signOut: clerkSignOut } = useAuth();
  const [, navigate] = useLocation();

  const handleSignOut = () => {
    diag("NotAdminScreen: sign out clicked — clearing Clerk session");
    void clerkSignOut().catch(() => {});
    navigate(SIGN_IN_URL, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full p-8 rounded-xl border border-border bg-card text-center space-y-4">
        <div className="text-4xl">🚫</div>
        <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground text-sm">
          Signed in as{" "}
          <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{email}</code>{" "}
          but this account is not authorized for admin access.
        </p>
        <p className="text-muted-foreground text-sm">
          If you believe this is an error, contact the system administrator.
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
