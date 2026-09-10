/**
 * check-ts-twin.ts — fail the build when the portfolio contains bare JS
 *
 * Policy: the portfolio is a TypeScript-only codebase. Every `.js`/`.jsx`
 * file that exists in the app tree must have a tracked `.ts`/`.tsx` twin
 * (same basename, e.g. `foo.js` → `foo.ts` or `foo.tsx`). A JS file with
 * no tracked TS twin means plain JavaScript slipped into the TypeScript
 * codebase — either a stray file, a vendored script, or a build artifact
 * that should live elsewhere.
 *
 * What counts as a "twin": for a `.js` file, a tracked file with the same
 * basename ending in `.ts` or `.tsx`. For `.jsx`, the same (`.ts` or
 * `.tsx`). The twin must be TRACKED in git — an untracked TS file on disk
 * doesn't count, so this also catches "I wrote the TS but never committed
 * it" states.
 *
 * Directories that are never application source are skipped: `node_modules`,
 * `dist`, `.vercel`, `.replit-artifact`, `testsprite_tests`, and anything
 * hidden (dot-prefixed). `public/` is exempt too: Vite copies it verbatim
 * and serves it as-is (service workers, manifests, favicons), so a `.ts`
 * twin there would never be compiled or served — plain JS in `public/` is
 * legitimate, not a TypeScript-policy violation.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts check-ts-twin
 *   pnpm --filter @workspace/scripts check-ts-twin --json
 *
 * Exit code 0 when clean, 1 when any bare JS file is found.
 */

import {
  existsSync,
  readdirSync,
  statSync,
} from "node:fs";
import { resolve, dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { logInfo, logError } from "@workspace/logging";

const LOG_CTX = "check-ts-twin";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const PORTFOLIO = resolve(ROOT, "artifacts", "portfolio");

/** Directories that are build output or tooling, never application source. */
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  ".vercel",
  ".replit-artifact",
  "testsprite_tests",
]);

interface Finding {
  file: string; // repo-relative path of the offending .js/.jsx file
  twin: string | null; // tracked twin that should exist, or null if none possible
}

const findings: Finding[] = [];

// ─── Walk the tree ───────────────────────────────────────────────────────────

function isHidden(name: string): boolean {
  return name.startsWith(".");
}

function walkJsFiles(dir: string, out: string[]): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (isHidden(entry) || SKIP_DIRS.has(entry)) continue;
    // public/ is served verbatim — see the header comment for why the twin
    // policy doesn't apply to it.
    if (entry === "public") continue;
    if (statSync(full).isDirectory()) {
      walkJsFiles(full, out);
    } else if (/\.(js|jsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

// ─── Twin resolution ─────────────────────────────────────────────────────────

/** Candidate twin paths for a JS file: same basename with .ts / .tsx. */
function twinCandidates(jsFile: string): string[] {
  const base = jsFile.replace(/\.(js|jsx)$/, "");
  return [`${base}.ts`, `${base}.tsx`];
}

function trackedTsFiles(): Set<string> {
  try {
    const out = execFileSync("git", ["ls-files", "artifacts/portfolio"], {
      cwd: ROOT,
      encoding: "utf-8",
    });
    const set = new Set<string>();
    for (const line of out.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/\.(ts|tsx)$/.test(trimmed)) set.add(trimmed.replace(/\//g, sep));
    }
    return set;
  } catch {
    // Not inside a git repo (e.g. a tarball build) — fall back to scanning
    // the filesystem so the check still works.
    return new Set<string>();
  }
}

function checkPortfolio(): void {
  const jsFiles = walkJsFiles(PORTFOLIO, []);
  const tracked = trackedTsFiles();
  const fallback = tracked.size === 0; // git unavailable — use on-disk scan

  for (const jsFile of jsFiles) {
    const rel = relative(ROOT, jsFile).replace(/\//g, sep);
    const candidates = twinCandidates(rel);
    const exists = fallback
      ? candidates.some((c) => existsSync(resolve(ROOT, c)))
      : candidates.some((c) => tracked.has(c));
    if (!exists) {
      findings.push({ file: rel, twin: candidates[0] });
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main(): void {
  const json = process.argv.includes("--json");

  if (!existsSync(PORTFOLIO)) {
    logInfo("⚠️  artifacts/portfolio not found — skipping TS-twin check.", LOG_CTX);
    process.exit(0);
  }

  checkPortfolio();

  if (findings.length === 0) {
    logInfo("✅ No bare .js/.jsx files — every JS file has a tracked .ts/.tsx twin.", LOG_CTX);
    process.exit(0);
  }

  if (json) {
    // Machine-readable stdout — must stay pure JSON (the wrapper would
    // prefix it in dev mode, so write the stream directly).
    process.stdout.write(JSON.stringify({ violations: findings.length, files: findings }, null, 2) + "\n");
    process.exit(1);
  }

  logError(`${findings.length} .js/.jsx file(s) without a tracked .ts/.tsx twin:`, undefined, LOG_CTX);
  for (const f of findings) {
    logError(`   ${f.file}`, undefined, LOG_CTX);
    logError(`     expected twin: ${f.twin} (tracked in git)`, undefined, LOG_CTX);
  }
  logError("The portfolio is a TypeScript-only codebase. Convert the file to TypeScript (or remove it) and commit the .ts/.tsx twin.", undefined, LOG_CTX);
  process.exit(1);
}

main();
