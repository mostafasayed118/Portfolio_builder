import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Palette, Type, User, Code2, FolderKanban, Briefcase,
  Award, Mail, MessageSquare, Search, Layers, Settings,
  ArrowRight, Zap, TrendingUp, Sparkles, AlertCircle, CheckCircle2,
  RefreshCw
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { unreadCount } from "@workspace/db/messages";
import { listSkills } from "@workspace/db/skills";
import { listProjects } from "@workspace/db/projects";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { seedFromStaticData, type SeedProgress } from "@/lib/seed";

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
  const { data: unread, isLoading: unreadLoading, isError: unreadError, error: unreadErrorObj, refetch: refetchUnread } = useQuery({
    queryKey: ["unreadCount"],
    queryFn: () => unreadCount(getSupabase()),
    enabled: isSupabaseConfigured,
  });
  const { data: skills, isLoading: skillsLoading, isError: skillsError, error: skillsErrorObj, refetch: refetchSkills } = useQuery({
    queryKey: ["skills"],
    queryFn: () => listSkills(getSupabase()),
    enabled: isSupabaseConfigured,
  });
  const { data: projects, isLoading: projectsLoading, isError: projectsError, error: projectsErrorObj, refetch: refetchProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => listProjects(getSupabase()),
    enabled: isSupabaseConfigured,
  });

  const isLoading = unreadLoading || skillsLoading || projectsLoading;
  const isError = unreadError || skillsError || projectsError;
  const showSeedWarning = projects?.length === 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[1,2,3,4].map(i => (
          <Card key={i}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mb-8 flex flex-col items-center justify-center min-h-32 gap-3 p-6">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-destructive font-medium">Failed to load dashboard stats</p>
        <p className="text-muted-foreground text-sm">{(unreadErrorObj || skillsErrorObj || projectsErrorObj)?.message}</p>
        <Button onClick={() => { refetchUnread(); refetchSkills(); refetchProjects(); }} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

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
      {showSeedWarning && (
        <Card className="col-span-full border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                No portfolio data found. Click "Import Static Data" to populate content.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SeedDialog() {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<SeedProgress[]>([
    { step: "hero", status: "pending" },
    { step: "about", status: "pending" },
    { step: "skills", status: "pending" },
    { step: "projects", status: "pending" },
    { step: "experience", status: "pending" },
    { step: "certifications", status: "pending" },
  ]);
  const [result, setResult] = useState<{ success: boolean; summary: Record<string, number>; errors: string[] } | null>(null);
  const queryClient = useQueryClient();

  const handleSeed = async () => {
    setResult(null);
    setProgress([
      { step: "hero", status: "pending" },
      { step: "about", status: "pending" },
      { step: "skills", status: "pending" },
      { step: "projects", status: "pending" },
      { step: "experience", status: "pending" },
      { step: "certifications", status: "pending" },
    ]);

    const res = await seedFromStaticData(setProgress);
    setResult(res);

    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["skills"] });
    queryClient.invalidateQueries({ queryKey: ["experience"] });
    queryClient.invalidateQueries({ queryKey: ["certifications"] });
    queryClient.invalidateQueries({ queryKey: ["heroContent"] });
    queryClient.invalidateQueries({ queryKey: ["aboutContent"] });
  };

  const getIcon = (status: SeedProgress["status"]) => {
    switch (status) {
      case "done": return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "running": return <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
      case "error": return <AlertCircle className="h-5 w-5 text-red-500" />;
      default: return <div className="h-5 w-5 rounded-full border-2 border-muted" />;
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" className="shrink-0 gap-2">
        <Sparkles size={16} />
        Import Static Data
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Static Data</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              {progress.map((p) => (
                <div key={p.step} className="flex items-center gap-3">
                  {getIcon(p.status)}
                  <div className="flex-1">
                    <div className="text-sm font-medium capitalize">{p.step} content</div>
                    {p.count !== undefined && p.status === "done" && (
                      <div className="text-xs text-muted-foreground">{p.count} imported</div>
                    )}
                    {p.error && <div className="text-xs text-red-500">{p.error}</div>}
                  </div>
                </div>
              ))}
            </div>

            {result && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50">
                <div className="text-sm font-medium mb-2">Summary</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(result.summary).map(([key, val]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground capitalize">{key}</span>
                      <span>{val}</span>
                    </div>
                  ))}
                </div>
                {result.errors.length > 0 && (
                  <div className="mt-2 text-xs text-red-500">
                    {result.errors.map((e) => <div key={e}>• {e}</div>)}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Overview() {
  const { toast } = useToast();

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
        {isSupabaseConfigured && <SeedDialog />}
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