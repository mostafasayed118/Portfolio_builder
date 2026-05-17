import { ClerkProvider, useAuth, useUser, SignIn } from "@clerk/clerk-react";
import { type ReactNode, useMemo } from "react";
import { type AuthContextValue, AuthContextProvider, useAuthUser } from "@workspace/auth";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

const ADMIN_EMAILS: string[] = (
  import.meta.env.VITE_ADMIN_EMAILS as string | undefined
)?.split(",").map(e => e.trim().toLowerCase()) ?? [];

function ClerkAuthBridge({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded, signOut: clerkSignOut } = useAuth();
  const { user: clerkUser } = useUser();

  const value: AuthContextValue = useMemo(() => {
    if (!isLoaded) {
      return { user: null, loading: true, signIn: async () => ({ success: false }), signOut: async () => {}, isAdmin: false };
    }

    if (!isSignedIn || !clerkUser) {
      return { user: null, loading: false, signIn: async () => ({ success: false }), signOut: async () => {}, isAdmin: false };
    }

    const email = clerkUser.primaryEmailAddress?.emailAddress ?? "";
    const isAdmin = ADMIN_EMAILS.length === 0 || ADMIN_EMAILS.includes(email.toLowerCase());

    return {
      user: { id: clerkUser.id, email, role: isAdmin ? ("admin" as const) : ("visitor" as const) },
      loading: false,
      signIn: async () => ({ success: false, error: "Use Clerk sign-in instead" }),
      signOut: async () => { await clerkSignOut(); },
      isAdmin,
    };
  }, [isLoaded, isSignedIn, clerkUser, clerkSignOut]);

  return <AuthContextProvider value={value}>{children}</AuthContextProvider>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin } = useAuthUser();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full">
          <SignIn routing="hash" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md text-center space-y-4 p-8">
          <div className="text-4xl">🚫</div>
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground text-sm">
            Signed in as{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{user.email}</code>{" "}
            but this account is not authorized for admin access.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function AdminProviders({ children }: { children: ReactNode }) {
  if (!clerkPublishableKey) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md text-center space-y-4 p-8">
          <div className="text-4xl">🔑</div>
          <h1 className="text-2xl font-bold text-foreground">Clerk Setup Required</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Add your{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">VITE_CLERK_PUBLISHABLE_KEY</code>{" "}
            environment variable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <ClerkAuthBridge>
        <RequireAdmin>{children}</RequireAdmin>
      </ClerkAuthBridge>
    </ClerkProvider>
  );
}
