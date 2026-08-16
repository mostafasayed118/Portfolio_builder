import { useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { ChevronRight, X, LogOut, Keyboard, Mail } from "lucide-react";
import { SHORTCUTS_OPENED_EVENT } from "./ShortcutsDialog";
import { OneTimeHint, type OneTimeHintHandle } from "./OneTimeHint";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useUnreadCountQuery } from "@/lib/use-entity-query";
import { usePrefetch } from "@/hooks/usePrefetchRoutes";
import { useAuthUser } from "@workspace/auth";
import { NAV_ITEMS, NAV_GROUPS } from "@/lib/nav-config";

interface Props {
  open: boolean;
  collapsed?: boolean;
  onClose: () => void;
}

/**
 * One-time nudge making the unread badge discoverable: shown on any page
 * while unread messages exist, then never again once the user visits the
 * Messages inbox or dismisses it (shared OneTimeHint pattern, same key the
 * Sidebar persists when the user lands on /messages).
 */
function UnreadInboxHint() {
  const { data: count, isError } = useUnreadCountQuery();
  const n = isError ? 0 : (count ?? 0);
  if (!n) return null;
  return (
    <OneTimeHint
      storageKey="messages-unread-hint-dismissed"
      dismissLabel="Dismiss unread inbox hint"
      className="rounded-md border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 text-sidebar-foreground/70"
    >
      <span className="flex items-center gap-2">
        <Mail size={13} className="shrink-0" />
        <span className="flex-1">
          You have {n} unread message{n === 1 ? "" : "s"} — check the Messages
          inbox.
        </span>
      </span>
    </OneTimeHint>
  );
}

function UnreadBadge({ collapsed }: { collapsed: boolean }) {
  // Single canonical source for the unread badge: the same API-backed query
  // StatsBar uses (GET /api/v1/admin/messages/unread-count), which counts
  // only status='unread' rows. Keyed by viewingUserId so the badge follows
  // superadmin user-switching instead of showing a stale global count.
  const { data: count, isError } = useUnreadCountQuery();
  const n = isError ? 0 : (count ?? 0);
  if (!n) return null;
  return (
    <span
      className={cn(
        "min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1 leading-none",
        collapsed ? "absolute top-1 right-1" : "ml-auto",
      )}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

export default function Sidebar({ open, collapsed = false, onClose }: Props) {
  const [location] = useLocation();
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const { prefetch } = usePrefetch();
  const { signOut } = useAuthUser();

  // One-time "Press ?" nudge for the Messages page's keyboard shortcuts,
  // shown only while on /messages (the `?` key is page-scoped there). It
  // dismisses via its ✕ OR automatically once the user opens the shortcuts
  // modal by any route (ShortcutsHelp dispatches the event) — the shared
  // OneTimeHint handles the persistence.
  const shortcutsHintRef = useRef<OneTimeHintHandle>(null);
  useEffect(() => {
    const handler = () => shortcutsHintRef.current?.dismiss();
    window.addEventListener(SHORTCUTS_OPENED_EVENT, handler);
    return () => window.removeEventListener(SHORTCUTS_OPENED_EVENT, handler);
  }, []);

  // Visiting the Messages inbox serves the unread nudge's purpose — persist
  // the dismissal so it never returns (the OneTimeHint reads the same key).
  useEffect(() => {
    if (location.startsWith(`${base}/messages`)) {
      try {
        localStorage.setItem("messages-unread-hint-dismissed", "1");
      } catch {
        /* storage unavailable — persist best-effort only */
      }
    }
  }, [location, base]);

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
          className="fixed inset-0 bg-overlay/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed lg:static z-30 inset-y-0 left-0 flex flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width,transform] duration-200",
          collapsed && "lg:w-16",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          !open && "lg:w-0 lg:overflow-hidden"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between h-16 px-5 border-b border-sidebar-border shrink-0",
            collapsed && "lg:px-3 lg:justify-center",
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-sm">
              MS
            </div>
            <span
              className={cn(
                "font-semibold text-sm tracking-wide text-sidebar-foreground",
                collapsed && "lg:sr-only",
              )}
            >
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
                <p
                  className={cn(
                    "px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40",
                    collapsed && "lg:sr-only",
                  )}
                >
                  {group}
                </p>
                <ul className="space-y-0.5">
                  {items.map(({ path, label, icon: Icon }) => (
                    <li key={path}>
                      <Link
                        href={path}
                        aria-current={isActive(path) ? "page" : undefined}
                        data-preload="true"
                        onMouseEnter={() => handleMouseEnter(path)}
                        title={label}
                        className={cn(
                          "relative flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] rounded-md text-sm font-medium transition-colors group",
                          collapsed && "lg:justify-center lg:px-2",

                          isActive(path)
                            ? "bg-sidebar-primary text-sidebar-primary-foreground border-s-[3px] border-sidebar-primary-foreground/30"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-s-[3px] border-transparent"
                        )}
                      >
                        <Icon size={15} className="shrink-0" />
                        <span className={cn("flex-1", collapsed && "lg:sr-only")}>
                          {label}
                        </span>
                        {path === "/messages" && isSupabaseConfigured ? (
                          <UnreadBadge collapsed={collapsed} />
                        ) : isActive(path) && !collapsed ? (
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
          {/* The unread nudge points at the badge from anywhere except the
              inbox itself (where the badge is already in view). */}
          {!location.startsWith(`${base}/messages`) && (
            <div className={collapsed ? "lg:hidden" : undefined}>
              <UnreadInboxHint />
            </div>
          )}
          {location.startsWith(`${base}/messages`) && (
            <OneTimeHint
              ref={shortcutsHintRef}
              storageKey="messages-shortcuts-hint-dismissed"
              dismissLabel="Dismiss shortcuts hint"
              className={cn(
                "rounded-md border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 text-sidebar-foreground/70",
                collapsed && "lg:hidden",
              )}
            >
              <span className="flex items-center gap-2">
                <Keyboard size={13} className="shrink-0" />
                <span className="flex-1">
                  Press{" "}
                  <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                    ?
                  </kbd>
                  {" "}for keyboard shortcuts
                </span>
              </span>
            </OneTimeHint>
          )}
          <a
            href={import.meta.env.VITE_PORTFOLIO_URL as string || "/"}
            target="_blank"
            rel="noopener noreferrer"
            title="View Live Portfolio"
            aria-label="View Live Portfolio"
            className={cn(
              "flex items-center gap-2 text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors",
              collapsed && "lg:justify-center",
            )}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className={collapsed ? "lg:sr-only" : undefined}>
              View Live Portfolio
            </span>
          </a>
          <button
            onClick={() => signOut()}
            title="Logout"
            aria-label="Logout"
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-colors",
              collapsed && "lg:justify-center",
            )}
          >
            <LogOut size={15} />
            <span className={collapsed ? "lg:sr-only" : undefined}>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
