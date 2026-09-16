// Minimal ImportMeta.env typing for lib/app-infra (no dependency on
// vite/client). Merges with vite/client's declarations when compiled
// from an app.
interface ImportMetaEnv {
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
