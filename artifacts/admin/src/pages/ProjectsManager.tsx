import { useQuery } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { listProjects, createProject, updateProject, deleteProject } from "@workspace/db/projects";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Star, Image as ImageIcon, AlertCircle, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ImageUploader from "@/components/ImageUploader";
import { logError } from "@/lib/logger";

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
  const { data: projects, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["projects"],
    queryFn: () => listProjects(getSupabase()),
    enabled: isSupabaseConfigured,
  });
  const [editing, setEditing] = useState<typeof BLANK & { id?: string } | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [techInput, setTechInput] = useState("");
  const [metricInput, setMetricInput] = useState("");
  const [projectImages, setProjectImages] = useState<{ id: string; url: string }[]>([]);

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
    setSaving(true);
    try {
      const { id: editId, ...rest } = editing;
      const slug = rest.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const payload = { ...rest, slug, live_url: rest.live_url || null, metrics: rest.metrics?.length ? rest.metrics : undefined };
      if (isNew) await createProject(getSupabase(), payload);
      else await updateProject(getSupabase(), editId!, payload);
      toast({ title: isNew ? "Project created" : "Project updated" });
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
        <p className="text-destructive font-medium">Failed to load data</p>
        <p className="text-muted-foreground text-sm">{error?.message}</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects Manager</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{projects?.length ?? 0} projects</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1.5" />Add Project</Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {projects?.map(p => (
          <Card key={p.id} className={!p.is_published ? "opacity-60" : ""}>
            <CardContent className="pt-4 pb-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{p.title}</span>
                  {p.featured && <Star size={12} className="text-yellow-500 fill-yellow-500" />}
                  <Badge variant="outline" className="text-xs">{p.category}</Badge>
                  {!p.is_published && <Badge variant="secondary" className="text-xs">Draft</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {p.tech_stack.slice(0, 5).map(t => <Badge key={t} variant="secondary" className="text-xs px-1.5 py-0">{t}</Badge>)}
                  {p.tech_stack.length > 5 && <Badge variant="secondary" className="text-xs px-1.5 py-0">+{p.tech_stack.length - 5}</Badge>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { const { slug: _, image_url: __, tags: ___, created_at: ____, updated_at: _____, ...rest } = p; openEdit({ ...rest, category: p.category ?? "", featured: p.featured ?? false, is_published: p.is_published ?? false, github_url: p.github_url ?? "", live_url: p.live_url ?? undefined, metrics: p.metrics ?? [], sort_order: p.sort_order ?? 0 }); }}><Pencil size={13} /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => { if (!confirm("Delete?")) return; try { await deleteProject(getSupabase(), p.id); toast({ title: "Deleted" }); } catch (err) { logError("Failed to delete project", err, "ProjectsManager"); toast({ title: "Delete failed", variant: "destructive" }); } }}><Trash2 size={13} /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
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
                  {editing.tech_stack.map(t => <Badge key={t} variant="secondary" className="flex items-center gap-1 pr-1">{t}<button onClick={() => removeTag("tech_stack", t)}><X size={10} /></button></Badge>)}
                </div>
                <div className="flex gap-2">
                  <Input value={techInput} onChange={e => setTechInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag("tech_stack", techInput, setTechInput)} placeholder="Add tech…" className="h-8 text-sm" />
                  <Button size="sm" variant="outline" onClick={() => addTag("tech_stack", techInput, setTechInput)}><Plus size={12} /></Button>
                </div>
              </div>
              <div className="space-y-2"><Label className="text-xs">Metrics (optional)</Label>
                <div className="flex flex-wrap gap-1">
                  {editing.metrics?.map(m => <Badge key={m} variant="outline" className="flex items-center gap-1 pr-1">{m}<button onClick={() => removeTag("metrics", m)}><X size={10} /></button></Badge>)}
                </div>
                <div className="flex gap-2">
                  <Input value={metricInput} onChange={e => setMetricInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag("metrics", metricInput, setMetricInput)} placeholder="e.g. 99.9% uptime" className="h-8 text-sm" />
                  <Button size="sm" variant="outline" onClick={() => addTag("metrics", metricInput, setMetricInput)}><Plus size={12} /></Button>
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
    </div>
  );
}
