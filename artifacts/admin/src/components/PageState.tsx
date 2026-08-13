import { ReactNode } from "react";
import { ContentSkeleton } from "./ContentSkeleton";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@workspace/ui";
import { SmartEmptyState } from "./SmartEmptyState";
import { getErrorMessage } from "@/lib/error-messages";

interface PageStateProps<T> {
  data: T[] | undefined;
  isLoading: boolean;
  error: Error | null;
  emptyType: "projects" | "skills" | "experience" | "certifications" | "messages" | "search" | "default";
  onAction?: () => void;
  actionLabel?: string;
  children: (data: T[]) => ReactNode;
  onRetry?: () => void;
}

export function PageState<T>({
  data,
  isLoading,
  error,
  emptyType,
  onAction,
  actionLabel,
  children,
  onRetry,
}: PageStateProps<T>) {
  if (isLoading) return <ContentSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-destructive font-medium">Something went wrong</p>
        <p className="text-muted-foreground text-sm">{getErrorMessage(error)}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <SmartEmptyState
        type={emptyType}
        onAction={onAction}
        actionLabel={actionLabel}
      />
    );
  }

  return <>{children(data)}</>;
}
