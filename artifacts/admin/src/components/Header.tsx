import { memo, useState, useEffect } from "react";
import { Menu, Sun, Moon, LogOut, User, ChevronDown, Search } from "lucide-react";
import { useLocation } from "wouter";
import { useAuthUser } from "@workspace/auth";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Kbd } from "@workspace/ui";
import { PATH_LABELS } from "@/lib/nav-config";

interface Props {
  onMenuClick: () => void;
}

const Header = memo(function Header({ onMenuClick }: Props) {
  const [location] = useLocation();
  const { user, signOut } = useAuthUser();
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const pageTitle = PATH_LABELS[location] || "Admin CMS";

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 lg:px-6 gap-3 shrink-0">
      <button
        onClick={onMenuClick}
        className="lg:hidden min-h-[44px] min-w-[44px] rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu size={18} />
      </button>

      <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-foreground font-medium text-sm">{pageTitle}</span>
      </div>

      <div className="flex-1 sm:hidden">
        <span className="text-sm font-medium text-foreground">{pageTitle}</span>
      </div>

      {/* Search hint button - opens command palette */}
      <button
        onClick={() => {
          const event = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true });
          document.dispatchEvent(event);
        }}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-muted-foreground text-xs hover:bg-muted hover:text-foreground transition-colors"
        aria-label="Open command palette"
      >
        <Search size={14} />
        <span>Search...</span>
        <Kbd>Ctrl+K</Kbd>
      </button>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDark(!dark)}
          className="text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px]" // FIX: UX-004
          aria-pressed={dark} // FIX: UX-030
          aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <Sun size={15} /> : <Moon size={15} />}
        </Button>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 gap-2 px-2 text-sm">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <User size={14} className="text-primary" />
                </div>
                <span className="hidden sm:inline max-w-[120px] truncate text-muted-foreground">
                  {user.email}
                </span>
                <ChevronDown size={12} className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="text-xs text-muted-foreground">{user.email}</div>
                <div className="text-xs capitalize text-muted-foreground/60">{user.role}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
});

export default Header;
