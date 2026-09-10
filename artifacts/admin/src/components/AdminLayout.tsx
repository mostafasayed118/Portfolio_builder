import { useCallback, useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import UserSwitcher from "./UserSwitcher";
import SearchPalette from "./SearchPalette";
import ShortcutsHelp from "./ShortcutsHelp";
import { useGlobalShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useAuthUser } from "@workspace/auth";
import { useViewingUser } from "@/lib/viewing-user-context";

interface Props {
  children: React.ReactNode;
}

const SIDEBAR_COLLAPSED_STORAGE_KEY = "admin-sidebar-collapsed";

export default function AdminLayout({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 1024;
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const { isSuperadmin } = useAuthUser();
  const { viewingUserId, setViewingUserId } = useViewingUser();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      }
    };
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleClose = useCallback(() => setSidebarOpen(false), []);
  const handleMenuClick = useCallback(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(prev => !prev);
      return;
    }

    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        window.localStorage.setItem(
          SIDEBAR_COLLAPSED_STORAGE_KEY,
          next ? "1" : "0",
        );
      } catch {
        /* storage unavailable — keep the current session state */
      }
      return next;
    });
  }, []);

  useGlobalShortcuts();

  return (
    <div className="flex min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm"
      >
        Skip to content
      </a>
      <SearchPalette />
      <ShortcutsHelp />
      <Sidebar
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onClose={handleClose}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <Header onMenuClick={handleMenuClick} />
        {isSuperadmin && (
          <div className="px-4 sm:px-6 py-2 border-b border-border bg-muted/30">
            <UserSwitcher
              viewingUserId={viewingUserId}
              onViewUserChange={setViewingUserId}
            />
          </div>
        )}
        <main id="main-content" className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
