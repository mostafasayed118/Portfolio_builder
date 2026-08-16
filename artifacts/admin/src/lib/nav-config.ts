import type { ElementType } from "react";
import {
  LayoutDashboard, Palette, Type, User, Briefcase, Code2,
  FolderKanban, Award, MessageSquare, Search, Layers,
  Settings, Zap, FileText, ExternalLink, Plus, Clock, NotebookPen, BarChart3, Sparkles
} from "lucide-react";

export interface NavItem {
  path: string;
  label: string;
  icon: ElementType;
  group: string;
  keywords: string[];
}

export const NAV_ITEMS: NavItem[] = [
  { path: "/overview", label: "Overview", icon: LayoutDashboard, group: "Dashboard", keywords: ["dashboard", "home", "overview", "stats"] },
  { path: "/analytics", label: "Analytics", icon: BarChart3, group: "Dashboard", keywords: ["analytics", "stats", "views", "traffic", "insights", "charts"] },
  { path: "/hero", label: "Hero", icon: Zap, group: "Content", keywords: ["hero", "banner", "header", "image"] },
  { path: "/about", label: "About", icon: User, group: "Content", keywords: ["about", "bio", "education", "languages"] },
  { path: "/projects", label: "Projects", icon: FolderKanban, group: "Content", keywords: ["projects", "portfolio", "work", "showcase"] },
  { path: "/ai", label: "AI Assistant", icon: Sparkles, group: "Content", keywords: ["ai", "assistant", "generate", "description", "tags", "categories", "analyze", "content", "gemini", "writer"] },
  { path: "/skills", label: "Skills", icon: Code2, group: "Content", keywords: ["skills", "abilities", "technologies", "tech"] },
  { path: "/experience", label: "Experience", icon: Briefcase, group: "Content", keywords: ["experience", "work", "jobs", "career"] },
  { path: "/certifications", label: "Certifications", icon: Award, group: "Content", keywords: ["certifications", "certificates", "credentials", "badges"] },
  { path: "/posts", label: "Blog Posts", icon: NotebookPen, group: "Content", keywords: ["posts", "blog", "articles", "writing"] },
  { path: "/messages", label: "Messages", icon: MessageSquare, group: "Inbox", keywords: ["messages", "inbox", "contact", "emails"] },
  { path: "/cv", label: "CV / Resume", icon: FileText, group: "Site", keywords: ["cv", "resume", "download", "pdf"] },
  { path: "/seo", label: "SEO", icon: Search, group: "Site", keywords: ["seo", "meta", "search", "optimization", "keywords"] },
  { path: "/typography", label: "Typography", icon: Type, group: "Site", keywords: ["typography", "fonts", "text", "type"] },
  { path: "/sections", label: "Section Order", icon: Layers, group: "Site", keywords: ["sections", "order", "rearrange", "layout", "visibility"] },
  { path: "/theme", label: "Theme", icon: Palette, group: "Site", keywords: ["theme", "colors", "dark", "light", "palette"] },
  { path: "/settings", label: "Site Settings", icon: Settings, group: "Site", keywords: ["settings", "config", "site", "name", "tagline"] },
  { path: "/audit", label: "Audit Log", icon: Clock, group: "Site", keywords: ["audit", "log", "history", "changes", "tracking"] },
];

export const NAV_GROUPS = ["Dashboard", "Content", "Inbox", "Site"];

export const PATH_LABELS: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.map(item => [item.path, item.label])
);

// Deep-link quick actions navigate to `<path>#new` (open the create dialog)
// or `<path>#edit-<id>` (open a specific item's editor). See the convention
// note at the top of components/CommandPalette.tsx; the target entity pages
// handle those hashes on arrival.
export const QUICK_ACTIONS = [
  { label: "View Live Portfolio", icon: ExternalLink, action: "view-portfolio", keywords: ["live", "portfolio", "site", "view"] },
  { label: "Add New Project", icon: Plus, action: "add-project", keywords: ["add", "new", "create", "project"] },
  { label: "Add New Skill", icon: Plus, action: "add-skill", keywords: ["add", "new", "create", "skill"] },
  { label: "Add New Experience", icon: Plus, action: "add-experience", keywords: ["add", "new", "create", "experience"] },
  { label: "Add New Post", icon: Plus, action: "add-post", keywords: ["add", "new", "create", "post", "blog", "article", "write", "editor"] },
  { label: "Add New Certification", icon: Plus, action: "add-certification", keywords: ["add", "new", "create", "certification", "cert", "credential", "badge", "editor"] },
  { label: "Edit Latest Draft", icon: NotebookPen, action: "edit-latest-draft", keywords: ["edit", "draft", "unpublished", "latest", "newest", "post", "blog", "continue", "resume"] },
  { label: "Generate Project Description", icon: Sparkles, action: "ai-generate-description", keywords: ["ai", "generate", "description", "write", "draft", "project"] },
  { label: "Suggest Categories for Skill", icon: Sparkles, action: "ai-suggest-categories", keywords: ["ai", "suggest", "categories", "category", "skill"] },
  { label: "Suggest Tags for Project", icon: Sparkles, action: "ai-suggest-tags", keywords: ["ai", "suggest", "tags", "tag", "project"] },
  { label: "Analyze Content", icon: Sparkles, action: "ai-analyze-content", keywords: ["ai", "analyze", "content", "score", "review", "improve"] },
];
