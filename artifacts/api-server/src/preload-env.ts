import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const envPaths = [
  resolve(__dirname, "../.env"),
  resolve(__dirname, "../../../.env"),
];

for (const envPath of envPaths) {
  try {
    const envContent = readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env file not found — not an error, env vars may be set via platform
  }
}

// Validate required env vars at startup (fail fast)
const REQUIRED_VARS = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "CSRF_SECRET"];
const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  // Don't throw during tests — tests set their own env vars in setup.ts
  const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
  if (!isTest) {
    console.error(`[startup] Missing required environment variables: ${missing.join(", ")}`);
    console.error("[startup] Copy .env.example to .env and fill in your values.");
    process.exit(1);
  }
}
