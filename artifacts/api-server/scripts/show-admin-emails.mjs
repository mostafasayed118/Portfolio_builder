/* global process */
/**
 * Prints the configured admin allowlist WITHOUT leaking raw email addresses.
 *
 * Only ever logs `admin count=<n> domains=***@<domain>,...` — full addresses
 * must never appear in stdout/stderr (logs get shipped to aggregators).
 *
 * Reads the server-only `ADMIN_EMAILS` variable. Falls back to the legacy
 * `VITE_ADMIN_EMAILS` with a deprecation warning until the server env rename
 * lands; the fallback never changes what is printed (masked domains only).
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));

for (const envPath of [resolve(scriptDir, "../.env"), resolve(scriptDir, "../../.env")]) {
  if (!existsSync(envPath)) continue;
  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env unreadable — platform env may still provide the values.
  }
}

function readAllowlist() {
  const direct = process.env.ADMIN_EMAILS;
  if (direct !== undefined && direct !== "") return direct;
  const legacy = process.env.VITE_ADMIN_EMAILS;
  if (legacy !== undefined && legacy !== "") {
    process.stderr.write(
      "[show-admin-emails] VITE_ADMIN_EMAILS is deprecated; use server-only ADMIN_EMAILS.\n",
    );
    return legacy;
  }
  return "";
}

const list = readAllowlist()
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

process.stdout.write(
  `admin count=${list.length} domains=${[...new Set(list.map((e) => e.split("@")[1]))].map((d) => "***@" + d).join(",")}\n`,
);
