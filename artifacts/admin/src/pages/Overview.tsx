import { Link } from "wouter";
import {
  Palette, Type, User, Code2, FolderKanban, Briefcase,
  Award, Mail, MessageSquare, Search, Layers, Settings,
  ArrowRight, Zap, BarChart3, Sparkles
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Badge, Card, CardContent } from "@workspace/ui";
import { StatsBar } from "@/components/StatsBar";
import { SeedDialog } from "@/components/SeedDialog";
import { OneTimeHint } from "@/components/OneTimeHint";

const MODULES = [
  { path: "/analytics", label: "Analytics", icon: BarChart3, desc: "Views, top projects, messages", group: "Dashboard" },
  { path: "/theme", label: "Theme Manager", icon: Palette, desc: "Colors, palette, dark/light mode", group: "Appearance" },
  { path: "/typography", label: "Typography", icon: Type, desc: "Fonts, sizes, line height", group: "Appearance" },
  { path: "/sections", label: "Section Order", icon: Layers, desc: "Show/hide & reorder sections", group: "Appearance" },
  { path: "/hero", label: "Hero", icon: Zap, desc: "Name, roles, bio links", group: "Content" },
  { path: "/about", label: "About", icon: User, desc: "Bio, education, languages", group: "Content" },
  { path: "/skills", label: "Skills", icon: Code2, desc: "Tech skills & proficiency", group: "Content" },
  { path: "/projects", label: "Projects", icon: FolderKanban, desc: "Portfolio projects", group: "Content" },
  { path: "/experience", label: "Experience", icon: Briefcase, desc: "Work history & internships", group: "Content" },
  { path: "/certifications", label: "Certifications", icon: Award, desc: "Certificates & credentials", group: "Content" },
  { path: "/contact", label: "Contact", icon: Mail, desc: "Email, phone, social links", group: "Content" },
  { path: "/messages", label: "Messages", icon: MessageSquare, desc: "Contact form submissions", group: "Inbox" },
  { path: "/seo", label: "SEO", icon: Search, desc: "Meta tags, OG, title", group: "Site" },
  { path: "/settings", label: "Site Settings", icon: Settings, desc: "Name, tagline, footer", group: "Site" },
];

const GROUPS = ["Dashboard", "Appearance", "Content", "Inbox", "Site"];

export default function Overview() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Portfolio CMS</h1>
          <div className="text-muted-foreground text-sm">
            Manage every aspect of your portfolio from here.{" "}
            {!isSupabaseConfigured && (
              <Badge variant="destructive" className="ml-1 text-xs">Supabase not connected</Badge>
            )}
          </div>
        </div>
        {isSupabaseConfigured && <SeedDialog />}
      </div>

      {/* First-visit welcome: the shared OneTimeHint pattern, used here to
          teach the whole admin surface once instead of a shortcut. */}
      <OneTimeHint
        storageKey="overview-welcome-dismissed"
        dismissLabel="Dismiss welcome tip"
        className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2"
      >
        <Sparkles size={14} className="shrink-0 text-primary" />
        <span>
          Welcome to your portfolio CMS — edit content (Hero, About,
          Projects…), theme and typography, and answer Messages from your
          contact form. Everything saves instantly.
        </span>
      </OneTimeHint>

      {isSupabaseConfigured && <StatsBar />}

      {GROUPS.map((group) => {
        const items = MODULES.filter(m => m.group === group);
        return (
          <div key={group}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              {group}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(({ path, label, icon: Icon, desc }) => (
                <Link key={path} href={path} className="group block">
                  <Card className="h-full transition-all hover:shadow-md hover:border-primary/30 cursor-pointer">
                    <CardContent className="pt-5 pb-4 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Icon size={16} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</div>
                      </div>
                      <ArrowRight size={14} className="text-muted-foreground/40 group-hover:text-primary transition-colors mt-0.5 shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}