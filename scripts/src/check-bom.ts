/**
 * check-bom.ts — fail the build when a UTF-8 BOM would reach Vercel env or a bundle
 *
 * A BOM (bytes EF BB BF / U+FEFF) is invisible in most editors but corrupts the
 * data it prefixes:
 *
 *   - An env var whose value starts with U+FEFF silently breaks everything that
 *     consumes it — `VITE_SITE_URL` becomes `\uFEFFhttps://…`, breaking CORS,
 *     Clerk auth, and QR codes with no obvious error.
 *   - A bundle asset (index.html, a copied public/ file) that starts with a BOM
 *     ships a non-standard first byte to the deployed SPA.
 *
 * This script scans three sources:
 *
 *   1. Env files — every `.env*` file at the repo root and inside `artifacts/`
 *      (file-level BOM, plus an inline U+FEFF in any line).
 *   2. Ambient environment — `process.env` values that start with U+FEFF
 *      (catches a BOM pasted into a CI secret or Vercel env var).
 *   3. Bundles — every file under each app's `dist` and `public` folders,
 *      plus the SPA entry `index.html` files, whose content starts with BOM
 *      bytes. Public files are copied verbatim into the bundle, so a BOM
 *      there ships to production.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts check-bom           # env + bundle scan
 *   pnpm --filter @workspace/scripts check-bom --env-only
 *   pnpm --filter @workspace/scripts check-bom --bundle-only
 *   pnpm --filter @workspace/scripts check-bom --fix     # strip BOMs (env + HTML only)
 *
 * Exit code 0 when clean, 1 when any BOM is found (unless --fix removed them).
 */

import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { resolve, dirname, join, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { logInfo, logError } from "@workspace/logging";

const LOG_CTX = "check-bom";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

interface Finding {
  kind: "env-file" | "env-line" | "env-var" | "bundle";
  file: string;
  detail: string;
}

const findings: Finding[] = [];

function hasFileBom(raw: Buffer): boolean {
  return raw.length >= 3 && raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
}

function stripFileBom(raw: Buffer): Buffer {
  return hasFileBom(raw) ? raw.subarray(3) : raw;
}

// ─── Env files ───────────────────────────────────────────────────────────────

function envFiles(): string[] {
  const candidates: string[] = [
    resolve(ROOT, ".env"),
    resolve(ROOT, ".env.local"),
    resolve(ROOT, ".env.production"),
    resolve(ROOT, ".env.example"),
  ];
  const artifactsDir = resolve(ROOT, "artifacts");
  if (existsSync(artifactsDir)) {
    for (const app of readdirSync(artifactsDir)) {
      candidates.push(
        resolve(artifactsDir, app, ".env"),
        resolve(artifactsDir, app, ".env.local"),
        resolve(artifactsDir, app, ".env.example"),
      );
    }
  }
  return candidates.filter((p) => existsSync(p) && statSync(p).isFile());
}

function checkEnvFile(file: string): void {
  const raw = readFileSync(file);
  if (hasFileBom(raw)) {
    findings.push({ kind: "env-file", file, detail: "file starts with a UTF-8 BOM" });
  }
  const text = raw.toString("utf-8");
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (line.includes("\uFEFF")) {
      findings.push({
        kind: "env-line",
        file,
        detail: `line ${i + 1} contains an inline U+FEFF: ${line.replace(/\uFEFF/g, "␣BOM").slice(0, 60)}`,
      });
    }
  });
}

function checkProcessEnv(): void {
  for (const [key, value] of Object.entries(process.env)) {
    if (value && value.startsWith("\uFEFF")) {
      findings.push({
        kind: "env-var",
        file: "(process.env)",
        detail: `${key} value starts with U+FEFF — this silently corrupts the value`,
      });
    }
  }
}

// ─── Bundle files ────────────────────────────────────────────────────────────

function walk(dir: string, out: string[]): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

function checkBundleFile(file: string): void {
  const raw = readFileSync(file);
  if (hasFileBom(raw)) {
    findings.push({ kind: "bundle", file: relative(ROOT, file), detail: "file starts with a UTF-8 BOM and would ship in the bundle" });
  }
}

function bundleFiles(): string[] {
  const out: string[] = [];
  const artifactsDir = resolve(ROOT, "artifacts");
  if (!existsSync(artifactsDir)) return out;

  for (const app of readdirSync(artifactsDir)) {
    const dist = resolve(artifactsDir, app, "dist");
    if (existsSync(dist)) walk(dist, out);

    const pub = resolve(artifactsDir, app, "public");
    if (existsSync(pub)) walk(pub, out);

    const html = resolve(artifactsDir, app, "index.html");
    if (existsSync(html)) out.push(html);
  }
  return out;
}

// ─── Fix (local utility only — CI never runs --fix) ─────────────────────────

function applyFix(): void {
  for (const f of findings) {
    if (f.kind === "env-var") continue; // can't rewrite process.env
    const file = isAbsolute(f.file) ? f.file : resolve(ROOT, f.file);
    if (!existsSync(file) || statSync(file).isDirectory()) continue;
    const raw = readFileSync(file);
    if (f.kind === "env-line") {
      const fixed = raw.toString("utf-8").replace(/\uFEFF/g, "");
      writeFileSync(file, fixed, "utf-8");
    } else {
      writeFileSync(file, stripFileBom(raw));
    }
  }
  logInfo(`Stripped BOMs from ${findings.length} file(s).`, LOG_CTX);
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main(): void {
  const args = process.argv.slice(2);
  const envOnly = args.includes("--env-only");
  const bundleOnly = args.includes("--bundle-only");
  const fix = args.includes("--fix");

  if (!bundleOnly) {
    for (const f of envFiles()) checkEnvFile(f);
    checkProcessEnv();
  }
  if (!envOnly) {
    for (const f of bundleFiles()) checkBundleFile(f);
  }

  if (findings.length === 0) {
    logInfo("✅ No UTF-8 BOMs found in env files, env vars, or bundles.", LOG_CTX);
    process.exit(0);
  }

  if (fix) {
    applyFix();
    process.exit(0);
  }

  logError(`${findings.length} UTF-8 BOM(s) found:`, undefined, LOG_CTX);
  for (const f of findings) {
    logError(`   [${f.kind}] ${f.file} — ${f.detail}`, undefined, LOG_CTX);
  }
  logError("Fix them with: pnpm --filter @workspace/scripts check-bom --fix", undefined, LOG_CTX);
  process.exit(1);
}

main();
