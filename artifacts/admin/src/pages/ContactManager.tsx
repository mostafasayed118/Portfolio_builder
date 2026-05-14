import { useQuery } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "@/lib/convex";
import { getContactInfo, upsertContactInfo } from "@workspace/db/contact-info";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

type ContactData = { email: string; phone: string; location: string; github: string; linkedin: string; whatsapp: string; mapEmbedUrl: string; availabilityStatus: string };
const DEFAULTS: ContactData = { email: "", phone: "", location: "", github: "", linkedin: "", whatsapp: "", mapEmbedUrl: "", availabilityStatus: "Open to opportunities" };

export default function ContactManager() {
  const { toast } = useToast();
  const { data } = useQuery({
    queryKey: ["contactInfo"],
    queryFn: () => getContactInfo(getSupabase()),
    enabled: isSupabaseConfigured,
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
      whatsapp: data.whatsapp ?? "",
      mapEmbedUrl: data.map_embed_url ?? "",
      availabilityStatus: data.availability_status ?? "",
    });
  }, [data]);

  const set = (k: keyof ContactData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertContactInfo(getSupabase(), {
        ...form,
        map_embed_url: form.mapEmbedUrl || undefined,
        availability_status: form.availabilityStatus || undefined,
        whatsapp: form.whatsapp || undefined,
      });
      toast({ title: "Contact info saved" });
    } catch (err) { console.error(err); toast({ title: "Save failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const FIELDS: [keyof ContactData, string, string][] = [
    ["email", "Email Address", "mustafasayedsaeed@outlook.com"],
    ["phone", "Phone Number", "+20 100 000 0000"],
    ["location", "Location", "Cairo, Egypt"],
    ["github", "GitHub URL", "https://github.com/…"],
    ["linkedin", "LinkedIn URL", "https://linkedin.com/in/…"],
    ["whatsapp", "WhatsApp Number (optional)", "+201000000000"],
    ["availabilityStatus", "Availability Status", "Open to opportunities"],
  ];

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
