import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { Button } from "@workspace/ui";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  compact,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "py-8" : "py-16 md:py-24"
      }`}
    >
      <div className="mb-4 animate-empty-icon">
        <div className="rounded-full bg-primary/10 p-3 md:p-4">
          <Icon className="h-6 w-6 md:h-8 md:w-8 text-primary" />
        </div>
      </div>
      <h3 className="font-display font-semibold text-lg md:text-xl text-foreground mb-2 animate-fade-up">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6 animate-fade-up">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="animate-fade-up">
          <Button onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
