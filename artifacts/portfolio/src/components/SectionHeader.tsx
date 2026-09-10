import type { ReactNode } from "react";
import SectionLabel from "./SectionLabel";

interface SectionHeaderProps {
  label: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  descriptionClassName?: string;
  children?: ReactNode;
}

export default function SectionHeader({
  label,
  title,
  description,
  descriptionClassName = "",
  children,
}: SectionHeaderProps) {
  return (
    <div className="text-center mb-12">
      <SectionLabel>{label}</SectionLabel>
      <h2 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-3">
        {title}
      </h2>
      {description !== undefined && (
        <p className={`text-muted-foreground text-sm max-w-xl mx-auto ${descriptionClassName}`}>
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
