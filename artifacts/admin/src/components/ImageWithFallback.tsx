import { useState } from "react";
import { ImageIcon, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageWithFallbackProps {
  src: string | null | undefined;
  alt: string;
  fallbackIcon?: LucideIcon;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ImageWithFallback({
  src,
  alt,
  fallbackIcon: Icon = ImageIcon,
  className,
  size = "md",
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false);
  const sizeClasses = { sm: "w-8 h-8", md: "w-16 h-16", lg: "w-32 h-32" };

  if (!src || error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-muted",
          sizeClasses[size],
          className,
        )}
      >
        <Icon className="h-1/3 w-1/3 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
}
