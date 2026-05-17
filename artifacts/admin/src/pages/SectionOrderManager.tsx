import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { GripVertical, Save, RotateCcw, Eye, EyeOff, AlertCircle, RefreshCw } from "lucide-react";
import { api } from "@/lib/api-client";
import { logError } from "@/lib/logger";

type Section = { id: string; key: string; label: string; is_visible: boolean; sort_order: number };

export default function SectionOrderManager() {
  const { toast } = useToast();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["sectionSettings"],
    queryFn: async () => {
      const res = await api.sectionSettings.list();
      if (!res.success) throw new Error(res.message);
      return res.data;
    },
  });
  const [sections, setSections] = useState<Section[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const originalDataRef = useRef<Section[]>([]);

  useEffect(() => {
    if (data && originalDataRef.current.length === 0) {
      const sorted = [...data].sort((a, b) => a.sort_order - b.sort_order);
      setSections(sorted);
      originalDataRef.current = sorted;
    }
  }, [data]);

  const toggleVisible = (id: string, val: boolean) => {
    setSections(s => s.map(x => x.id === id ? { ...x, is_visible: val } : x));
  };

  const handleDragStart = (_i: number, id: string) => setDragId(id);
  const handleDragOver = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (!dragId) return;
    setSections(s => {
      const fromIdx = s.findIndex(x => x.id === dragId);
      if (fromIdx === -1 || fromIdx === targetIdx) return s;
      const arr = [...s];
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(targetIdx, 0, item);
      return arr;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const items = sections.map(({ id }, i) => ({ id, sort_order: i + 1 }));
      const visChanges = sections
        .filter(s => originalDataRef.current.find(o => o.id === s.id)?.is_visible !== s.is_visible)
        .map(s => ({ id: s.id, is_visible: s.is_visible }));

      const reorderRes = await api.sectionSettings.reorder(items);
      if (!reorderRes.success) throw new Error(reorderRes.message);
      for (const v of visChanges) {
        const updateRes = await api.sectionSettings.update(v.id, { is_visible: v.is_visible });
        if (!updateRes.success) throw new Error(updateRes.message);
      }

      originalDataRef.current = [...sections];
      toast({ title: "Section order saved" });
    } catch (err) { logError("Failed to save section order", err, "SectionOrderManager"); toast({ title: "Save failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleReset = () => {
    if (originalDataRef.current.length > 0) {
      setSections([...originalDataRef.current]);
      toast({ title: "Reset to saved state" });
    }
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
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Section Order</h1><p className="text-sm text-muted-foreground mt-0.5">Drag to reorder. Toggle to show/hide.</p></div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleReset} disabled={saving || sections.length === 0}>
            <RotateCcw size={14} className="mr-1.5" />Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}><Save size={14} className="mr-1.5" />{saving ? "Saving…" : "Save Order"}</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Portfolio Sections</CardTitle>
          <CardDescription className="text-xs">Drag the grip to reorder. Changes apply to the live portfolio.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {sections.map((section, i) => (
            <div
              key={section.id}
              draggable
              onDragStart={() => handleDragStart(i, section.id)}
              onDragOver={e => handleDragOver(e, i)}
              onDragEnd={() => setDragId(null)}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-grab active:cursor-grabbing select-none ${
                dragId === section.id ? "border-primary bg-accent shadow-md" : "border-border bg-muted/20 hover:bg-muted/40"
              } ${!section.is_visible ? "opacity-50" : ""}`}
            >
              <GripVertical size={16} className="text-muted-foreground shrink-0" />
              <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {i + 1}
              </div>
              <span className="flex-1 text-sm font-medium">{section.label}</span>
              <div className="flex items-center gap-2 shrink-0">
                {section.is_visible ? <Eye size={14} className="text-muted-foreground" /> : <EyeOff size={14} className="text-muted-foreground/40" />}
                <Switch
                  checked={section.is_visible}
                  onCheckedChange={v => toggleVisible(section.id, v)}
                  onClick={e => e.stopPropagation()}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
