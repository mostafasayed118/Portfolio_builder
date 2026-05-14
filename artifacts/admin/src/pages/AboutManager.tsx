import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Trash2 } from "lucide-react";
import { getSupabase, isSupabaseConfigured } from "@/lib/convex";
import { getAboutContent, upsertAboutContent } from "@workspace/db/about-content";

type Lang = { lang: string; level: string; pct: number };
type AboutData = {
  bio1: string; bio2: string; location: string; yearsOfExperience: number;
  degree: string; school: string; grade: string; educationYears: string;
  languages: Lang[]; isPublished: boolean;
};

const DEFAULTS: AboutData = {
  bio1: "", bio2: "", location: "Cairo, Egypt", yearsOfExperience: 1,
  degree: "B.Sc. Statistics & Computer Science", school: "Ain Shams University",
  grade: "Very Good", educationYears: "2020 – 2024",
  languages: [{ lang: "Arabic", level: "Native", pct: 100 }],
  isPublished: true,
};

export default function AboutManager() {
  const { toast } = useToast();
  const { data } = useQuery({
    queryKey: ["aboutContent"],
    queryFn: () => getAboutContent(getSupabase()),
    enabled: isSupabaseConfigured,
  });
  const [form, setForm] = useState<AboutData>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm({
      bio1: data.bio1, bio2: data.bio2, location: data.location,
      yearsOfExperience: data.years_of_experience, degree: data.degree,
      school: data.school, grade: data.grade, educationYears: data.education_years,
      languages: data.languages as Lang[] ?? [], isPublished: data.is_published,
    });
  }, [data]);

  const set = <K extends keyof AboutData>(k: K, v: AboutData[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const updateLang = (i: number, field: keyof Lang, value: string | number) =>
    set("languages", form.languages.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

  const addLang = () => set("languages", [...form.languages, { lang: "", level: "", pct: 50 }]);
  const removeLang = (i: number) => set("languages", form.languages.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertAboutContent(getSupabase(), {
        bio1: form.bio1,
        bio2: form.bio2,
        location: form.location,
        years_of_experience: form.yearsOfExperience,
        degree: form.degree,
        school: form.school,
        grade: form.grade,
        education_years: form.educationYears,
        languages: form.languages,
        is_published: form.isPublished,
      });
      toast({ title: "About saved" });
    } catch (err) { console.error(err); toast({ title: "Save failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">About Section</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Bio, education, languages, and stats.</p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save size={14} className="mr-1.5" />{saving ? "Saving…" : "Save"}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Bio</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Paragraph 1</Label>
            <Textarea value={form.bio1} onChange={e => set("bio1", e.target.value)} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Paragraph 2</Label>
            <Textarea value={form.bio2} onChange={e => set("bio2", e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Location</Label>
              <Input value={form.location} onChange={e => set("location", e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Years of Experience</Label>
              <Input type="number" value={form.yearsOfExperience} onChange={e => set("yearsOfExperience", Number(e.target.value))} className="h-8 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Education</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {([["degree", "Degree"], ["school", "School"], ["grade", "Grade"], ["educationYears", "Years"]] as [keyof AboutData, string][]).map(([k, label]) => (
            <div key={k} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <Input value={form[k] as string} onChange={e => set(k, e.target.value as never)} className="h-8 text-sm" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Languages</CardTitle>
          <Button size="sm" variant="outline" onClick={addLang}><Plus size={13} className="mr-1" />Add</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.languages.map((lang, i) => (
            <div key={i} className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
              <div className="flex gap-2 items-center">
                <Input value={lang.lang} onChange={e => updateLang(i, "lang", e.target.value)} placeholder="Language" className="h-8 text-sm flex-1" />
                <Input value={lang.level} onChange={e => updateLang(i, "level", e.target.value)} placeholder="Level" className="h-8 text-sm flex-1" />
                <button onClick={() => removeLang(i)} className="text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
              </div>
              <div className="flex items-center gap-3">
                <Slider value={[lang.pct]} min={0} max={100} step={5} onValueChange={([v]) => updateLang(i, "pct", v)} className="flex-1" />
                <span className="text-xs font-mono text-muted-foreground w-8 text-right">{lang.pct}%</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Section Published</Label>
            <Switch checked={form.isPublished} onCheckedChange={v => set("isPublished", v)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
