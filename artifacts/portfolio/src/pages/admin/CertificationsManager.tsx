import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2,
  AlertCircle,
  Award,
  ExternalLink,
  Search,
  RefreshCw,
  ScrollText
} from "lucide-react";
import DragHandle from "@/components/admin/DragHandle";
import EmptyState from "@/components/EmptyState";
import { useDragReorder } from "@/hooks/use-drag-reorder";
import { reorderItems } from "@workspace/db/reorder";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ImageUpload from "@/components/admin/ImageUpload";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
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
import { getSupabase } from "@/lib/supabase-provider";
import { 
  Certification,
  fetchCertifications,
  createCertification,
  updateCertification,
  deleteCertification 
} from "@workspace/db/certifications";

const CATEGORY_SUGGESTIONS = [
  "Cloud",
  "Frontend",
  "Backend",
  "DevOps",
  "Data Science",
  "Security",
  "Design",
  "Other"
];

function formatDate(dateStr: string): string {
  const [year, month] = dateStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

interface CertificationFormProps {
  certification: Certification | null;
  open: boolean;
  onClose: () => void;
}

function CertificationForm({ certification, open, onClose }: CertificationFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!certification;

  const [formData, setFormData] = useState({
    title: "",
    issuer: "",
    category: "Cloud",
    date: "",
    cert_url: "",
    image_url: "",
    credential_id: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (certification && open) {
      setFormData({
        title: certification.title || "",
        issuer: certification.issuer || "",
        category: certification.category || "Cloud",
        date: certification.date || "",
        cert_url: certification.cert_url || "",
        image_url: certification.image_url || "",
        credential_id: certification.credential_id || "",
      });
    } else if (!open) {
      setFormData({
        title: "",
        issuer: "",
        category: "Cloud",
        date: "",
        cert_url: "",
        image_url: "",
        credential_id: "",
      });
      setErrors({});
    }
  }, [certification, open]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const supabase = getSupabase();
      return createCertification(supabase, {
        title: data.title,
        issuer: data.issuer,
        category: data.category,
        date: data.date,
        cert_url: data.cert_url || null,
        image_url: data.image_url || null,
        credential_id: data.credential_id || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certifications"] });
      toast.success("Certification created");
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const supabase = getSupabase();
      if (!certification?.id) return;
      return updateCertification(supabase, certification.id, {
        title: data.title,
        issuer: data.issuer,
        category: data.category,
        date: data.date,
        cert_url: data.cert_url || null,
        image_url: data.image_url || null,
        credential_id: data.credential_id || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certifications"] });
      toast.success("Certification updated");
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.issuer.trim()) newErrors.issuer = "Issuer is required";
    if (!formData.category) newErrors.category = "Category is required";
    if (!formData.date) newErrors.date = "Date is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Sanitize optional URL fields before submitting
    const sanitized = {
      ...formData,
      cert_url: formData.cert_url?.trim() || null,
      image_url: formData.image_url?.trim() || null,
      credential_id: formData.credential_id?.trim() || null,
    } as typeof formData;

    if (isEdit) {
      updateMutation.mutate(sanitized);
    } else {
      createMutation.mutate(sanitized);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Certification" : "Add Certification"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update certification details" : "Add a new certification"}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. AWS Solutions Architect"
              required
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Issuer *</label>
            <Input
              value={formData.issuer}
              onChange={(e) => setFormData((prev) => ({ ...prev, issuer: e.target.value }))}
              placeholder="e.g. Amazon Web Services"
              required
            />
            {errors.issuer && <p className="text-xs text-destructive">{errors.issuer}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {CATEGORY_SUGGESTIONS.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Date *</label>
            <Input
              type="month"
              value={formData.date}
              onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
              required
            />
            {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
          </div>

          <ImageUpload
            bucket="certifications"
            value={formData.image_url}
            onChange={(url) => setFormData((prev) => ({ ...prev, image_url: url }))}
            label="Certificate Badge"
            hint="Badge or logo image for this certification"
            previewSize="sm"
          />

          <div className="space-y-2">
            <label className="text-sm font-medium">Certificate URL (optional)</label>
            <Input
              value={formData.cert_url}
              onChange={(e) => setFormData((prev) => ({ ...prev, cert_url: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Credential ID (optional)</label>
            <Input
              value={formData.credential_id}
              onChange={(e) => setFormData((prev) => ({ ...prev, credential_id: e.target.value }))}
              placeholder="e.g. AWS-CERT-12345"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? "Update" : "Add"} Certification
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-8 w-full" />
      </CardContent>
    </Card>
  );
}

export default function CertificationsManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<Certification | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCert, setDeletingCert] = useState<Certification | null>(null);

  const { data: certifications, isLoading, error, refetch } = useQuery<Certification[]>({
    queryKey: ["certifications"],
    queryFn: async () => {
      const supabase = getSupabase();
      return fetchCertifications(supabase);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabase();
      await deleteCertification(supabase, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certifications"] });
      toast.success("Certification deleted");
      setDeleteDialogOpen(false);
      setDeletingCert(null);
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
  } = useDragReorder(certifications ?? [], async (newItems) => {
    const result = await reorderItems(
      getSupabase(),
      "certifications",
      newItems.map((i) => i.id),
    );
    if (!result.success) {
      queryClient.invalidateQueries({ queryKey: ["certifications"] });
      toast.error("Failed to save order — changes reverted");
    } else {
      toast.success("Order saved", { duration: 1500 });
    }
  });

  const uniqueCategories = [...new Set(certifications?.map(c => c.category).filter(Boolean) ?? [])] as string[];

  const filteredCerts = orderedItems?.filter((cert) => {
    const matchesSearch = 
      cert.title.toLowerCase().includes(search.toLowerCase()) ||
      cert.issuer.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "All" || cert.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }) ?? [];

  const handleEdit = (cert: Certification) => {
    setEditingCert(cert);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingCert(null);
    setDialogOpen(true);
  };

  const handleDelete = (cert: Certification) => {
    setDeletingCert(cert);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingCert?.id) {
      deleteMutation.mutate(deletingCert.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Certifications</h1>
          <p className="text-muted-foreground text-sm">
            Manage your certifications
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Certification
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search certifications..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {["All", ...uniqueCategories].map((cat) => (
            <Badge
              key={cat}
              variant={categoryFilter === cat ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium">Failed to load certifications</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredCerts.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={ScrollText}
              title={certifications?.length === 0 ? "No certifications yet" : "No matching certifications"}
              description={
                certifications?.length === 0
                  ? "Add certifications to showcase your credentials."
                  : "Try a different search or filter."
              }
              actionLabel={certifications?.length === 0 ? "Add your first certification" : undefined}
              onAction={certifications?.length === 0 ? handleAdd : undefined}
              compact
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCerts.map((cert, idx) => {
            const hp = getDragHandleProps(cert.id);
            const ip = getItemProps(cert.id);
            const cardClass = [
              "group hover:shadow-md transition-all duration-200",
              draggedId === cert.id ? "opacity-50" : "",
              ip["data-drop-target"] === "before" ? "border-t-2 border-primary" : "",
              ip["data-drop-target"] === "after" ? "border-b-2 border-primary" : "",
            ].filter(Boolean).join(" ");
            return (
            <Card
              key={cert.id}
              className={cardClass}
              onDragOver={(e) => hp.onDragOver(e)}
              onDrop={(e) => hp.onDrop(e)}
              onDragLeave={handleDragLeave}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0 h-16 w-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    {cert.image_url ? (
                      <img
                        src={cert.image_url}
                        alt={cert.issuer}
                        className="h-full w-full object-contain rounded"
                      />
                    ) : (
                      <Award className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold leading-tight">{cert.title}</h3>
                    <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(cert.date)}</p>
                  </div>
                  <DragHandle
                    dragProps={hp}
                    onMoveUp={() => moveItem(cert.id, "up")}
                    onMoveDown={() => moveItem(cert.id, "down")}
                    isFirst={idx === 0}
                    isLast={idx === filteredCerts.length - 1}
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {cert.category && (
                    <Badge variant="secondary" className="text-xs">{cert.category}</Badge>
                  )}
                  {cert.credential_id && (
                    <span className="text-xs text-muted-foreground">{cert.credential_id}</span>
                  )}
                </div>

                <div className="flex items-center gap-1 pt-2 border-t">
                  {cert.cert_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs h-8"
                      asChild
                    >
                      <a href={cert.cert_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                        View Cert ↗
                      </a>
                    </Button>
                  )}
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(cert)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(cert)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      <CertificationForm
        certification={editingCert}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingCert(null);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Certification</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{deletingCert?.title}"? This cannot be undone.
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