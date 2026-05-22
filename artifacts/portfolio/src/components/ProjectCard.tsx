import { memo } from "react";
import { useLocation } from "wouter";
import { ExternalLink, Github, Sparkles, Globe, Smartphone, Cloud, Code2, Database } from "lucide-react";
import OptimizedImage from "./OptimizedImage";
import { Project } from "@/data/portfolio";

interface ImageVariant {
  type: string;
  url: string;
}

interface ProjectCardProps {
  project: Project & {
    imageId?: string;
    imageVariants?: ImageVariant[];
  };
}

const CATEGORY_CONFIG: Record<string, { icon: typeof Globe; label: string; color: string }> = {
  web: { icon: Globe, label: "Web App", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  mobile: { icon: Smartphone, label: "Mobile", color: "text-green-500 bg-green-500/10 border-green-500/20" },
  cloud: { icon: Cloud, label: "Cloud", color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" },
  scraping: { icon: Code2, label: "Data/Scraping", color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
  data: { icon: Database, label: "Data Eng", color: "text-violet-500 bg-violet-500/10 border-violet-500/20" },
};

const ProjectCard = memo(function ProjectCard({ project }: ProjectCardProps) {
  const [, setLocation] = useLocation();
  const slug = project.slug || `project-${project.id}`;
  const description = (project as { description?: string }).description || project.shortDescription;
  const catConfig = CATEGORY_CONFIG[project.category] || CATEGORY_CONFIG.web;

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a')) return;
    setLocation(`/projects/${slug}`);
  };

  return (
    <div
      className="masonry-item group relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl"
      data-testid={`card-project-${project.id}`}
      onClick={handleClick}
      role="link" // FIX: UX-028
      tabIndex={0}
      aria-label={`View details for ${project.title}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setLocation(`/projects/${slug}`);
        }
      }}
    >
      <div className="glass rounded-2xl border border-border/60 hover:border-primary/30 transition-all duration-500 hover:shadow-[var(--shadow-card)] hover:-translate-y-1 relative overflow-hidden">
        {/* Category badge - always visible */}
        <div className="absolute top-3 left-3 z-20">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border backdrop-blur-sm ${catConfig.color}`}>
            <catConfig.icon className="h-3 w-3" />
            {catConfig.label}
          </span>
        </div>

        {project.imageId && (
          <div className="overflow-hidden">
            <OptimizedImage
              src={project.imageId}
              alt={project.title}
              variants={project.imageVariants}
              className="h-48 w-full transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-accent/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="p-5 relative">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                {project.featured && (
                  <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold border border-primary/20">
                    <Sparkles className="h-3 w-3" />
                    Featured
                  </span>
                )}
              </div>
              <h3 className="font-display font-semibold text-sm text-foreground leading-snug group-hover:text-primary transition-colors">
                {project.title}
              </h3>
            </div>
            <div className="flex gap-1 shrink-0 ml-2">
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all"
                  aria-label="Live site"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                aria-label="View on GitHub"
                data-testid={`link-github-project-${project.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Github className="h-4 w-4" />
              </a>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-3">
            {description}
          </p>

          {project.metrics && project.metrics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {project.metrics.map((m) => (
                <span key={m} className="text-xs text-accent font-medium bg-accent/10 px-2 py-0.5 rounded-md border border-accent/20">
                  {m}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {project.techStack.slice(0, 4).map((tech) => (
              <span
                key={tech}
                className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/60 group-hover:border-primary/20 group-hover:bg-primary/5 transition-all"
                data-testid={`badge-tech-${project.id}-${tech.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {tech}
              </span>
            ))}
            {project.techStack.length > 4 && (
              <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/60">
                +{project.techStack.length - 4}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default ProjectCard;
