import { memo } from "react";

interface SkillMeterProps {
  label: string;
  value: number;
}

const SkillMeter = memo(function SkillMeter({ label, value }: SkillMeterProps) {
  return (
    <div data-testid={`skill-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex justify-between text-xs font-medium mb-1.5">
        <span className="text-foreground">{label}</span>
        <span className="text-primary font-semibold">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-out"
          style={{
            width: `${value}%`,
          }}
        />
      </div>
    </div>
  );
});

export default SkillMeter;
