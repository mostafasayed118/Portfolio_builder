import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2,
  AlertCircle,
  Code2,
  Cpu,
  Wrench,
  Palette,
  Box,
  Zap
} from "lucide-react";
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
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import SkillMeter from "@/components/SkillMeter";
import { getSupabase } from "@/lib/supabase-provider";
import { 
  Skill,
  listSkills,
  createSkill,
  updateSkill,
  deleteSkill 
} from "@workspace/db/skills";

const CATEGORIES = [
  "Frontend",
  "Backend",
  "DevOps",
  "Tools",
  "Design",
  "Other"
];

function getLevelLabel(level: number): string {
  if (level <= 25) return "Beginner";
  if (level <= 50) return "Intermediate";
  if (level <= 75) return "Advanced";
  return "Expert";
}

function getCategoryIcon(category: string) {
  switch (category.toLowerCase()) {
    case "frontend": return <Code2 className="h-5 w-5" />;
    case "backend": return <Cpu className="h-5 w-5" />;
    case "devops": return <Box className="h-5 w-5" />;
    case "tools": return <Wrench className="h-5 w-5" />;
    case "design": return <Palette className="h-5 w-5" />;
    default: return <Box className="h-5 w-5" />;
  }
}

interface SkillFormProps {
  skill: Skill | null;
  open: boolean;
  onClose: () => void;
}

function SkillForm({ skill, open, onClose }: SkillFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!skill;

  const [formData, setFormData] = useState({
    name: "",
    category: "Frontend",
    proficiency: 50,
    icon: "",
  });

  const [errors, setErrors] = useState<{ name?: string; category?: string }>({});

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
      setFormData({ name: "", category: "Frontend", proficiency: 50, icon: "" });
      setErrors({});
    }
  };

  useState(() => {
    if (skill && open) {
      setFormData({
        name: skill.name || "",
        category: skill.category || "Frontend",
        proficiency: skill.proficiency ?? 50,
        icon: skill.icon || "",
      });
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const supabase = getSupabase();
      return createSkill(supabase, {
        name: data.name,
        category: data.category,
        proficiency: data.proficiency,
        icon: data.icon || null,
        sort_order: 0,
        is_visible: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "skills"] });
      toast.success("Skill created");
      handleOpenChange(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const supabase = getSupabase();
      if (!skill?.id) return;
      return updateSkill(supabase, skill.id, {
        name: data.name,
        category: data.category,
        proficiency: data.proficiency,
        icon: data.icon || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "skills"] });
      toast.success("Skill updated");
      handleOpenChange(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: { name?: string; category?: string } = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.category) newErrors.category = "Category is required";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (isEdit) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Skill" : "Add Skill"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update skill details" : "Add a new skill to your portfolio"}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. React"
              required
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
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
            {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Level: {getLevelLabel(formData.proficiency)}</label>
            <Slider
              value={[formData.proficiency]}
              onValueChange={([value]) => setFormData((prev) => ({ ...prev, proficiency: value }))}
              max={100}
              step={1}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Beginner</span>
              <span>Intermediate</span>
              <span>Advanced</span>
              <span>Expert</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Icon URL (optional)</label>
            <Input
              value={formData.icon}
              onChange={(e) => setFormData((prev) => ({ ...prev, icon: e.target.value }))}
              placeholder="https://... or emoji"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? "Update" : "Add"} Skill
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SkillCard({ 
  skill,
  dragHandleProps,
  isDragging,
  isDropBefore,
  isDropAfter,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onEdit, 
  onDelete,
  onDragOver,
  onDrop,
}: { 
  skill: Skill;
  dragHandleProps: { draggable: boolean; onDragStart: (e: React.DragEvent) => void; onDragOver: (e: React.DragEvent) => void; onDrop: (e: React.DragEvent) => void; onDragEnd: (e: React.DragEvent) => void; "data-drag-id": string };
  isDragging: boolean;
  isDropBefore: boolean;
  isDropAfter: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void; 
  onDelete: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}) {
  const cardClass = [
    "group hover:shadow-md transition-all duration-200 hover:scale-[1.02]",
    isDragging ? "opacity-50" : "",
    isDropBefore ? "border-t-2 border-primary" : "",
    isDropAfter ? "border-b-2 border-primary" : "",
  ].filter(Boolean).join(" ");

  return (
    <Card className={cardClass} onDragOver={onDragOver} onDrop={onDrop}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <DragHandle
              dragProps={dragHandleProps}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              isFirst={isFirst}
              isLast={isLast}
            />
            {skill.icon ? (
              <span className="text-2xl">{skill.icon}</span>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                {getCategoryIcon(skill.category)}
              </div>
            )}
            <div>
              <p className="font-medium">{skill.name}</p>
              <p className="text-xs text-muted-foreground">{skill.category}</p>
            </div>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <SkillMeter label={skill.name} value={skill.proficiency ?? 50} />
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
      </CardContent>
    </Card>
  );
}

export default function SkillsManager() {
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSkill, setDeletingSkill] = useState<Skill | null>(null);

  const { data: skills, isLoading, error } = useQuery<Skill[]>({
    queryKey: ["admin", "skills"],
    queryFn: async () => {
      const supabase = getSupabase();
      return listSkills(supabase);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabase();
      await deleteSkill(supabase, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "skills"] });
      toast.success("Skill deleted");
      setDeleteDialogOpen(false);
      setDeletingSkill(null);
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
  } = useDragReorder(skills ?? [], async (newItems) => {
    const result = await reorderItems(
      getSupabase(),
      "skills",
      newItems.map((i) => i.id),
    );
    if (!result.success) {
      queryClient.invalidateQueries({ queryKey: ["admin", "skills"] });
      toast.error("Failed to save order — changes reverted");
    } else {
      toast.success("Order saved", { duration: 1500 });
    }
  });

  const categories = [...new Set(orderedItems.map(s => s.category).filter(Boolean) ?? [])] as string[];

  const filteredSkills = orderedItems.filter(skill => 
    categoryFilter === "all" || skill.category === categoryFilter
  ) ?? [];

  const groupedSkills = filteredSkills.reduce((acc, skill) => {
    const cat = skill.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  const getCategoryCount = (cat: string) => skills?.filter(s => s.category === cat).length ?? 0;

  const handleEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingSkill(null);
    setDialogOpen(true);
  };

  const handleDelete = (skill: Skill) => {
    setDeletingSkill(skill);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingSkill?.id) {
      deleteMutation.mutate(deletingSkill.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Skills</h1>
          <p className="text-muted-foreground text-sm">
            Manage your technical skills
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Skill
        </Button>
      </div>

      <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="all">
            All {skills ? `(${skills.length})` : ""}
          </TabsTrigger>
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat}>
              {cat} ({getCategoryCount(cat)})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium">Failed to load skills</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : skills?.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Zap}
              title="No skills yet"
              description="Add skills to showcase your technical expertise."
              actionLabel="Add your first skill"
              onAction={handleAdd}
              compact
            />
          </CardContent>
        </Card>
      ) : categoryFilter === "all" ? (
        Object.entries(groupedSkills).map(([category, categorySkills]) => (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              {getCategoryIcon(category)}
              <h2 className="text-lg font-semibold">{category} ({categorySkills.length})</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {categorySkills.map((skill, idx) => {
                const hp = getDragHandleProps(skill.id);
                const ip = getItemProps(skill.id);
                const allSkills = filteredSkills;
                const globalIdx = allSkills.findIndex((s) => s.id === skill.id);
                return (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    dragHandleProps={hp}
                    isDragging={draggedId === skill.id}
                    isDropBefore={ip["data-drop-target"] === "before"}
                    isDropAfter={ip["data-drop-target"] === "after"}
                    isFirst={globalIdx === 0}
                    isLast={globalIdx === allSkills.length - 1}
                    onMoveUp={() => moveItem(skill.id, "up")}
                    onMoveDown={() => moveItem(skill.id, "down")}
                    onEdit={() => handleEdit(skill)}
                    onDelete={() => handleDelete(skill)}
                    onDragOver={(e) => hp.onDragOver(e)}
                    onDrop={(e) => hp.onDrop(e)}
                  />
                );
              })}
            </div>
          </div>
        ))
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredSkills.map((skill, idx) => {
            const hp = getDragHandleProps(skill.id);
            const ip = getItemProps(skill.id);
            return (
              <SkillCard
                key={skill.id}
                skill={skill}
                dragHandleProps={hp}
                isDragging={draggedId === skill.id}
                isDropBefore={ip["data-drop-target"] === "before"}
                isDropAfter={ip["data-drop-target"] === "after"}
                isFirst={idx === 0}
                isLast={idx === filteredSkills.length - 1}
                onMoveUp={() => moveItem(skill.id, "up")}
                onMoveDown={() => moveItem(skill.id, "down")}
                onEdit={() => handleEdit(skill)}
                onDelete={() => handleDelete(skill)}
                onDragOver={(e) => hp.onDragOver(e)}
                onDrop={(e) => hp.onDrop(e)}
              />
            );
          })}
        </div>
      )}

      {filteredSkills.length === 0 && categoryFilter !== "all" && (
        <Card>
          <CardContent>
            <EmptyState
              icon={Zap}
              title="No skills in this category"
              description="Try a different category filter."
              compact
            />
          </CardContent>
        </Card>
      )}

      <SkillForm
        skill={editingSkill}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingSkill(null);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Skill</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{deletingSkill?.name}"? This cannot be undone.
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