import { memo, useEffect, useRef, useState } from "react";

interface SkillMeterProps {
  label: string;
  value: number;
}

const SkillMeter = memo(function SkillMeter({ label, value }: SkillMeterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimated(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} data-testid={`skill-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex justify-between text-xs font-medium mb-1.5">
        <span className="text-foreground">{label}</span>
        <span className="text-primary font-semibold">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-out"
          style={{
            width: animated ? `${value}%` : "0%",
          }}
        />
      </div>
    </div>
  );
});

export default SkillMeter;
