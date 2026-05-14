import { memo } from "react";
import { ExternalLink, Github } from "lucide-react";

interface Project {
  id: number;
  title: string;
  description: string;
  techStack: string[];
  category: string;
  featured?: boolean;
  githubUrl: string;
  metrics?: string[];
}

const ProjectCard = memo(function ProjectCard({ project }: { project: Project }) {
  return (
    <div
      className="masonry-item glass rounded-2xl p-6 border hover:border-primary/30 transition-all duration-300 hover:shadow-[var(--shadow-card)] group"
      data-testid={`card-project-${project.id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {project.featured && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold border border-primary/20">
                Featured
              </span>
            )}
            <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-0.5 rounded-full">
              {project.category}
            </span>
          </div>
          <h3 className="font-display font-semibold text-sm text-foreground leading-snug group-hover:text-primary transition-colors">
            {project.title}
          </h3>
        </div>
        <a
          href={project.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all shrink-0 ml-2"
          aria-label="View on GitHub"
          data-testid={`link-github-project-${project.id}`}
        >
          <Github className="h-4 w-4" />
        </a>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
        {project.description}
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
        {project.techStack.map((tech) => (
          <span
            key={tech}
            className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/60"
            data-testid={`badge-tech-${project.id}-${tech.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {tech}
          </span>
        ))}
      </div>
    </div>
  );
});

export default ProjectCard;
