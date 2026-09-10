import type { ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@workspace/ui";
import { getErrorMessage } from "@/lib/error-messages";

interface AdminErrorStateProps {
  error?: unknown;
  onRetry?: () => void;
  title?: ReactNode;
  message?: ReactNode;
  wrapperClassName?: string;
  iconClassName?: string;
  retryLabel?: string;
  retrySize?: "default" | "sm" | "lg" | "icon";
  titleClassName?: string;
  contentClassName?: string;
  messageClassName?: string;
}

export function AdminErrorState({
  error,
  onRetry,
  title,
  message,
  wrapperClassName = "p-6 flex flex-col items-center justify-center min-h-64 gap-4",
  iconClassName = "h-12 w-12 text-destructive",
  retryLabel = "Try Again",
  retrySize,
  titleClassName = "text-destructive font-medium",
  contentClassName,
  messageClassName = "text-sm text-muted-foreground",
}: AdminErrorStateProps) {
  const resolvedMessage = message ?? getErrorMessage(error);

  return (
    <div className={wrapperClassName}>
      <AlertCircle className={iconClassName} />
      {title ? contentClassName ? (
        <div className={contentClassName}>
          <p className={titleClassName}>{title}</p>
          <p className={messageClassName}>{resolvedMessage}</p>
        </div>
      ) : (
        <>
          <p className={titleClassName}>{title}</p>
          <p className={messageClassName}>{resolvedMessage}</p>
        </>
      ) : (
        <p className="text-destructive font-medium">{resolvedMessage}</p>
      )}
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size={retrySize}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
