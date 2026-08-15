/**
 * check-duplication.ts — fail the build when code is duplicated across the codebase
 *
 * Two detectors:
 *
 *   1. Same-purpose files — two files whose normalized content is ~identical
 *      (unique-line containment >= 0.8 with at least 30 shared lines). This is
 *      the classic "copied a component instead of importing it" case: a
 *      component reimplemented in another app, a duplicated hook, a copied
 *      middleware. If the two copies serve the same purpose, one of them
 *      should import the other (or the shared piece should live in a lib).
 *
 *   2. Duplicate code blocks — runs of >= 10 identical significant lines that
 *      appear in two or more files. Catches partial copy-paste: a block that
 *      was pasted into a larger, otherwise-different file.
 *
 * Scope: application source only — the src trees under each artifact and
 * lib package, plus the top-level middleware.ts files (Vercel edge
 * functions). Test files, test scaffolding, generated types, configs, build
 * output, and the shadcn/ui primitives (which intentionally share Radix
 * boilerplate) are excluded.
 *
 * Allowlist: the SPA middleware + CSP builder pairs (admin <-> portfolio, and
 * the same-app middleware <-> csp.ts twins). Vercel compiles each app's
 * middleware.ts standalone with its own esbuild pass, so the middleware and
 * its csp.ts helper must stay self-contained per app (the earlier CSP work
 * deliberately inlined them). The CSP directives are also app-specific (Clerk
 * origins vs Turnstile/OpenStreetMap). Plus the per-app logger entry points,
 * which must wire Vite's import.meta.env.DEV themselves.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts check-duplication
 *   pnpm --filter @workspace/scripts check-duplication --json
 *   pnpm --filter @workspace/scripts check-duplication --include-tests
 *   pnpm --filter @workspace/scripts check-duplication --limit 10
 *
 * Exit code 0 when clean, 1 when any duplication is found.
 */

import {
  readdirSync,
  statSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { resolve, dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { logInfo, logError } from "@workspace/logging";

const LOG_CTX = "check-duplication";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "coverage",
  ".vercel",
  ".replit-artifact",
  "testsprite_tests",
  ".turbo",
  ".tmp-img",
  "skills", // unrelated embedded training assets, not part of the product
  "test", // test scaffolding — run with --include-tests to scan it
  "__tests__",
]);

// Walk each artifact/lib root (which also covers the top-level
// middleware.ts Vercel edge functions); collectFiles keeps only
// src/** files and middleware.ts, deduping paths visited twice.
const SCOPE_ROOTS = [
  resolve(ROOT, "artifacts", "admin"),
  resolve(ROOT, "artifacts", "portfolio"),
  resolve(ROOT, "artifacts", "api-server"),
  resolve(ROOT, "lib", "ui"),
  resolve(ROOT, "lib", "db"),
  resolve(ROOT, "lib", "logging"),
  resolve(ROOT, "lib", "supabase"),
  resolve(ROOT, "lib", "validation"),
  resolve(ROOT, "lib", "auth"),
];

// Intentional duplicates that must stay separate:
//   - Vercel edge middleware + its csp.ts twin: Vercel compiles each app's
//     middleware.ts standalone, so the middleware and its CSP builder must
//     stay self-contained per app (the earlier CSP work deliberately inlined
//     them). CSP directives are app-specific (Clerk vs Turnstile origins).
//   - The per-app logger entry points: each app must wire
//     `import.meta.env.DEV` itself (Vite-specific), which the framework-
//     agnostic @workspace/logging lib deliberately cannot do.
const ALLOWED_PAIRS: [string, string][] = [
  ["artifacts/admin/middleware.ts", "artifacts/portfolio/middleware.ts"],
  ["artifacts/admin/src/lib/csp.ts", "artifacts/portfolio/src/lib/csp.ts"],
  ["artifacts/admin/middleware.ts", "artifacts/admin/src/lib/csp.ts"],
  ["artifacts/portfolio/middleware.ts", "artifacts/portfolio/src/lib/csp.ts"],
  ["artifacts/admin/src/lib/logger.ts", "artifacts/portfolio/src/lib/logger.ts"],
];

const WINDOW = 8; // significant lines per duplicate-block window
const MIN_RUN = 10; // min duplicate-block run length to report
const MIN_FILE_LINES = 30; // min significant lines for file-level comparison
const FILE_SIM = 0.8; // min unique-line containment for same-purpose files
const MIN_COMMON = 30; // min shared lines for same-purpose files

interface FileFinding {
  kind: "file";
  a: string;
  b: string;
  sharedLines: number;
  similarity: number;
}

interface BlockFinding {
  kind: "block";
  a: string;
  aLines: string;
  b: string;
  bLines: string;
  lines: number;
}

type Finding = FileFinding | BlockFinding;

const findings: Finding[] = [];

// ─── Collection ──────────────────────────────────────────────────────────────

function isHidden(name: string): boolean {
  return name.startsWith(".");
}

function walkTs(dir: string, out: string[]): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (isHidden(entry) || SKIP_DIRS.has(entry)) continue;
    if (statSync(full).isDirectory()) {
      walkTs(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function collectFiles(includeTests: boolean): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const root of SCOPE_ROOTS) {
    if (!existsSync(root) || !statSync(root).isDirectory()) continue;
    for (const f of walkTs(root, [])) {
      const rel = relative(ROOT, f).split(sep).join("/");
      // Keep only app source: files under a src dir, plus edge middleware.
      if (!rel.includes("/src/") && !rel.endsWith("/middleware.ts")) continue;
      if (rel.startsWith("lib/ui/src/components/primitives/")) continue; // never scan primitives
      const isTest =
        /(\.test|\.spec)\.(ts|tsx)$/.test(rel) ||
        rel.includes("/test/") ||
        rel.includes("/__tests__/");
      if (isTest && !includeTests) continue;
      if (/\.d\.ts$/.test(rel) || /\.config\.(ts|tsx)$/.test(rel)) continue;
      if (seen.has(f)) continue;
      seen.add(f);
      out.push(f);
    }
  }
  return out;
}

/** Normalized significant lines: no comments, no import/export/blank/pure-punctuation. */
function sigLines(file: string): string[] {
  const src = readFileSync(file, "utf-8").replace(/\r\n/g, "\n");
  const out: string[] = [];
  for (const raw of src.split("\n")) {
    const line = raw
      .replace(/\/\/.*$/, "")
      .trim()
      .replace(/\s+/g, " ");
    if (!line) continue;
    if (/^(import|export)\b/.test(line)) continue;
    if (/^[{}();,[\]]+$/.test(line)) continue;
    out.push(line);
  }
  return out;
}

function isCodeLine(line: string): boolean {
  return /[a-zA-Z0-9_$]/.test(line);
}

function rel(file: string): string {
  return relative(ROOT, file).split(sep).join("/");
}

function isAllowedPair(a: string, b: string): boolean {
  const ra = rel(a);
  const rb = rel(b);
  return ALLOWED_PAIRS.some(
    ([x, y]) => (ra === x && rb === y) || (ra === y && rb === x),
  );
}

// ─── Detector 1: same-purpose files ──────────────────────────────────────────

function detectSamePurposeFiles(files: string[], sigs: string[][]): void {
  for (let i = 0; i < files.length; i++) {
    if (sigs[i].length < MIN_FILE_LINES) continue;
    const uniqA = new Set(sigs[i]);
    for (let j = i + 1; j < files.length; j++) {
      if (sigs[j].length < MIN_FILE_LINES) continue;
      if (isAllowedPair(files[i], files[j])) continue;
      const uniqB = new Set(sigs[j]);
      let common = 0;
      for (const line of uniqA) if (uniqB.has(line)) common++;
      if (common < MIN_COMMON) continue;
      const sim = common / Math.min(uniqA.size, uniqB.size);
      if (sim >= FILE_SIM) {
        findings.push({
          kind: "file",
          a: rel(files[i]),
          b: rel(files[j]),
          sharedLines: common,
          similarity: Math.round(sim * 100),
        });
      }
    }
  }
}

// ─── Detector 2: duplicate code blocks ───────────────────────────────────────

interface FileLines {
  sig: string[];
  orig: number[]; // original 1-based line number per significant line
}

function detectDuplicateBlocks(files: string[], sigs: string[][]): void {
  const data: FileLines[] = files.map((f, i) => {
    const orig: number[] = [];
    const src = readFileSync(f, "utf-8").replace(/\r\n/g, "\n");
    const rawLines = src.split("\n");
    for (let idx = 0; idx < rawLines.length; idx++) {
      const line = rawLines[idx]
        .replace(/\/\/.*$/, "")
        .trim()
        .replace(/\s+/g, " ");
      if (!line) continue;
      if (/^(import|export)\b/.test(line)) continue;
      if (/^[{}();,[\]]+$/.test(line)) continue;
      orig.push(idx + 1);
    }
    return { sig: sigs[i], orig };
  });

  // hash -> locations [fileIdx, startSigLine]
  const map = new Map<string, [number, number][]>();
  data.forEach((d, fi) => {
    for (let i = 0; i + WINDOW <= d.sig.length; i++) {
      const key = d.sig.slice(i, i + WINDOW).join("\u0001");
      const locs = map.get(key);
      if (locs) locs.push([fi, i]);
      else map.set(key, [[fi, i]]);
    }
  });

  const seen = new Set<string>();
  for (const locs of map.values()) {
    if (locs.length < 2) continue;
    // One representative window per file (adjacent windows overlap).
    const reps: [number, number][] = [];
    for (const [fi, start] of locs) {
      const last = reps[reps.length - 1];
      if (last && last[0] === fi && start === last[1] + 1) continue;
      reps.push([fi, start]);
    }
    for (let a = 0; a < reps.length; a++) {
      for (let b = a + 1; b < reps.length; b++) {
        const [fa, sa] = reps[a];
        const [fb, sb] = reps[b];
        if (fa === fb) continue;
        if (isAllowedPair(files[fa], files[fb])) continue;
        // Extend the run backward and forward.
        let startA = sa;
        let startB = sb;
        while (
          startA > 0 && startB > 0 &&
          data[fa].sig[startA - 1] === data[fb].sig[startB - 1]
        ) { startA--; startB--; }
        let endA = sa + WINDOW;
        let endB = sb + WINDOW;
        while (
          endA < data[fa].sig.length && endB < data[fb].sig.length &&
          data[fa].sig[endA] === data[fb].sig[endB]
        ) { endA++; endB++; }
        const len = endA - startA;
        if (len < MIN_RUN) continue;
        let code = 0;
        for (let i = startA; i < endA; i++) if (isCodeLine(data[fa].sig[i])) code++;
        if (code === 0) continue;
        const key = [fa, fb, startA, endA].sort((x, y) => x - y).join(":");
        if (seen.has(key)) continue;
        seen.add(key);
        findings.push({
          kind: "block",
          a: rel(files[fa]),
          aLines: `lines ${data[fa].orig[startA]}–${data[fa].orig[endA - 1]}`,
          b: rel(files[fb]),
          bLines: `lines ${data[fb].orig[startB]}–${data[fb].orig[endB - 1]}`,
          lines: len,
        });
      }
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main(): void {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const includeTests = args.includes("--include-tests");
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx !== -1 && args[limitIdx + 1]
    ? Number.parseInt(args[limitIdx + 1], 10) || 25
    : 25;

  const files = collectFiles(includeTests);
  if (files.length === 0) {
    logInfo("⚠️  No source files found in scope — skipping duplication check.", LOG_CTX);
    process.exit(0);
  }

  const sigs = files.map(sigLines);
  detectSamePurposeFiles(files, sigs);
  detectDuplicateBlocks(files, sigs);

  if (findings.length === 0) {
    logInfo("✅ No same-purpose components or duplicate code blocks found.", LOG_CTX);
    process.exit(0);
  }

  // Sort: file-level (biggest dedup win) first, then blocks by size.
  findings.sort((x, y) => {
    if (x.kind === "file" && y.kind === "file") return y.sharedLines - x.sharedLines;
    if (x.kind === "block" && y.kind === "block") return y.lines - x.lines;
    return x.kind === "file" ? -1 : 1;
  });

  const shown = findings.slice(0, limit);

  if (json) {
    process.stdout.write(JSON.stringify({
      violations: findings.length,
      shown: shown.length,
      findings: shown,
    }, null, 2) + "\n");
    process.exit(1);
  }

  logError(`${findings.length} duplication violation(s) found (showing ${shown.length}):`, undefined, LOG_CTX);
  for (const f of shown) {
    if (f.kind === "file") {
      logError(`  [same-purpose] ${f.a} <=> ${f.b} — ${f.sharedLines} shared lines (${f.similarity}% similar)`, undefined, LOG_CTX);
    } else {
      logError(`  [block] ${f.aLines} in ${f.a} <=> ${f.bLines} in ${f.b} — ${f.lines} duplicated lines`, undefined, LOG_CTX);
    }
  }
  if (findings.length > shown.length) {
    logError(`  … and ${findings.length - shown.length} more (use --limit to raise the cap)`, undefined, LOG_CTX);
  }
  logError(
    "Deduplicate: extract the shared piece into a lib (e.g. lib/ui) and import it from both places. " +
    "If a pair is intentional and cannot be shared, it must be added to ALLOWED_PAIRS with a comment explaining why.",
    undefined,
    LOG_CTX,
  );
  process.exit(1);
}

main();
