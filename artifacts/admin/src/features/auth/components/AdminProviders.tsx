import { ClerkProvider } from "@clerk/clerk-react";
import { type ReactNode } from "react";
import ClerkAuthBridge from "./ClerkAuthBridge";
import { ClerkConfigCheck } from "./ClerkConfigCheck";
import { BUNDLE_VERSION } from "./constants";

if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.log(`[auth-guard] BUNDLE_VERSION=${BUNDLE_VERSION} loaded at ${new Date().toISOString()}`);
}

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

/**
 * Composition root for the Admin app's auth layer.
 *
 * Mounts ClerkProvider + ClerkAuthBridge in one place. If the Clerk
 * publishable key is missing, renders a helpful setup screen instead.
 */
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
      <ClerkConfigCheck />
      <ClerkAuthBridge>{children}</ClerkAuthBridge>
    </ClerkProvider>
  );
}
