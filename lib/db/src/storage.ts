import { getSupabase } from "@workspace/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

export type BucketName = "projects" | "certifications" | "avatars" | "documents";

export type UploadResult =
  | { url: string; path: string; error?: never }
  | { url?: never; path?: never; error: string };

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/\.+/g, ".")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

function isSupabaseStorageUrl(url: string): boolean {
  if (!SUPABASE_URL) return false;
  const storageUrl = `${SUPABASE_URL}/storage/v1/object/public/`;
  return url.startsWith(storageUrl);
}

function extractStoragePath(publicUrl: string): string | null {
  if (!SUPABASE_URL) return null;
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/`;
  if (!publicUrl.startsWith(prefix)) return null;
  return publicUrl.slice(prefix.length);
}

export async function uploadFile(
  bucket: BucketName,
  file: File,
  folder?: string,
): Promise<UploadResult> {
  const supabase = getSupabase();
  const sanitized = sanitizeFilename(file.name);
  const timestamp = Date.now();
  const folderPart = folder ? `${folder}/` : "";
  const storagePath = `${folderPart}${timestamp}-${sanitized}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return { error: error.message };
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(storagePath);

  return {
    url: publicUrlData.publicUrl,
    path: storagePath,
  };
}

export async function deleteFile(
  bucket: string,
  path: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getPublicUrl(
  bucket: string,
  path: string,
): Promise<string> {
  const supabase = getSupabase();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadFileWithProgress(
  bucket: BucketName,
  file: File,
  folder: string | undefined,
  onProgress: (pct: number) => void,
): Promise<UploadResult> {
  const supabase = getSupabase();
  const sanitized = sanitizeFilename(file.name);
  const timestamp = Date.now();
  const folderPart = folder ? `${folder}/` : "";
  const storagePath = `${folderPart}${timestamp}-${sanitized}`;

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${storagePath}`;
    const token = supabase.auth.getSession();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
        resolve({ url: data.publicUrl, path: storagePath });
      } else {
        let msg = "Upload failed";
        try {
          const body = JSON.parse(xhr.responseText);
          msg = body.message || body.error || msg;
        } catch {
          msg = xhr.statusText || msg;
        }
        resolve({ error: msg });
      }
    });

    xhr.addEventListener("error", () => {
      resolve({ error: "Network error during upload" });
    });

    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("x-upsert", "false");

    token.then(({ data: { session } }) => {
      if (session?.access_token) {
        xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
      }
      xhr.send(file);
    });
  });
}

export { sanitizeFilename, isSupabaseStorageUrl, extractStoragePath };
