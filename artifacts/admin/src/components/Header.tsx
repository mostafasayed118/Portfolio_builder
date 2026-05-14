import { memo } from "react";
import { Menu, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth, useUser, UserButton } from "@clerk/clerk-react";

interface Props {
  onMenuClick: () => void;
}

const Header = memo(function Header({ onMenuClick }: Props) {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <header className="h-16 border-b border-border bg-card flex items-center px-5 gap-4 shrink-0">
      <button
        onClick={onMenuClick}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu size={20} />
      </button>

      <div className="flex-1">
        <span className="text-sm font-medium text-foreground">Admin CMS</span>
        <span className="ml-2 text-xs text-muted-foreground">
          Portfolio Manager
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setDark(!dark)}
        className="text-muted-foreground hover:text-foreground"
      >
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </Button>

      <UserButton afterSignOutUrl="/" />
    </header>
  );
});

export default Header;
