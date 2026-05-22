import { useCallback, useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import UserSwitcher from "./UserSwitcher";
import CommandPalette from "./CommandPalette";
import { useGlobalShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useAuthUser } from "@workspace/auth";
import { useViewingUser } from "@/lib/viewing-user-context";

interface Props {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 1024;
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
  const handleMenuClick = useCallback(() => setSidebarOpen(prev => !prev), []);

  useGlobalShortcuts();

  return (
    <div className="flex min-h-screen bg-background">
      <CommandPalette />
      <Sidebar open={sidebarOpen} onClose={handleClose} />
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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
