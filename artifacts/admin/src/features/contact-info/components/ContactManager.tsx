import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useState, useEffect } from "react";
import { useToast } from "@workspace/ui";
import { Save } from "lucide-react";
import { logError } from "@/lib/logger";
import { AdminErrorState } from "@/components/AdminErrorState";
import { AdminLoadingState } from "@/components/AdminLoadingState";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from "@workspace/ui";

type ContactData = { email: string; phone: string; location: string; github: string; linkedin: string; youtube: string; facebook: string; whatsapp: string; mapEmbedUrl: string; availabilityStatus: string };
const DEFAULTS: ContactData = { email: "", phone: "", location: "", github: "", linkedin: "", youtube: "", facebook: "", whatsapp: "", mapEmbedUrl: "", availabilityStatus: "Open to opportunities" };

export default function ContactManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["contactInfo"],
    queryFn: async () => {
      const res = await api.contactInfo.get();
      if (!res.success) throw new Error(res.message);
      return res.data;
    },
  });
  const [form, setForm] = useState<ContactData>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm({
      email: data.email ?? "",
      phone: data.phone ?? "",
      location: data.location ?? "",
      github: data.github ?? "",
      linkedin: data.linkedin ?? "",
      youtube: data.youtube ?? "",
      facebook: data.facebook ?? "",
      whatsapp: data.whatsapp ?? "",
      mapEmbedUrl: data.map_embed_url ?? "",
      availabilityStatus: data.availability_status ?? "",
    });
  }, [data]);

  const set = (k: keyof ContactData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.contactInfo.update({
        email: form.email || null,
        phone: form.phone || null,
        location: form.location || null,
        github: form.github || null,
        linkedin: form.linkedin || null,
        youtube: form.youtube || null,
        facebook: form.facebook || null,
        whatsapp: form.whatsapp || null,
        map_embed_url: form.mapEmbedUrl || null,
        availability_status: form.availabilityStatus || null,
      });
      if (!res.success) throw new Error(res.message);
      toast({ title: "Contact info saved" });
      queryClient.invalidateQueries({ queryKey: ["contactInfo"] });
    } catch (err) { logError("Failed to save contact info", err, "ContactManager"); toast({ title: "Save failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const FIELDS: [keyof ContactData, string, string][] = [
    ["email", "Email Address", "mustafasayedsaeed@outlook.com"],
    ["phone", "Phone Number", "+20 100 000 0000"],
    ["location", "Location", "Cairo, Egypt"],
    ["github", "GitHub URL", "https://github.com/…"],
    ["linkedin", "LinkedIn URL", "https://linkedin.com/in/…"],
    ["youtube", "YouTube URL", "https://youtube.com/@…"],
    ["facebook", "Facebook URL", "https://facebook.com/…"],
    ["whatsapp", "WhatsApp Number (optional)", "+201000000000"],
    ["availabilityStatus", "Availability Status", "Open to opportunities"],
  ];

  if (isLoading) return <AdminLoadingState />;

  if (isError) {
    return <AdminErrorState error={error} onRetry={() => refetch()} />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Contact Info</h1><p className="text-sm text-muted-foreground mt-0.5">Links, phone, and availability status.</p></div>
        <Button size="sm" onClick={handleSave} disabled={saving}><Save size={14} className="mr-1.5" />{saving ? "Saving…" : "Save"}</Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Contact Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {FIELDS.map(([k, label, placeholder]) => (
            <div key={k} className="space-y-1.5">
              <Label className="text-xs">{label}</Label>
              <Input value={form[k]} onChange={e => set(k, e.target.value)} placeholder={placeholder} className="h-9 text-sm" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Map Embed (optional)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label className="text-xs">Google Maps Embed URL</Label>
            <Textarea value={form.mapEmbedUrl} onChange={e => set("mapEmbedUrl", e.target.value)} rows={3} placeholder="https://www.google.com/maps/embed?..." className="text-xs font-mono" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
