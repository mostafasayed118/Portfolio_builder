import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Palette, Type, User, Code2, FolderKanban, Briefcase,
  Award, Mail, MessageSquare, Search, Layers, Settings,
  ArrowRight, Zap, TrendingUp, Sparkles
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getSupabase, isSupabaseConfigured } from "@/lib/convex";
import { unreadCount } from "@workspace/db/messages";
import { listSkills } from "@workspace/db/skills";
import { listProjects } from "@workspace/db/projects";

const MODULES = [
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

const GROUPS = ["Appearance", "Content", "Inbox", "Site"];

function StatsBar() {
  const { data: unread } = useQuery({
    queryKey: ["unreadCount"],
    queryFn: () => unreadCount(getSupabase()),
    enabled: isSupabaseConfigured,
  });
  const { data: skills } = useQuery({
    queryKey: ["skills"],
    queryFn: () => listSkills(getSupabase()),
    enabled: isSupabaseConfigured,
  });
  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => listProjects(getSupabase()),
    enabled: isSupabaseConfigured,
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      {[
        { label: "Unread Messages", value: unread ?? "–", icon: MessageSquare, color: "text-blue-500" },
        { label: "Skills", value: skills?.length ?? "–", icon: Code2, color: "text-emerald-500" },
        { label: "Projects", value: projects?.length ?? "–", icon: FolderKanban, color: "text-violet-500" },
        { label: "Status", value: "Live", icon: TrendingUp, color: "text-green-500" },
      ].map(({ label, value, icon: Icon, color }) => (
        <Card key={label}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <Icon size={20} className={color} />
              <div>
                <div className="text-xl font-bold">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Overview() {
  const { toast } = useToast();

  const handleSeed = async () => {
    toast({ title: "Seed via Supabase SQL", description: "Run supabase/migrations/001_init.sql to seed data." });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Portfolio CMS</h1>
          <p className="text-muted-foreground text-sm">
            Manage every aspect of your portfolio from here.{" "}
            {!isSupabaseConfigured && (
              <Badge variant="destructive" className="ml-1 text-xs">Supabase not connected</Badge>
            )}
          </p>
        </div>
        {isSupabaseConfigured && (
          <Button onClick={handleSeed} className="shrink-0 gap-2">
            <Sparkles size={16} />
            Seed Data
          </Button>
        )}
      </div>

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
