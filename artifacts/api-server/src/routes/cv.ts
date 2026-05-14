import { Router, type IRouter, type Request, type Response } from "express";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getServerSupabase() {
  if (!supabaseUrl) throw new Error("SUPABASE_URL is not set");
  if (!supabaseServiceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const router: IRouter = Router();

router.get("/cv", async (req: Request, res: Response) => {
  const supabase = getServerSupabase();
  const { data: settings, error } = await supabase
    .from("cv_settings")
    .select("object_path, file_name")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    req.log.error({ err: error }, "Error fetching CV settings");
    res.status(500).json({ error: "Failed to fetch CV settings." });
    return;
  }

  if (!settings?.object_path) {
    res.status(404).json({ error: "No CV has been uploaded yet." });
    return;
  }

  try {
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("cv")
      .createSignedUrl(settings.object_path, 60);

    if (signedUrlError || !signedUrlData) {
      req.log.error({ err: signedUrlError }, "Error creating signed URL for CV");
      res.status(500).json({ error: "Failed to generate download URL." });
      return;
    }

    const fileName = settings.file_name ?? "Mustafa_Sayed_Resume.pdf";
    res.redirect(signedUrlData.signedUrl);
  } catch (err) {
    req.log.error({ err }, "Error serving CV");
    res.status(500).json({ error: "Failed to serve CV." });
  }
});

router.get("/cv/settings", async (_req: Request, res: Response) => {
  const supabase = getServerSupabase();
  const { data: settings, error } = await supabase
    .from("cv_settings")
    .select("object_path, file_name, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: "Failed to fetch CV settings." });
    return;
  }

  res.json({
    objectPath: settings?.object_path ?? null,
    fileName: settings?.file_name ?? null,
    updatedAt: settings?.updated_at ?? new Date().toISOString(),
  });
});

router.put("/cv/settings", async (req: Request, res: Response) => {
  const supabase = getServerSupabase();
  const { objectPath, fileName } = req.body as {
    objectPath?: string;
    fileName?: string;
  };

  if (!objectPath || !fileName) {
    res.status(400).json({ error: "objectPath and fileName are required." });
    return;
  }

  const { data: existing } = await supabase
    .from("cv_settings")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("cv_settings")
      .update({
        object_path: objectPath,
        file_name: fileName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      res.status(500).json({ error: "Failed to update CV settings." });
      return;
    }
    res.json({ id: existing.id });
  } else {
    const { data, error } = await supabase
      .from("cv_settings")
      .insert({
        object_path: objectPath,
        file_name: fileName,
      })
      .select("id")
      .single();

    if (error) {
      res.status(500).json({ error: "Failed to save CV settings." });
      return;
    }
    res.json({ id: data?.id });
  }
});

export default router;
