import React from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@workspace/ui";
import { NAV_ITEMS, NAV_GROUPS, QUICK_ACTIONS } from "@/lib/nav-config";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Controlled search palette — the shell (SearchPalette) owns the open state
 * and the Ctrl/Cmd+K shortcut, mirroring the ShortcutsHelp/ShortcutsDialog
 * split. This component only renders the dialog and its navigation.
 */
export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [, setLocation] = useLocation();

  const navigate = (path: string) => {
    onOpenChange(false);
    setLocation(path);
  };

  const handleAction = (action: string) => {
    onOpenChange(false);
    switch (action) {
      case "view-portfolio":
        window.open(import.meta.env.VITE_PORTFOLIO_URL || "/", "_blank");
        break;
      case "add-project":
        setLocation("/projects");
        break;
      case "add-skill":
        setLocation("/skills");
        break;
      case "add-experience":
        setLocation("/experience");
        break;
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>No results found.</CommandEmpty>

        {NAV_GROUPS.map((group) => (
          <React.Fragment key={group}>
            <CommandGroup heading={group}>
              {NAV_ITEMS.filter(i => i.group === group).map((item) => (
                <CommandItem
                  key={item.path}
                  value={`${item.label} ${item.keywords.join(" ")}`}
                  onSelect={() => navigate(item.path)}
                  className="cursor-pointer"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </React.Fragment>
        ))}

        <CommandGroup heading="Quick Actions">
          {QUICK_ACTIONS.map((item) => (
            <CommandItem
              key={item.action}
              value={`${item.label} ${item.keywords.join(" ")}`}
              onSelect={() => handleAction(item.action)}
              className="cursor-pointer"
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
