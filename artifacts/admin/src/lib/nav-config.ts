import type { ElementType } from "react";
import {
  LayoutDashboard, Palette, Type, User, Briefcase, Code2,
  FolderKanban, Award, MessageSquare, Search, Layers,
  Settings, Zap, FileText, ExternalLink, Plus
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
  { path: "/hero", label: "Hero", icon: Zap, group: "Content", keywords: ["hero", "banner", "header", "image"] },
  { path: "/about", label: "About", icon: User, group: "Content", keywords: ["about", "bio", "education", "languages"] },
  { path: "/projects", label: "Projects", icon: FolderKanban, group: "Content", keywords: ["projects", "portfolio", "work", "showcase"] },
  { path: "/skills", label: "Skills", icon: Code2, group: "Content", keywords: ["skills", "abilities", "technologies", "tech"] },
  { path: "/experience", label: "Experience", icon: Briefcase, group: "Content", keywords: ["experience", "work", "jobs", "career"] },
  { path: "/certifications", label: "Certifications", icon: Award, group: "Content", keywords: ["certifications", "certificates", "credentials", "badges"] },
  { path: "/messages", label: "Messages", icon: MessageSquare, group: "Inbox", keywords: ["messages", "inbox", "contact", "emails"] },
  { path: "/cv", label: "CV / Resume", icon: FileText, group: "Site", keywords: ["cv", "resume", "download", "pdf"] },
  { path: "/seo", label: "SEO", icon: Search, group: "Site", keywords: ["seo", "meta", "search", "optimization", "keywords"] },
  { path: "/typography", label: "Typography", icon: Type, group: "Site", keywords: ["typography", "fonts", "text", "type"] },
  { path: "/sections", label: "Section Order", icon: Layers, group: "Site", keywords: ["sections", "order", "rearrange", "layout", "visibility"] },
  { path: "/theme", label: "Theme", icon: Palette, group: "Site", keywords: ["theme", "colors", "dark", "light", "palette"] },
  { path: "/settings", label: "Site Settings", icon: Settings, group: "Site", keywords: ["settings", "config", "site", "name", "tagline"] },
];

export const NAV_GROUPS = ["Dashboard", "Content", "Inbox", "Site"];

export const PATH_LABELS: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.map(item => [item.path, item.label])
);

export const QUICK_ACTIONS = [
  { label: "View Live Portfolio", icon: ExternalLink, action: "view-portfolio", keywords: ["live", "portfolio", "site", "view"] },
  { label: "Add New Project", icon: Plus, action: "add-project", keywords: ["add", "new", "create", "project"] },
  { label: "Add New Skill", icon: Plus, action: "add-skill", keywords: ["add", "new", "create", "skill"] },
  { label: "Add New Experience", icon: Plus, action: "add-experience", keywords: ["add", "new", "create", "experience"] },
];
