import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Save, AlertCircle, RefreshCw } from "lucide-react";
import { logError } from "@/lib/logger";

type ContactData = { email: string; phone: string; location: string; github: string; linkedin: string; whatsapp: string; mapEmbedUrl: string; availabilityStatus: string };
const DEFAULTS: ContactData = { email: "", phone: "", location: "", github: "", linkedin: "", whatsapp: "", mapEmbedUrl: "", availabilityStatus: "Open to opportunities" };

export default function ContactManager() {
  const { toast } = useToast();
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
        whatsapp: form.whatsapp || null,
        map_embed_url: form.mapEmbedUrl || null,
        availability_status: form.availabilityStatus || null,
      });
      if (!res.success) throw new Error(res.message);
      toast({ title: "Contact info saved" });
    } catch (err) { logError("Failed to save contact info", err, "ContactManager"); toast({ title: "Save failed", variant: "destructive" }); }
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
