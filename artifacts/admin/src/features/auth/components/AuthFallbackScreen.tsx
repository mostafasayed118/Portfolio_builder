import type { ReactNode } from "react";
import { Button } from "@workspace/ui";

interface AuthFallbackScreenProps {
  emoji: string;
  title: string;
  children: ReactNode;
  onSignOut: () => void;
}

/**
 * Shared shell for the auth fallback screens (session-expired and
 * access-denied). Both render an emoji, a title, a short explanation, and a
 * single sign-out action inside the same centered card.
 */
export function AuthFallbackScreen({ emoji, title, children, onSignOut }: AuthFallbackScreenProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4 p-8 rounded-xl border border-border bg-card">
        <div className="text-4xl">{emoji}</div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {children}
        <Button onClick={onSignOut} className="mt-4 min-h-[44px]">
          Sign Out
        </Button>
      </div>
    </div>
  );
}
