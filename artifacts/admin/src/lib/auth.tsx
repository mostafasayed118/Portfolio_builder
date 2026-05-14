import { ClerkProvider, useAuth, useUser, SignIn } from "@clerk/clerk-react";
import { ReactNode } from "react";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

const ADMIN_EMAILS: string[] = (
  import.meta.env.VITE_ADMIN_EMAILS
    ? import.meta.env.VITE_ADMIN_EMAILS as string
    : "mustafasayedsaeed@outlook.com,mustafasayed20002@gmail.com"
).split(",").map(e => e.trim().toLowerCase());

function RequireAdmin({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full">
          <SignIn routing="hash" />
        </div>
      </div>
    );
  }

  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? "";
  if (!ADMIN_EMAILS.includes(email)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md text-center space-y-4 p-8">
          <div className="text-4xl">🚫</div>
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground text-sm">
            Signed in as{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
              {email}
            </code>{" "}
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
          <h1 className="text-2xl font-bold text-foreground">
            Clerk Setup Required
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Add your{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
              VITE_CLERK_PUBLISHABLE_KEY
            </code>{" "}
            environment variable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <RequireAdmin>{children}</RequireAdmin>
    </ClerkProvider>
  );
}
