/**
 * Print the exact ADMIN_EMAILS allowlist the api-server resolves at runtime.
 *
 * The built server runs from `dist/index.mjs`, where env.ts resolves its two
 * .env paths as `<api-server>/.env` and `<repo-root>/.env` (in that order,
 * each key only set if not already in process.env). This script mirrors those
 * paths, then imports the real env.ts module so the ADMIN_EMAILS ->
 * ADMIN_EMAIL_LIST parsing is the same code the server uses.
 *
 * Usage: node scripts/show-admin-emails.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const apiServerDir = resolve(here, "..");
const repoRoot = resolve(apiServerDir, "..", "..");
// Same relative paths env.ts uses when bundled into dist/.
const envPaths = [resolve(apiServerDir, ".env"), resolve(repoRoot, ".env")];

const loaded = [];
for (const envPath of envPaths) {
  if (!existsSync(envPath)) continue;
  loaded.push(envPath);
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const { env } = await import("../src/lib/env.ts");

console.log(".env files loaded:", loaded.length ? loaded.join(", ") : "(none)");
console.log("process.env.ADMIN_EMAILS:", JSON.stringify(process.env.ADMIN_EMAILS ?? null));
console.log("process.env.VITE_ADMIN_EMAILS:", JSON.stringify(process.env.VITE_ADMIN_EMAILS ?? null));
console.log("env.ADMIN_EMAILS (raw):", JSON.stringify(env.ADMIN_EMAILS));
console.log("env.ADMIN_EMAIL_LIST (allowlist):", JSON.stringify(env.ADMIN_EMAIL_LIST));
