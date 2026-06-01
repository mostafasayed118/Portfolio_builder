import { cn } from "../../utils/cn"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-testid="skeleton"
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      {...props}
    />
  )
}

export { Skeleton }
