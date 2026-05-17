import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2,
  AlertCircle,
  Building2,
  MapPin,
  Calendar,
  Briefcase
} from "lucide-react";
import DragHandle from "@/components/admin/DragHandle";
import EmptyState from "@/components/EmptyState";
import { useDragReorder } from "@/hooks/use-drag-reorder";
import { reorderItems } from "@workspace/db/reorder";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { getSupabase } from "@/lib/supabase-provider";
import { 
  Experience,
  listExperience,
  createExperience,
  updateExperience,
  deleteExperience 
} from "@workspace/db/experience";

interface ExperienceFormProps {
  experience: Experience | null;
  open: boolean;
  onClose: () => void;
}

function ExperienceForm({ experience, open, onClose }: ExperienceFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!experience;

  const [formData, setFormData] = useState({
    title: "",
    company: "",
    period: "",
    location: "",
    description: "",
    current: false,
  });

  useState(() => {
    if (experience && open) {
      setFormData({
        title: experience.title || "",
        company: experience.company || "",
        period: experience.period || "",
        location: experience.location || "",
        description: (experience.description || []).join("\n"),
        current: experience.current || false,
      });
    } else if (!open) {
      setFormData({
        title: "",
        company: "",
        period: "",
        location: "",
        description: "",
        current: false,
      });
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const supabase = getSupabase();
      return createExperience(supabase, {
        title: data.title,
        company: data.company,
        period: data.period,
        location: data.location,
        description: data.description.split("\n").filter(Boolean),
        current: data.current,
        type: "internship",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "experience"] });
      toast.success("Experience entry created");
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const supabase = getSupabase();
      if (!experience?.id) return;
      return updateExperience(supabase, experience.id, {
        title: data.title,
        company: data.company,
        period: data.period,
        location: data.location,
        description: data.description.split("\n").filter(Boolean),
        current: data.current,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "experience"] });
      toast.success("Experience entry updated");
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

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent className="w-[540px] max-w-full sm:max-w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Experience" : "Add Experience"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Update experience entry" : "Add a new experience to your timeline"}
          </SheetDescription>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Company *</label>
            <Input
              value={formData.company}
              onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))}
              placeholder="Company name"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Role / Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Senior Developer"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Period *</label>
            <Input
              value={formData.period}
              onChange={(e) => setFormData((prev) => ({ ...prev, period: e.target.value }))}
              placeholder="e.g. Jan 2023 – Present"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={formData.current}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, current: checked }))}
            />
            <label className="text-sm font-medium">Currently Working</label>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your role and achievements..."
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Location (optional)</label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
              placeholder="e.g. Cairo, Egypt"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? "Update" : "Add"} Experience
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function SkeletonTimelineCard() {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <Skeleton className="w-3 h-3 rounded-full" />
        <div className="w-0.5 flex-1 bg-muted mt-1" />
      </div>
      <Card className="flex-1 mb-6">
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function ExperienceManager() {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingExperience, setDeletingExperience] = useState<Experience | null>(null);

  const { data: experiences, isLoading, error } = useQuery<Experience[]>({
    queryKey: ["admin", "experience"],
    queryFn: async () => {
      const supabase = getSupabase();
      return listExperience(supabase);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabase();
      await deleteExperience(supabase, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "experience"] });
      toast.success("Experience entry deleted");
      setDeleteDialogOpen(false);
      setDeletingExperience(null);
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
  } = useDragReorder(experiences ?? [], async (newItems) => {
    const result = await reorderItems(
      getSupabase(),
      "experience",
      newItems.map((i) => i.id),
    );
    if (!result.success) {
      queryClient.invalidateQueries({ queryKey: ["admin", "experience"] });
      toast.error("Failed to save order — changes reverted");
    } else {
      toast.success("Order saved", { duration: 1500 });
    }
  });

  const handleEdit = (exp: Experience) => {
    setEditingExperience(exp);
    setSheetOpen(true);
  };

  const handleAdd = () => {
    setEditingExperience(null);
    setSheetOpen(true);
  };

  const handleDelete = (exp: Experience) => {
    setDeletingExperience(exp);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingExperience?.id) {
      deleteMutation.mutate(deletingExperience.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Experience</h1>
          <p className="text-muted-foreground text-sm">
            Manage your work experience timeline
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Experience
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium">Failed to load experience</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-0 pl-1">
          {[...Array(3)].map((_, i) => (
            <SkeletonTimelineCard key={i} />
          ))}
        </div>
      ) : !experiences || experiences.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Briefcase}
              title="No experience yet"
              description="Add your work experience, internships, and roles."
              actionLabel="Add your first role"
              onAction={handleAdd}
              compact
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-0">
          {orderedItems.map((exp, index) => {
            const hp = getDragHandleProps(exp.id);
            const ip = getItemProps(exp.id);
            return (
            <div
              key={exp.id}
              className={`flex gap-4 ${
                draggedId === exp.id ? "opacity-50" : ""
              } ${
                dropTargetId === exp.id
                  ? dropPosition === "before"
                    ? "relative"
                    : "relative"
                  : ""
              }`}
              onDragOver={(e) => hp.onDragOver(e)}
              onDrop={(e) => hp.onDrop(e)}
              onDragLeave={handleDragLeave}
            >
              <div className="flex flex-col items-center">
                <DragHandle
                  dragProps={hp}
                  onMoveUp={() => moveItem(exp.id, "up")}
                  onMoveDown={() => moveItem(exp.id, "down")}
                  isFirst={index === 0}
                  isLast={index === orderedItems.length - 1}
                />
                <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 mt-1 ${
                  exp.current 
                    ? "bg-primary border-primary" 
                    : "bg-background border-muted-foreground"
                }`} />
                {index < orderedItems.length - 1 && (
                  <div className="w-0.5 flex-1 bg-border mt-1" />
                )}
              </div>
              <Card className="flex-1 mb-6 group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{exp.title}</h3>
                        {exp.current && (
                          <Badge variant="default" className="text-xs">Current</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span className="text-sm">{exp.company}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {exp.period}
                        </span>
                        {exp.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {exp.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(exp)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(exp)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {(exp.description ?? []).length > 0 && (
                    <>
                      <div className="border-t my-3" />
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {exp.description.map((line: string, i: number) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          );
          })}
        </div>
      )}

      <ExperienceForm
        experience={editingExperience}
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditingExperience(null);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Experience</AlertDialogTitle>
            <AlertDialogDescription>
              Delete experience at "{deletingExperience?.company}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
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
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}