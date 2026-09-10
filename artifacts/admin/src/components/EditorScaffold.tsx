import type { ReactNode } from "react";
import { Button, Card, CardContent } from "@workspace/ui";

interface EditorHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

export function EditorHeader({ title, description, actions }: EditorHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {actions}
    </div>
  );
}

interface EditorLayoutProps {
  showPreview: boolean;
  preview: ReactNode;
  children: ReactNode;
  onTogglePreview: () => void;
}

export function EditorLayout({ showPreview, preview, children, onTogglePreview }: EditorLayoutProps) {
  return (
    <div className="space-y-4">
      <div className="lg:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={onTogglePreview}
          className="min-h-[44px]"
          aria-pressed={showPreview}
          aria-label={showPreview ? "Hide preview panel" : "Show preview panel"}
        >
          {showPreview ? "Hide Preview" : "Show Preview"}
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">{children}</div>
        <div className={showPreview ? "block" : "hidden lg:block"}>
          <div className="sticky top-4">
            <p className="text-xs text-muted-foreground mb-2">
              Live Preview — updates as you type
            </p>
            <Card>
              <CardContent className="pt-6">{preview}</CardContent>
            </Card>
            <p className="text-xs text-muted-foreground mt-2">
              Actual appearance may vary slightly
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
