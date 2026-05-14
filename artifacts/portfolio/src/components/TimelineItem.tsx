import { memo } from "react";
import { Briefcase, Award, Heart } from "lucide-react";
import { useReveal } from "@/hooks/use-reveal";

interface TimelineItemProps {
  title: string;
  company: string;
  location: string;
  period: string;
  description: string[];
  technologies: string[];
  type: "internship" | "certification" | "volunteer";
  index: number;
}

const TYPE_CONFIG = {
  internship: {
    Icon: Briefcase,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    label: "Internship",
  },
  certification: {
    Icon: Award,
    color: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/20",
    label: "Certification",
  },
  volunteer: {
    Icon: Heart,
    color: "text-chart-3",
    bg: "bg-chart-3/10",
    border: "border-chart-3/20",
    label: "Volunteer",
  },
};

const TimelineItem = memo(function TimelineItem({ title, company, location, period, description, technologies, type, index }: TimelineItemProps) {
  const { ref, revealed } = useReveal(0.1);
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.internship;
  const { Icon } = config;

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`flex gap-4 section-reveal ${revealed ? "revealed" : ""}`}
      style={{ transitionDelay: `${index * 100}ms` }}
      data-testid={`timeline-item-${index}`}
    >
      <div className="flex flex-col items-center">
        <div className={`h-9 w-9 rounded-full ${config.bg} border ${config.border} flex items-center justify-center shrink-0 z-10`}>
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>
        {index < 2 && (
          <div className="flex-1 w-px bg-gradient-to-b from-primary/30 to-transparent mt-2" />
        )}
      </div>

      <div className="glass rounded-xl p-5 flex-1 mb-6 border hover:border-primary/20 transition-all">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="font-display font-semibold text-sm text-foreground">{title}</h3>
            <p className="text-xs text-primary font-medium">{company}</p>
            <p className="text-xs text-muted-foreground">{location}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className={`text-xs font-semibold ${config.color} ${config.bg} border ${config.border} px-2 py-0.5 rounded-full capitalize`}>
              {config.label}
            </span>
            <span className="text-xs text-muted-foreground">{period}</span>
          </div>
        </div>

        <ul className="space-y-1.5 mb-4">
          {description.map((item, i) => (
            <li key={i} className="text-xs text-muted-foreground flex gap-2">
              <span className="text-primary shrink-0 mt-0.5">•</span>
              {item}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-1.5">
          {technologies.map((tech) => (
            <span key={tech} className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/60">
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});

export default TimelineItem;
