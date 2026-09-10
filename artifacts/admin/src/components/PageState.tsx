import { ReactNode } from "react";
import { ContentSkeleton } from "./ContentSkeleton";
import { SmartEmptyState } from "./SmartEmptyState";
import { AdminErrorState } from "./AdminErrorState";

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
      <AdminErrorState
        error={error}
        title="Something went wrong"
        onRetry={onRetry}
        wrapperClassName="flex flex-col items-center justify-center py-16 px-4 text-center gap-3"
        iconClassName="h-10 w-10 text-destructive"
        titleClassName="text-destructive font-medium"
        messageClassName="text-muted-foreground text-sm"
        retrySize="sm"
      />
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
