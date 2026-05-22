import React, { useState, useEffect, useCallback } from "react";
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

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const navigate = (path: string) => {
    setOpen(false);
    setLocation(path);
  };

  const handleAction = (action: string) => {
    setOpen(false);
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
    <CommandDialog open={open} onOpenChange={setOpen}>
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
