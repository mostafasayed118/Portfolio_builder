import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useState } from "react";
import { useToast } from "@workspace/ui";
import { Plus, Pencil, Trash2, X, Star, Image as ImageIcon, AlertCircle, RefreshCw, Search, Loader2, SearchX, FolderOpen } from "lucide-react";
import ImageUploader from "@/components/ImageUploader";
import { SmartConfirmDialog } from "@/components/SmartConfirmDialog";
import { SmartEmptyState } from "@/components/SmartEmptyState";
import { logError } from "@/lib/logger";
import { getErrorMessage } from "@/lib/error-messages";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label, Skeleton, Switch, Textarea } from "@workspace/ui";

type Project = {
  id: string; title: string; description: string; tech_stack: string[];
  category: string; featured: boolean; github_url: string; live_url?: string;
  metrics?: string[]; sort_order: number; is_published: boolean;
};

const BLANK = {
  title: "", description: "", tech_stack: [] as string[], category: "Data Engineering",
  featured: false, github_url: "", live_url: "", metrics: [] as string[], sort_order: 999, is_published: true,
};

export default function ProjectsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: projects, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.projects.list();
      if (!res.success) throw new Error(res.message);
      return res.data;
    },
  });
  const [editing, setEditing] = useState<typeof BLANK & { id?: string } | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [techInput, setTechInput] = useState("");
  const [metricInput, setMetricInput] = useState("");
  const [projectImages, setProjectImages] = useState<{ id: string; url: string }[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredProjects = projects?.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase()) ||
    (p.category ?? "").toLowerCase().includes(search.toLowerCase()) ||
    p.tech_stack?.some(t => t.toLowerCase().includes(search.toLowerCase()))
  ) ?? [];

  const openNew = () => { setIsNew(true); setEditing({ ...BLANK }); setTechInput(""); setMetricInput(""); };
  const openEdit = (p: Project) => {
    setIsNew(false);
    setEditing({ ...p, live_url: p.live_url ?? "", metrics: p.metrics ?? [] });
    setTechInput(""); setMetricInput("");
  };

  const addTag = (field: "tech_stack" | "metrics", val: string, setter: (v: string) => void) => {
    const v = val.trim();
    if (!v || !editing) return;
    setEditing(e => ({ ...e!, [field]: [...(e![field] as string[]), v] }));
    setter("");
  };
  const removeTag = (field: "tech_stack" | "metrics", val: string) =>
    setEditing(e => ({ ...e!, [field]: (e![field] as string[]).filter(x => x !== val) }));

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.title?.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; } {/* FIX: UX-018 */}
    if (!editing.category?.trim()) { toast({ title: "Category is required", variant: "destructive" }); return; }
    if (!editing.description?.trim()) { toast({ title: "Description is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const { id: editId, ...rest } = editing;
      const baseSlug = rest.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const slug = projects?.some(p => p.id !== editId && p.slug === baseSlug)
        ? `${baseSlug}-${Date.now().toString(36)}`
        : baseSlug;
      const payload = { ...rest, slug, live_url: rest.live_url || null, metrics: rest.metrics?.length ? rest.metrics : undefined };
      let res;
      if (isNew) res = await api.projects.create(payload);
      else res = await api.projects.update(editId!, payload);
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
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive font-medium">{getErrorMessage(error)}</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
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
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full sm:w-64 h-9"
            />
          </div>
          <Button size="sm" onClick={openNew} className="min-h-[44px]"><Plus className="h-4 w-4 mr-1.5" />Add Project</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredProjects.map(p => (
          <Card key={p.id} className={!p.is_published ? "opacity-60" : ""}>
            <CardContent className="pt-5 pb-4 flex items-start gap-4"> {/* FIX: UX-001 */}
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
                <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" aria-label="Edit project" onClick={() => { const { slug: _, image_url: __, tags: ___, created_at: ____, updated_at: _____, ...rest } = p; openEdit({ ...rest, category: p.category ?? "", featured: p.featured ?? false, is_published: p.is_published ?? false, github_url: p.github_url ?? "", live_url: p.live_url ?? undefined, metrics: p.metrics ?? [], sort_order: p.sort_order ?? 0 }); }}><Pencil className="h-4 w-4" /></Button> {/* STANDARDIZED: Type D — inline edit */}
                <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] text-destructive hover:text-destructive hover:bg-destructive/10" aria-label="Delete project" onClick={() => { setDeleteId(p.id); }}><Trash2 className="h-4 w-4" /></Button> {/* STANDARDIZED: Type E — inline delete */}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProjects.length === 0 && search && ( // FIX: UX-021
        <div className="text-center py-12">
          <SearchX className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-3 font-medium">No projects matching "{search}"</p>
          <Button variant="outline" size="sm" onClick={() => setSearch("")} className="mt-3 min-h-[44px]">
            Clear search
          </Button>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isNew ? "Add Project" : "Edit Project"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5"><Label className="text-xs">Title</Label>
                <Input value={editing.title} onChange={e => setEditing(x => ({ ...x!, title: e.target.value }))} className="h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Description</Label>
                <Textarea value={editing.description} onChange={e => setEditing(x => ({ ...x!, description: e.target.value }))} rows={3} /></div>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5"><ImageIcon size={12} /> Project Images</Label>
                <ImageUploader
                  entityType="project"
                  entityId={editing.id}
                  maxFiles={5}
                  existingImages={projectImages}
                  onUploadComplete={(imgs) => setProjectImages(imgs)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Category</Label>
                  <Input value={editing.category} onChange={e => setEditing(x => ({ ...x!, category: e.target.value }))} className="h-8" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Sort Order</Label>
                  <Input type="number" value={editing.sort_order} onChange={e => setEditing(x => ({ ...x!, sort_order: Number(e.target.value) }))} className="h-8" /></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">GitHub URL</Label>
                <Input value={editing.github_url} onChange={e => setEditing(x => ({ ...x!, github_url: e.target.value }))} className="h-8 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Live URL (optional)</Label>
                <Input value={editing.live_url} onChange={e => setEditing(x => ({ ...x!, live_url: e.target.value }))} className="h-8 text-sm" /></div>
              <div className="space-y-2"><Label className="text-xs">Tech Stack</Label>
                <div className="flex flex-wrap gap-1">
                  {editing.tech_stack.map(t => <Badge key={t} variant="secondary" className="flex items-center gap-1 pr-1">{t}<button type="button" onClick={() => removeTag("tech_stack", t)} className="relative flex items-center justify-center h-5 w-5 after:absolute after:inset-[-8px] after:content-['']" aria-label={`Remove technology ${t}`}><X className="h-3 w-3" /></button></Badge>)} {/* STANDARDIZED: Type F — tag remove */}
                </div>
                <div className="flex gap-2">
                  <Input value={techInput} onChange={e => setTechInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag("tech_stack", techInput, setTechInput)} placeholder="Add tech…" className="h-8 text-sm" />
                  <Button size="sm" variant="outline" onClick={() => addTag("tech_stack", techInput, setTechInput)} className="min-h-[44px]" aria-label="Add technology"><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="space-y-2"><Label className="text-xs">Metrics (optional)</Label>
                <div className="flex flex-wrap gap-1">
                  {editing.metrics?.map(m => <Badge key={m} variant="outline" className="flex items-center gap-1 pr-1">{m}<button type="button" onClick={() => removeTag("metrics", m)} className="relative flex items-center justify-center h-5 w-5 after:absolute after:inset-[-8px] after:content-['']" aria-label={`Remove metric ${m}`}><X className="h-3 w-3" /></button></Badge>)}
                </div>
                <div className="flex gap-2">
                  <Input value={metricInput} onChange={e => setMetricInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag("metrics", metricInput, setMetricInput)} placeholder="e.g. 99.9% uptime" className="h-8 text-sm" />
                  <Button size="sm" variant="outline" onClick={() => addTag("metrics", metricInput, setMetricInput)} className="min-h-[44px]" aria-label="Add metric"><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="flex items-center justify-between"><Label className="text-sm">Featured</Label><Switch checked={editing.featured} onCheckedChange={v => setEditing(x => ({ ...x!, featured: v }))} /></div>
              <div className="flex items-center justify-between"><Label className="text-sm">Published</Label><Switch checked={editing.is_published} onCheckedChange={v => setEditing(x => ({ ...x!, is_published: v }))} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
