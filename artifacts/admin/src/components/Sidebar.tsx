import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { ChevronRight, X, LogOut } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { api } from "@/lib/api-client";
import { usePrefetch } from "@/hooks/usePrefetchRoutes";
import { useAuthUser } from "@workspace/auth";
import { NAV_ITEMS, NAV_GROUPS } from "@/lib/nav-config";

interface Props {
  open: boolean;
  onClose: () => void;
}

function UnreadBadge() {
  const { data: count, isError } = useQuery({
    queryKey: ["unreadCount"],
    queryFn: async () => {
      const res = await api.messages.unreadCount();
      if (!res.success) throw new Error(res.message);
      return res.data;
    },
    retry: 1,
  });
  const n = isError ? 0 : (count ?? 0);
  if (!n) return null;
  return (
    <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1 leading-none">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export default function Sidebar({ open, onClose }: Props) {
  const [location] = useLocation();
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const { prefetch } = usePrefetch();
  const { signOut } = useAuthUser();

  const handleMouseEnter = (path: string) => {
    prefetch(path.replace(/^\//, ""));
  };

  const isActive = (path: string) => {
    const full = base + path;
    return location.startsWith(full);
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed lg:static z-30 inset-y-0 left-0 flex flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          !open && "lg:w-0 lg:overflow-hidden"
        )}
      >
        <div className="flex items-center justify-between h-16 px-5 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-sm">
              MS
            </div>
            <span className="font-semibold text-sm tracking-wide text-sidebar-foreground">
              Portfolio CMS
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <nav aria-label="Admin navigation" className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {NAV_GROUPS.map((group) => {
            const items = NAV_ITEMS.filter(n => n.group === group);
            if (!items.length) return null;
            return (
              <div key={group}>
                <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                  {group}
                </p>
                <ul className="space-y-0.5">
                  {items.map(({ path, label, icon: Icon }) => (
                    <li key={path}>
                      <Link
                        href={path}
                        aria-current={isActive(path) ? "page" : undefined} // FIX: UX-029
                        data-preload="true"
                        onMouseEnter={() => handleMouseEnter(path)}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] rounded-md text-sm font-medium transition-colors group",
                          isActive(path)
                            ? "bg-sidebar-primary text-sidebar-primary-foreground border-s-[3px] border-sidebar-primary-foreground/30"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-s-[3px] border-transparent"
                        )}
                      >
                        <Icon size={15} className="shrink-0" />
                        <span className="flex-1">{label}</span>
                        {path === "/messages" && isSupabaseConfigured ? (
                          <UnreadBadge />
                        ) : isActive(path) ? (
                          <ChevronRight size={12} className="opacity-60" />
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-sidebar-border shrink-0 space-y-2">
          <a
            href={import.meta.env.VITE_PORTFOLIO_URL as string || "/"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            View Live Portfolio
          </a>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-colors"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
