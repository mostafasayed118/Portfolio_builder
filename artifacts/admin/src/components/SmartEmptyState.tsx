import { Button } from "@workspace/ui";
import { Search, FolderOpen, Inbox, Users, Plus, FileText, Briefcase, Award } from "lucide-react";

interface SmartEmptyStateProps {
  type: "projects" | "skills" | "experience" | "certifications" | "messages" | "search" | "default";
  onAction?: () => void;
  actionLabel?: string;
  searchQuery?: string;
}

const emptyStateConfig = {
  projects: {
    icon: FolderOpen,
    title: "No projects yet",
    description: "Add your first project to showcase your work",
    actionLabel: "Add Project",
  },
  skills: {
    icon: Users,
    title: "No skills added",
    description: "Start adding your technical skills and expertise",
    actionLabel: "Add Skill",
  },
  experience: {
    icon: Briefcase,
    title: "No experience entries",
    description: "Add your work history and internships",
    actionLabel: "Add Experience",
  },
  certifications: {
    icon: Award,
    title: "No certifications",
    description: "Showcase your certificates and credentials",
    actionLabel: "Add Certification",
  },
  messages: {
    icon: Inbox,
    title: "No messages yet",
    description: "Messages from your contact form will appear here",
  },
  search: {
    icon: Search,
    title: "No results found",
    description: "Try different keywords or filters",
  },
  default: {
    icon: FileText,
    title: "Nothing here yet",
    description: "Start by adding some content",
    actionLabel: "Add",
  },
};

export function SmartEmptyState({ type, onAction, actionLabel, searchQuery }: SmartEmptyStateProps) {
  const config = type === "search" && searchQuery 
    ? { ...emptyStateConfig.search, description: `No results for "${searchQuery}"` }
    : emptyStateConfig[type as keyof typeof emptyStateConfig] || emptyStateConfig.default;
  
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{config.title}</h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-6">{config.description}</p>
      {(onAction || (config as { actionLabel?: string }).actionLabel) && (
        <Button onClick={onAction} className="gap-2">
          <Plus className="h-4 w-4" />
          {actionLabel || (config as { actionLabel?: string }).actionLabel}
        </Button>
      )}
    </div>
  );
}