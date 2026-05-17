import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  FolderKanban, 
  Zap, 
  Briefcase, 
  MessageSquare,
  User,
  UserCircle,
  Code2,
  Award,
  ArrowRight,
  X,
  Rocket
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSupabase } from "@/lib/supabase-provider";
import { fetchEventStats, fetchMessageStats } from "@workspace/db/analytics";
import StatsRow from "@/components/admin/charts/StatsRow";
import PageViewsChart from "@/components/admin/charts/PageViewsChart";
import MessagesChart from "@/components/admin/charts/MessagesChart";
import TopProjectsChart from "@/components/admin/charts/TopProjectsChart";

const supabase = getSupabase();

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number | undefined;
  isLoading: boolean;
  href: string;
}

function StatCard({ icon: Icon, label, value, isLoading, href }: StatCardProps) {
  const [, setLocation] = useLocation();

  return (
    <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setLocation(href)}>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-12 mb-1" />
              <Skeleton className="h-3 w-16" />
            </>
          ) : (
            <>
              <p className="text-2xl font-bold">{value ?? 0}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const quickActions = [
  { href: "/admin/hero", label: "Hero", icon: User },
  { href: "/admin/about", label: "About", icon: UserCircle },
  { href: "/admin/projects", label: "Projects", icon: Code2 },
  { href: "/admin/skills", label: "Skills", icon: Zap },
  { href: "/admin/experience", label: "Experience", icon: Briefcase },
  { href: "/admin/certifications", label: "Certs", icon: Award },
];

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface RecentMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  is_read: boolean;
  created_at: string;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const today = new Date().toLocaleDateString("en-US", { 
    weekday: "long", 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  });

  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem("onboarding-dismissed") === "true";
    } catch {
      return false;
    }
  });

  const { data: projectsCount, isLoading: projectsLoading } = useQuery({
    queryKey: ["admin", "stats", "projects"],
    queryFn: async () => {
      const { count } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: skillsCount, isLoading: skillsLoading } = useQuery({
    queryKey: ["admin", "stats", "skills"],
    queryFn: async () => {
      const { count } = await supabase
        .from("skills")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: experienceCount, isLoading: experienceLoading } = useQuery({
    queryKey: ["admin", "stats", "experience"],
    queryFn: async () => {
      const { count } = await supabase
        .from("experience")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: unreadCount, isLoading: unreadLoading } = useQuery({
    queryKey: ["admin", "stats", "unread"],
    queryFn: async () => {
      const { count } = await supabase
        .from("contact_messages")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);
      return count ?? 0;
    },
  });

  const { data: recentMessages, isLoading: messagesLoading } = useQuery<RecentMessage[]>({
    queryKey: ["admin", "recent-messages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contact_messages")
        .select("id, name, email, subject, is_read, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: eventStats, isLoading: eventStatsLoading } = useQuery({
    queryKey: ["analytics", "stats", 30],
    queryFn: () => fetchEventStats(supabase, 30),
    staleTime: 1000 * 60 * 5,
  });

  const { data: messageStats, isLoading: messageStatsLoading } = useQuery({
    queryKey: ["analytics", "message-stats"],
    queryFn: () => fetchMessageStats(supabase, 30),
    staleTime: 1000 * 60 * 5,
  });

  const weeklyMessages = messageStats
    ? messageStats.reduce(
        (acc, d) => {
          acc.total += d.total;
          acc.unread += d.unread;
          return acc;
        },
        { total: 0, unread: 0 },
      )
    : undefined;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Welcome, Admin</h1>
          <p className="text-muted-foreground">{today}</p>
        </div>
      </div>

      {!dismissed && projectsCount === 0 && skillsCount === 0 && experienceCount === 0 && unreadCount === 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-3 shrink-0">
                  <Rocket className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg text-foreground mb-1">
                    Welcome to Your Portfolio Dashboard!
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-xl">
                    Start building your portfolio by adding content. Here are the first steps:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setLocation("/admin/hero")}>
                      <User className="h-4 w-4 mr-1" />
                      Set Up Hero
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setLocation("/admin/projects")}>
                      <Code2 className="h-4 w-4 mr-1" />
                      Add Projects
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setLocation("/admin/skills")}>
                      <Zap className="h-4 w-4 mr-1" />
                      Add Skills
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setLocation("/admin/experience")}>
                      <Briefcase className="h-4 w-4 mr-1" />
                      Add Experience
                    </Button>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => {
                  setDismissed(true);
                  try { localStorage.setItem("onboarding-dismissed", "true"); } catch {}
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={FolderKanban} 
          label="Projects" 
          value={projectsCount} 
          isLoading={projectsLoading}
          href="/admin/projects"
        />
        <StatCard 
          icon={Zap} 
          label="Skills" 
          value={skillsCount} 
          isLoading={skillsLoading}
          href="/admin/skills"
        />
        <StatCard 
          icon={Briefcase} 
          label="Experience" 
          value={experienceCount} 
          isLoading={experienceLoading}
          href="/admin/experience"
        />
        <StatCard 
          icon={MessageSquare} 
          label="Unread Messages" 
          value={unreadCount} 
          isLoading={unreadLoading}
          href="/admin/messages"
        />
      </div>

      <StatsRow
        totalViews={eventStats?.totalViews}
        cvDownloads={eventStats?.cvDownloads}
        contactClicks={eventStats?.contactClicks}
        weeklyMessages={weeklyMessages}
        isLoading={eventStatsLoading}
      />

      <PageViewsChart
        data={eventStats?.pageViews}
        isLoading={eventStatsLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MessagesChart
          data={messageStats}
          isLoading={messageStatsLoading}
        />
        <TopProjectsChart
          data={eventStats?.topProjects}
          isLoading={eventStatsLoading}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Button
              key={action.href}
              variant="outline"
              size="sm"
              onClick={() => setLocation(action.href)}
              className="gap-2"
            >
              <action.icon className="h-4 w-4" />
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Messages</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation("/admin/messages")}
            className="gap-1"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        
        {messagesLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : recentMessages && recentMessages.length > 0 ? (
          <div className="border rounded-lg divide-y">
            {recentMessages.map((msg) => (
              <div 
                key={msg.id} 
                className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setLocation("/admin/messages")}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-primary">
                    {msg.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{msg.name}</p>
                    {!msg.is_read && (
                      <Badge variant="secondary" className="h-5 text-xs">New</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{msg.subject}</p>
                </div>
                <div className="text-sm text-muted-foreground flex-shrink-0">
                  {formatDate(msg.created_at)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No messages yet
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}