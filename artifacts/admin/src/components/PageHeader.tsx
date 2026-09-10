import type { ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Action buttons rendered on the right side of the header row. */
  actions?: ReactNode;
  /** Min width of the title column; some pages need more room. */
  titleMinWidth?: string;
}

/**
 * Standard admin page header: title + description on the left, action buttons
 * (search, export, add, …) on the right. Replaces the duplicated header rows
 * previously copy-pasted into every manager component.
 */
export function PageHeader({ title, description, actions, titleMinWidth = "min-w-[120px]" }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className={`flex-1 ${titleMinWidth}`}>
        {typeof title === "string" ? <h1 className="text-2xl font-bold">{title}</h1> : title}
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
