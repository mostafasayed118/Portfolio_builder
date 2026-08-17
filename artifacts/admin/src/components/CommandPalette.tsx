import React, { useEffect, useRef, useState } from "react";
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
import { Pencil } from "lucide-react";
import { NAV_ITEMS, NAV_GROUPS, QUICK_ACTIONS } from "@/lib/nav-config";
import { api } from "@/lib/api-client";
import type { BlogPost, Project, Skill, Experience, Certification } from "@workspace/supabase/types";

/**
 * Command-palette deep-link convention
 * ------------------------------------
 * Quick actions navigate to an entity page with a URL hash that tells the
 * page what to do on arrival:
 *
 *   <path>#new        — open the create dialog with a blank form
 *                       (e.g. "/projects#new" from "Add New Project")
 *   <path>#edit-<id>  — open the editor for that specific item
 *                       (e.g. "/projects#edit-abc123", used by the dynamic
 *                        "Edit existing item" group below)
 *
 * Consumers: every entity manager (PostsManager, CertificationsManager,
 * ProjectsManager, SkillsManager, ExperienceManager) parses the hash on
 * mount AND on `hashchange` (so re-selecting works while already on the
 * page), opens the matching dialog, then strips the hash via
 * history.replaceState so a refetch after saving can't re-open it.
 *
 * To add a new deep-linking quick action:
 *   1. Add an entry to QUICK_ACTIONS in @/lib/nav-config.
 *   2. Handle its `action` id in handleAction() below, navigating to
 *      `<path>#new` or `<path>#edit-<id>`.
 *   3. Make sure the target page handles that hash (see the managers above).
 *
 * Note: the AI Assistant page uses a separate, unrelated convention —
 * "/ai#<tool-id>" scrolls a tool card into view instead of opening a dialog.
 */

interface EditEntry {
  id: string;
  path: string;
  label: string;
  keywords: string;
}

/** Unwrap both bare-array and paginated { data: [...] } list envelopes. */
function listRows<T>(res: { success: boolean; data?: unknown }): T[] {
  if (!res.success) return [];
  if (Array.isArray(res.data)) return res.data as T[];
  return ((res.data as { data?: T[] } | undefined)?.data ?? []) as T[];
}

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

  /** Resolve the newest unpublished post and deep-link straight to its editor
   *  by id (used by the "Edit Latest Draft" quick action). Falls back to the
   *  new-post editor when no draft exists yet. */
  const openLatestDraft = async () => {
    try {
      const res = await api.posts.list();
      if (!res.success) {
        setLocation("/posts");
        return;
      }
      const posts = res.data?.data ?? [];
      const draft = posts
        .filter((p) => p.is_published !== true)
        .sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        )[0];
      setLocation(draft?.id ? `/posts#edit-${draft.id}` : "/posts#new");
    } catch {
      setLocation("/posts");
    }
  };

  // Existing-content deep links: once the palette opens, load every entity
  // list so typing a name offers "Edit <item>" commands that jump straight
  // to that item's editor via #edit-<id>. The group is only rendered once
  // the user types, so an empty query stays uncluttered.
  const [query, setQuery] = useState("");
  const [editItems, setEditItems] = useState<EditEntry[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const loadSeq = useRef(0);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const seq = ++loadSeq.current;
    setEditLoading(true);
    setEditItems([]);
    (async () => {
      try {
        const [posts, projects, skills, experience, certs] = await Promise.all([
          api.posts.list(),
          api.projects.list(),
          api.skills.list(),
          api.experience.list(),
          api.certifications.list(),
        ]);
        if (seq !== loadSeq.current) return;
        setEditItems([
          ...listRows<BlogPost>(posts).map((p) => ({
            id: p.id, path: "/posts", label: p.title,
            keywords: ["post", "blog", "article", p.title, ...(p.tags ?? [])].join(" "),
          })),
          ...listRows<Project>(projects).map((p) => ({
            id: p.id, path: "/projects", label: p.title,
            keywords: ["project", "portfolio", p.title, p.category ?? ""].join(" "),
          })),
          ...listRows<Skill>(skills).map((s) => ({
            id: s.id, path: "/skills", label: s.name,
            keywords: ["skill", "technology", s.name, s.category ?? ""].join(" "),
          })),
          ...listRows<Experience>(experience).map((e) => ({
            id: e.id, path: "/experience", label: e.title,
            keywords: ["experience", "job", "work", e.title, e.company ?? ""].join(" "),
          })),
          ...listRows<Certification>(certs).map((c) => ({
            id: c.id, path: "/certifications", label: c.title,
            keywords: ["certification", "cert", "credential", c.title, c.issuer ?? ""].join(" "),
          })),
        ]);
      } catch {
        setEditItems([]);
      } finally {
        if (seq === loadSeq.current) setEditLoading(false);
      }
    })();
  }, [open]);

  const handleAction = (action: string) => {
    onOpenChange(false);
    switch (action) {
      case "view-portfolio":
        window.open(import.meta.env.VITE_PORTFOLIO_URL || "/", "_blank");
        break;
      case "add-project":
        // Deep-link straight into the editor — the projects/skills/experience
        // pages auto-open their create dialogs from the #new URL hash.
        setLocation("/projects#new");
        break;
      case "add-skill":
        setLocation("/skills#new");
        break;
      case "add-experience":
        setLocation("/experience#new");
        break;
      case "add-post":
        // Deep-link straight into the New Post editor dialog — the posts
        // page auto-opens its create dialog from the #new URL hash.
        setLocation("/posts#new");
        break;
      case "add-certification":
        setLocation("/certifications#new");
        break;
      case "edit-latest-draft":
        // Resolve the newest unpublished post, then deep-link to its editor.
        void openLatestDraft();
        break;
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Type a command or search..."
        onValueChange={setQuery}
      />
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

        {query.trim().length > 0 && (
          <CommandGroup heading="Edit existing item">
            {editLoading ? (
              <CommandItem disabled>Loading items…</CommandItem>
            ) : editItems.length === 0 ? (
              <CommandItem disabled>No items found</CommandItem>
            ) : (
              editItems.map((item) => (
                <CommandItem
                  key={`${item.path}-${item.id}`}
                  value={`edit ${item.label} ${item.keywords}`}
                  onSelect={() => navigate(`${item.path}#edit-${item.id}`)}
                  className="cursor-pointer"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                </CommandItem>
              ))
            )}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
