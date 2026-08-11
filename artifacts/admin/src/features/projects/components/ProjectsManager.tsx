import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { logError } from "@/lib/logger";
import { getErrorMessage } from "@/lib/error-messages";
import { Plus, Pencil, Trash2, Star, AlertCircle, RefreshCw, Search, SearchX, Download } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, Skeleton, useToast } from "@workspace/ui";
import { SmartConfirmDialog } from "@/components/SmartConfirmDialog";
import { useProjectsList } from "@/features/projects/hooks/useProjects";
import { ProjectEditor } from "@/features/projects/components/ProjectEditor";
import { type Project, BLANK_PROJECT } from "@/features/projects/types";
import { exportToCsv } from "@/lib/export-csv";

type ProjectForm = Partial<Project> & { id?: string };

export default function ProjectsManager() {
  const { data: projects, isLoading, isError, error, refetch } = useProjectsList();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<ProjectForm | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredProjects = projects?.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase()) ||
    (p.category ?? "").toLowerCase().includes(search.toLowerCase()) ||
    p.tech_stack?.some(t => t.toLowerCase().includes(search.toLowerCase()))
  ) ?? [];

  const openNew = () => { setIsNew(true); setEditing({ ...BLANK_PROJECT }); };
  const openEdit = (p: Project) => {
    setIsNew(false);
    setEditing({ ...p, live_url: p.live_url ?? "", metrics: p.metrics ?? [] });
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.title?.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (!editing.category?.trim()) { toast({ title: "Category is required", variant: "destructive" }); return; }
    if (!editing.description?.trim()) { toast({ title: "Description is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const { id: editId, ...rest } = editing;
      const baseSlug = rest.title!.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const slug = projects?.some(p => p.id !== editId && p.slug === baseSlug)
        ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;
      const payload = { ...rest, slug, live_url: rest.live_url || null, metrics: rest.metrics ?? [] };
      const res = isNew
        ? await api.projects.create(payload)
        : await api.projects.update(editId!, payload);
      if (!res.success) throw new Error(res.message);
      toast({ title: isNew ? "Project created" : "Project updated" });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setEditing(null);
    } catch (err) { logError("Failed to save project", err, "ProjectsManager"); toast({ title: "Failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" /><Skeleton className="h-10 w-full" />
        <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive font-medium">{getErrorMessage(error)}</p>
        <Button onClick={() => refetch()} variant="outline"><RefreshCw className="h-4 w-4 mr-2" />Try Again</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[120px]">
          <h1 className="text-2xl font-bold">Projects Manager</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filteredProjects.length} projects</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-full sm:w-64 h-9" />
          </div>
          <Button size="sm" variant="outline" onClick={() => projects && exportToCsv(projects.map(p => ({ title: p.title, description: p.description, category: p.category ?? "", tech_stack: (p.tech_stack ?? []).join("; "), featured: p.featured ?? false, is_published: p.is_published ?? true, slug: p.slug ?? "" })), [
            { key: "title", label: "Title" },
            { key: "description", label: "Description" },
            { key: "category", label: "Category" },
            { key: "tech_stack", label: "Tech Stack" },
            { key: "featured", label: "Featured" },
            { key: "is_published", label: "Published" },
            { key: "slug", label: "Slug" },
          ], `projects-${Date.now()}.csv`)}><Download className="h-4 w-4 mr-1.5" />Export</Button>
          <Button size="sm" onClick={openNew} className="min-h-[44px]"><Plus className="h-4 w-4 mr-1.5" />Add Project</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredProjects.map(p => (
          <Card key={p.id} className={!p.is_published ? "opacity-60" : ""}>
            <CardContent className="pt-5 pb-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{p.title}</span>
                  {p.featured && <Star size={12} className="text-yellow-500 fill-yellow-500" />}
                  <Badge variant="outline" className="text-xs">{p.category}</Badge>
                  {!p.is_published && <Badge variant="secondary" className="text-xs">Draft</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {p.tech_stack.slice(0, 5).map((t: string) => <Badge key={t} variant="secondary" className="text-xs px-1.5 py-0">{t}</Badge>)}
                  {p.tech_stack.length > 5 && <Badge variant="secondary" className="text-xs px-1.5 py-0">+{p.tech_stack.length - 5}</Badge>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" aria-label="Edit project" onClick={() => {
                  const { slug: _s, image_url: _i, tags: _t, created_at: _c, updated_at: _u, ...rest } = p;
                  openEdit({ ...rest, category: p.category ?? "", featured: p.featured ?? false, is_published: p.is_published ?? false, github_url: p.github_url ?? "", live_url: p.live_url ?? undefined, metrics: p.metrics ?? [], sort_order: p.sort_order ?? 0 });
                }}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] text-destructive hover:text-destructive hover:bg-destructive/10" aria-label="Delete project" onClick={() => setDeleteId(p.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProjects.length === 0 && search && (
        <div className="text-center py-12">
          <SearchX className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-3 font-medium">No projects matching "{search}"</p>
          <Button variant="outline" size="sm" onClick={() => setSearch("")} className="mt-3 min-h-[44px]">Clear search</Button>
        </div>
      )}

      <ProjectEditor editing={editing} isNew={isNew} saving={saving} onEdit={setEditing} onSaved={handleSave} />

      <SmartConfirmDialog
        state={{
          isOpen: !!deleteId,
          title: "Delete Project",
          message: "This action cannot be undone. The project will be permanently removed.",
          confirmLabel: "Delete",
          variant: "danger",
          onConfirm: async () => {
            if (!deleteId) return;
            try {
              const res = await api.projects.delete(deleteId);
              if (!res.success) throw new Error(res.message);
              toast({ title: "Project deleted" });
              queryClient.invalidateQueries({ queryKey: ["projects"] });
            } catch (err) {
              logError("Failed to delete project", err, "ProjectsManager");
              toast({ title: "Delete failed", variant: "destructive" });
            }
            setDeleteId(null);
          },
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
