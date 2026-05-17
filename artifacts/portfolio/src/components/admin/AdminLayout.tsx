import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  LayoutDashboard, 
  FolderKanban, 
  MessageSquare, 
  Settings, 
  LogOut,
  Menu,
  X,
  User,
  UserCircle,
  Code2,
  Zap,
  Briefcase,
  Award,
  ExternalLink,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase-provider";
import CommandPalette from "./CommandPalette";

const supabase = getSupabase();

interface AdminLayoutProps {
  children: React.ReactNode;
}

const mainNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/messages", label: "Messages", icon: MessageSquare },
];

const contentNavItems = [
  { href: "/admin/hero", label: "Hero", icon: User },
  { href: "/admin/about", label: "About", icon: UserCircle },
  { href: "/admin/projects", label: "Projects", icon: Code2 },
  { href: "/admin/skills", label: "Skills", icon: Zap },
  { href: "/admin/experience", label: "Experience", icon: Briefcase },
  { href: "/admin/certifications", label: "Certifications", icon: Award },
];

function UnreadBadge() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "unread-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("contact_messages")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);
      return count ?? 0;
    },
  });

  if (isLoading) return <Skeleton className="h-4 w-4 rounded-full" />;
  if (!data || data === 0) return null;

  return (
    <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
      {data}
    </Badge>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [location] = useLocation();
  const { signOut, user } = useAuth();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border
        transform transition-transform duration-200 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-14 px-4 border-b border-border">
            <Link href="/admin">
              <a className="text-lg font-display font-semibold text-foreground hover:text-foreground/80">
                Admin Panel
              </a>
            </Link>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-muted rounded-md"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-1 mb-6">
              {mainNavItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <a
                      className={`
                        flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm font-medium
                        transition-colors duration-150
                        ${isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }
                      `}
                    >
                      <span className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </span>
                      {item.href === "/admin/messages" && <UnreadBadge />}
                    </a>
                  </Link>
                );
              })}
            </div>

            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
              Content
            </div>
            <div className="space-y-1 mb-6">
              {contentNavItems.map((item) => {
                const isActive = location.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <a
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium
                        transition-colors duration-150
                        ${isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }
                      `}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </a>
                  </Link>
                );
              })}
            </div>

            <div className="space-y-1">
              <Link href="/admin/settings">
                <a
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium
                    transition-colors duration-150
                    ${location === "/admin/settings"
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }
                  `}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </a>
              </Link>
            </div>
          </nav>

          <div className="p-4 border-t border-border">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-3 py-2 mb-3 rounded-md text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              View Site
            </a>
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-medium">
                  {user?.email?.charAt(0).toUpperCase() || "A"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.email}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={signOut}
              className="w-full justify-start"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 border-b border-border bg-card">
          <div className="flex items-center justify-between h-14 px-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-muted rounded-md"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-lg font-display font-semibold">Admin</span>
            <button
              onClick={() => setCommandOpen(true)}
              className="p-2 hover:bg-muted rounded-md"
              aria-label="Search commands"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="hidden lg:flex items-center justify-end px-6 pt-4">
          <button
            onClick={() => setCommandOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-sm hover:bg-muted transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
              <span>⌘</span>K
            </kbd>
          </button>
        </div>
        <main className="p-4 lg:p-6">{children}</main>
        <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      </div>
    </div>
  );
}