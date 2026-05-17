import { useCallback } from "react";
import { useLocation } from "wouter";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "cmdk";
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  User,
  UserCircle,
  Code2,
  Zap,
  Briefcase,
  Award,
  Sparkles,
  ExternalLink,
  Download,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [, navigate] = useLocation();
  const { signOut } = useAuth();
  const { theme, toggle } = useTheme();

  const run = useCallback((action: () => void) => {
    onOpenChange(false);
    action();
  }, [onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} label="Admin command palette">
      <CommandInput placeholder="Search commands..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => run(() => navigate("/admin"))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate("/admin/projects"))}>
            <FolderOpen className="mr-2 h-4 w-4" />
            Projects Manager
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate("/admin/skills"))}>
            <Zap className="mr-2 h-4 w-4" />
            Skills Manager
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate("/admin/experience"))}>
            <Briefcase className="mr-2 h-4 w-4" />
            Experience Manager
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate("/admin/certifications"))}>
            <Award className="mr-2 h-4 w-4" />
            Certifications Manager
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate("/admin/messages"))}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Messages
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate("/admin/hero"))}>
            <Sparkles className="mr-2 h-4 w-4" />
            Edit Hero Section
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate("/admin/about"))}>
            <User className="mr-2 h-4 w-4" />
            Edit About Section
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(() => window.open("/", "_blank"))}>
            <ExternalLink className="mr-2 h-4 w-4" />
            View Portfolio
          </CommandItem>
            <CommandItem onSelect={() => run(() => window.open(`${import.meta.env.VITE_API_URL ?? ""}/api/v1/cv`, "_blank"))}>
            <Download className="mr-2 h-4 w-4" />
            Download CV
          </CommandItem>
          <CommandItem onSelect={() => run(() => toggle())}>
            {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            Toggle Dark/Light Mode
          </CommandItem>
          <CommandItem onSelect={() => run(() => signOut())}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
