// Minimal ImportMeta.env typing for lib/supabase (no dependency on vite/client).
// Merges with vite/client's declarations when compiled from an app.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}