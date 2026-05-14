import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { GripVertical, Save, Eye, EyeOff } from "lucide-react";
import { getSupabase, isSupabaseConfigured } from "@/lib/convex";
import { listSectionSettings, updateSectionSetting, reorderSectionSettings } from "@workspace/db/section-settings";

type Section = { id: string; key: string; label: string; is_visible: boolean; sort_order: number };

export default function SectionOrderManager() {
  const { toast } = useToast();
  const { data } = useQuery({
    queryKey: ["sectionSettings"],
    queryFn: () => listSectionSettings(getSupabase()),
    enabled: isSupabaseConfigured,
  });
  const [sections, setSections] = useState<Section[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setSections([...data].sort((a, b) => a.sort_order - b.sort_order));
  }, [data]);

  const toggleVisible = (id: string, val: boolean) => {
    setSections(s => s.map(x => x.id === id ? { ...x, is_visible: val } : x));
  };

  const handleDragStart = (i: number) => setDragIdx(i);
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    setSections(s => {
      const arr = [...s];
      const [item] = arr.splice(dragIdx, 1);
      arr.splice(i, 0, item);
      return arr;
    });
    setDragIdx(i);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const items = sections.map(({ id }, i) => ({ id, sort_order: i + 1 }));
      await reorderSectionSettings(getSupabase(), items);
      for (const s of sections) {
        const orig = data?.find(d => d.id === s.id);
        if (orig && orig.is_visible !== s.is_visible) {
          await updateSectionSetting(getSupabase(), s.id, { is_visible: s.is_visible });
        }
      }
      toast({ title: "Section order saved" });
    } catch (err) { console.error(err); toast({ title: "Save failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Section Order</h1><p className="text-sm text-muted-foreground mt-0.5">Drag to reorder. Toggle to show/hide.</p></div>
        <Button size="sm" onClick={handleSave} disabled={saving}><Save size={14} className="mr-1.5" />{saving ? "Saving…" : "Save Order"}</Button>
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
              onDragStart={() => handleDragStart(i)}
              onDragOver={e => handleDragOver(e, i)}
              onDragEnd={() => setDragIdx(null)}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-grab active:cursor-grabbing select-none ${
                dragIdx === i ? "border-primary bg-accent shadow-md" : "border-border bg-muted/20 hover:bg-muted/40"
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
