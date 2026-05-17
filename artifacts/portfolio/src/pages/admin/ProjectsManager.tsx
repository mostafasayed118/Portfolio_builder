import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  ImageIcon, 
  Loader2,
  AlertCircle,
  X,
  ExternalLink,
  Github,
  FolderKanban
} from "lucide-react";
import ImageUpload from "@/components/admin/ImageUpload";
import DragHandle from "@/components/admin/DragHandle";
import EmptyState from "@/components/EmptyState";
import { useDragReorder } from "@/hooks/use-drag-reorder";
import { reorderItems } from "@workspace/db/reorder";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { getSupabase } from "@/lib/supabase-provider";
import { 
  Project,
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  toggleProjectFeatured 
} from "@workspace/db/projects";

const CATEGORIES = [
  "Web App",
  "Mobile",
  "Backend",
  "Full Stack",
  "Data Engineering",
  "Machine Learning",
  "Other"
];

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function TagsInput({ 
  value, 
  onChange 
}: { 
  value: string[]; 
  onChange: (tags: string[]) => void 
}) {
  const [input, setInput] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const tag = input.trim();
      if (tag && !value.includes(tag)) {
        onChange([...value, tag]);
      }
      setInput("");
    }
  };

  const removeTag = (tag: string) => {
    onChange(value.filter(t => t !== tag));
  };

  return (
    <div className="space-y-2">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type tag and press Enter"
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

interface ProjectFormProps {
  project: Project | null;
  open: boolean;
  onClose: () => void;
}

function ProjectForm({ project, open, onClose }: ProjectFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!project;

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    full_description: "",
    challenges: "",
    outcome: "",
    completed_at: "",
    category: "Web App",
    tags: [] as string[],
    image_url: "",
    live_url: "",
    github_url: "",
    featured: false,
    is_published: true,
  });

  const [imageUrls, setImageUrls] = useState<string[]>([""]);

  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title || "",
        slug: project.slug || "",
        description: project.description || "",
        full_description: project.full_description || "",
        challenges: project.challenges || "",
        outcome: project.outcome || "",
        completed_at: project.completed_at || "",
        category: project.category || "Web App",
        tags: project.tags || [],
        image_url: project.image_url || "",
        live_url: project.live_url || "",
        github_url: project.github_url || "",
        featured: project.featured || false,
        is_published: project.is_published ?? true,
      });
      setImageUrls(project.image_url ? [project.image_url] : [""]);
    } else {
      setFormData({
        title: "",
        slug: "",
        description: "",
        full_description: "",
        challenges: "",
        outcome: "",
        completed_at: "",
        category: "Web App",
        tags: [],
        image_url: "",
        live_url: "",
        github_url: "",
        featured: false,
        is_published: true,
      });
      setImageUrls([""]);
    }
  }, [project, open]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const supabase = getSupabase();
      return createProject(supabase, {
        ...data,
        image_url: imageUrls[0] || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "projects"] });
      toast.success("Project created");
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const supabase = getSupabase();
      if (!project?.id) return;
      return updateProject(supabase, project.id, {
        ...data,
        image_url: imageUrls[0] || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "projects"] });
      toast.success("Project updated");
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({ 
      ...prev, 
      title,
      slug: (!isEdit || !prev.slug) ? generateSlug(title) : prev.slug
    }));
  };

  const addImageUrl = () => {
    setImageUrls([...imageUrls, ""]);
  };

  const removeImageUrl = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const updateImageUrl = (index: number, value: string) => {
    const newUrls = [...imageUrls];
    newUrls[index] = value;
    setImageUrls(newUrls);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[600px] max-w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Project" : "Add Project"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Update project details" : "Add a new project to your portfolio"}
          </SheetDescription>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Project title"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Slug *</label>
            <div className="flex gap-2">
              <Input
                value={formData.slug}
                onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="project-slug"
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormData((prev) => ({ ...prev, slug: generateSlug(prev.title) }))}
              >
                Generate
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Category *</label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Short Description *</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description for cards"
              rows={2}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Full Description</label>
            <Textarea
              value={formData.full_description}
              onChange={(e) => setFormData((prev) => ({ ...prev, full_description: e.target.value }))}
              placeholder="Detailed project description"
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Challenges</label>
            <Textarea
              value={formData.challenges}
              onChange={(e) => setFormData((prev) => ({ ...prev, challenges: e.target.value }))}
              placeholder="Technical challenges faced"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Outcome</label>
            <Textarea
              value={formData.outcome}
              onChange={(e) => setFormData((prev) => ({ ...prev, outcome: e.target.value }))}
              placeholder="Results and impact"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Completed At</label>
            <Input
              value={formData.completed_at}
              onChange={(e) => setFormData((prev) => ({ ...prev, completed_at: e.target.value }))}
              placeholder="YYYY-MM"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tags</label>
            <TagsInput
              value={formData.tags}
              onChange={(tags) => setFormData((prev) => ({ ...prev, tags }))}
            />
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium">Images</label>
            {imageUrls.map((url, index) => (
              <ImageUpload
                key={index}
                bucket="projects"
                folder={formData.slug || undefined}
                value={url}
                onChange={(newUrl) => updateImageUrl(index, newUrl)}
                label={index === 0 ? "Thumbnail Image *" : `Image ${index + 1}`}
                hint={index === 0 ? "First image is used as the project thumbnail" : undefined}
                previewSize={index === 0 ? "lg" : "md"}
              />
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addImageUrl}>
              <Plus className="h-4 w-4 mr-1" />
              Add Image
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Live URL</label>
            <Input
              value={formData.live_url}
              onChange={(e) => setFormData((prev) => ({ ...prev, live_url: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">GitHub URL</label>
            <Input
              value={formData.github_url}
              onChange={(e) => setFormData((prev) => ({ ...prev, github_url: e.target.value }))}
              placeholder="https://github.com/..."
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.featured}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, featured: checked }))}
              />
              <label className="text-sm font-medium">Featured</label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_published: checked }))}
              />
              <label className="text-sm font-medium">Published</label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? "Update" : "Create"} Project
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function SkeletonRow() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-12 w-12 rounded" /></TableCell>
      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
      <TableCell><Skeleton className="h-6 w-32" /></TableCell>
      <TableCell><Skeleton className="h-6 w-12" /></TableCell>
      <TableCell><Skeleton className="h-8 w-16" /></TableCell>
    </TableRow>
  );
}

export default function ProjectsManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const { data: projects, isLoading, error } = useQuery<Project[]>({
    queryKey: ["admin", "projects"],
    queryFn: async () => {
      const supabase = getSupabase();
      return listProjects(supabase);
    },
  });

  const {
    orderedItems,
    draggedId,
    dropTargetId,
    dropPosition,
    getDragHandleProps,
    getItemProps,
    moveItem,
    handleDragLeave,
  } = useDragReorder(projects ?? [], async (newItems) => {
    const result = await reorderItems(
      getSupabase(),
      "projects",
      newItems.map((i) => i.id),
    );
    if (!result.success) {
      queryClient.invalidateQueries({ queryKey: ["admin", "projects"] });
      toast.error("Failed to save order — changes reverted");
    } else {
      toast.success("Order saved", { duration: 1500 });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabase();
      await deleteProject(supabase, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "projects"] });
      toast.success("Project deleted");
      setDeleteDialogOpen(false);
      setDeletingProject(null);
    },
  });

  const featuredMutation = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const supabase = getSupabase();
      await toggleProjectFeatured(supabase, id, featured);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "projects"] });
    },
  });

  const filteredProjects = (orderedItems ?? projects ?? []).filter((project) => {
    const matchesSearch = 
      project.title.toLowerCase().includes(search.toLowerCase()) ||
      project.tags?.some((tag: string) => tag.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || project.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }) ?? [];

  const categories = [...new Set(projects?.map(p => p.category).filter(Boolean) as string[] ?? [])];

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setSheetOpen(true);
  };

  const handleAdd = () => {
    setEditingProject(null);
    setSheetOpen(true);
  };

  const handleDelete = (project: Project) => {
    setDeletingProject(project);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingProject?.id) {
      deleteMutation.mutate(deletingProject.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Projects</h1>
          <p className="text-muted-foreground text-sm">
            Manage your portfolio projects
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Project
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium">Failed to load projects</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="border rounded-lg">
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Thumbnail</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
            </TableBody>
          </Table>
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description={search || categoryFilter !== "all" ? "Try adjusting your search or filter." : "Add your first project to showcase your work."}
              actionLabel={!search && categoryFilter === "all" ? "Add your first project" : undefined}
              onAction={!search && categoryFilter === "all" ? handleAdd : undefined}
              compact
            />
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Thumbnail</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project, index) => (
                <TableRow
                  key={project.id}
                  {...getItemProps(project.id)}
                  onDragOver={(e) => getDragHandleProps(project.id).onDragOver(e)}
                  onDrop={(e) => getDragHandleProps(project.id).onDrop(e)}
                  onDragLeave={handleDragLeave}
                  className={
                    project.id === draggedId
                      ? "opacity-50"
                      : dropTargetId === project.id
                        ? dropPosition === "before"
                          ? "border-t-2 border-primary"
                          : "border-b-2 border-primary"
                        : ""
                  }
                >
                  <TableCell className="w-10">
                    <DragHandle
                      dragProps={getDragHandleProps(project.id)}
                      onMoveUp={() => moveItem(project.id, "up")}
                      onMoveDown={() => moveItem(project.id, "down")}
                      isFirst={index === 0}
                      isLast={index === filteredProjects.length - 1}
                    />
                  </TableCell>
                  <TableCell>
                    {project.image_url ? (
                      <img
                        src={project.image_url}
                        alt={project.title}
                        className="h-12 w-12 rounded object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{project.title}</div>
                    <div className="text-sm text-muted-foreground">{project.slug}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{project.category || "Other"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(project.tags ?? []).slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {(project.tags?.length ?? 0) > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{(project.tags?.length ?? 0) - 3} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={project.featured || false}
                      onCheckedChange={(checked) => 
                        featuredMutation.mutate({ id: project.id, featured: checked })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(project)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(project)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ProjectForm
        project={editingProject}
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditingProject(null);
        }}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Delete "{deletingProject?.title}"? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}