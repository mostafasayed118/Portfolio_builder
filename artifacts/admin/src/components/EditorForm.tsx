import { cloneElement, isValidElement, useId } from "react";
import type { ReactElement, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui";

interface EditorCardProps {
  title: ReactNode;
  children: ReactNode;
  headerActions?: ReactNode;
  contentClassName?: string;
}

export function EditorCard({
  title,
  children,
  headerActions,
  contentClassName,
}: EditorCardProps) {
  return (
    <Card>
      <CardHeader className={headerActions ? "flex flex-row items-center justify-between" : undefined}>
        <CardTitle>{title}</CardTitle>
        {headerActions}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}

interface EditorFieldProps {
  label: ReactNode;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
  /** Explicit id for the control (defaults to the child's own id, then a generated one). */
  id?: string;
  /** Back-compat alias for `id`; associates the label with the control. */
  htmlFor?: string;
  error?: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  errorId?: string;
}

export function EditorField({
  label,
  children,
  className = "space-y-2",
  labelClassName = "text-sm font-medium",
  id,
  htmlFor,
  error,
  hint,
  required = false,
  errorId,
}: EditorFieldProps) {
  const autoId = useId();
  const childId = isValidElement(children)
    ? (children.props as { id?: string } | null)?.id
    : undefined;
  // Prefer an explicit id, then htmlFor, then the child's own id, then a
  // generated id — so existing ids stay stable while the label is always
  // programmatically associated with the control.
  const controlId = id ?? htmlFor ?? childId ?? autoId;
  const resolvedErrorId = errorId ?? `${controlId}-error`;
  const hintId = `${controlId}-hint`;
  // Only reference an element that actually exists (error or hint).
  const describedBy = error ? resolvedErrorId : hint ? hintId : undefined;

  // Inject the control id and ARIA state onto the child element itself, so
  // assistive tech reads the association/state from the input rather than
  // from an inert wrapper <div>.
  let control = children;
  if (isValidElement(children)) {
    control = cloneElement(children as ReactElement<Record<string, unknown>>, {
      id: controlId,
      "aria-invalid": error ? true : undefined,
      "aria-describedby": describedBy,
      "aria-required": required ? true : undefined,
    });
  }

  return (
    <div className={className}>
      <label htmlFor={controlId} className={labelClassName}>
        {label}
        {required && (
          <span aria-hidden="true" className="text-destructive">
            {" "}
            *
          </span>
        )}
      </label>
      {control}
      {error ? (
        <p id={resolvedErrorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
