/**
 * check-bundle-size.ts — fail the build when a JS bundle exceeds its size budget
 *
 * Enforces budgets against the built `dist/public/assets/*.js` of the
 * portfolio and admin apps, in **both** raw (uncompressed) and gzip-compressed
 * bytes — gzip is what a browser actually downloads over the wire, raw is what
 * it then has to parse and execute.
 *
 * Three budget groups, each with a raw and a gzip limit:
 *
 *   1. Per chunk  — no single JS file may exceed its ceiling. After splitting
 *      the vendor deps out of the entry chunks, the entries are ~115 KB raw /
 *      ~43 KB gzip (portfolio) and ~138 KB raw / ~41 KB gzip (admin); the
 *      largest remaining chunk is the lazy-loaded recharts analytics bundle
 *      (~369 KB raw / ~97 KB gzip, fetched only when the admin analytics page
 *      is opened).
 *   2. Per app    — the summed bytes of each app must stay under its total
 *      (baselines: portfolio ~1.07 MB raw / ~333 KB gzip, admin ~1.50 MB raw /
 *      ~446 KB gzip).
 *   3. Combined   — the two apps' bytes summed must stay under one cap
 *      (baseline ~2.50 MB raw / ~778 KB gzip).
 *
 * The totals catch gradual bloat ("death by a thousand cuts") that a
 * per-chunk check alone misses.
 *
 * Every budget is overridable via an environment variable, so the pass/fail
 * paths can be exercised locally without editing source:
 *
 *   MAX_JS_KB                per-chunk raw ceiling          (default 400)
 *   MAX_JS_GZIP_KB           per-chunk gzip ceiling         (default 120)
 *   PORTFOLIO_TOTAL_KB       portfolio raw total            (default 1400)
 *   PORTFOLIO_TOTAL_GZIP_KB  portfolio gzip total           (default 450)
 *   ADMIN_TOTAL_KB           admin raw total                (default 2000)
 *   ADMIN_TOTAL_GZIP_KB      admin gzip total               (default 600)
 *   TOTAL_JS_KB              combined raw ceiling           (default 3400)
 *   TOTAL_JS_GZIP_KB         combined gzip ceiling          (default 1050)
 *
 * Usage:
 *   pnpm --filter @workspace/scripts check-bundle-size
 *   MAX_JS_GZIP_KB=90 pnpm --filter @workspace/scripts check-bundle-size  # expect failure
 *
 * The budget logic lives in `evaluateBudgets` (exported, side-effect free) so
 * it is unit-tested directly; the CLI below only wires env + filesystem + exit
 * codes around it. Exit code 0 when every budget is satisfied, 1 otherwise
 * (or when a bundle is missing — run the app build first).
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { logInfo, logError } from "@workspace/logging";

const LOG_CTX = "check-bundle-size";
const KB = 1024;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

// ─── Pure budget logic (unit-tested) ────────────────────────────────────────

export interface AppBudget {
  name: string;
  /** Raw (uncompressed) total limit, in KB. */
  totalKb: number;
  /** gzip-compressed total limit, in KB. */
  totalGzipKb: number;
}

export interface BundleBudgets {
  /** Per-chunk raw ceiling, in KB. */
  maxChunkKb: number;
  /** Per-chunk gzip ceiling, in KB. */
  maxChunkGzipKb: number;
  /** Per-app totals. */
  apps: ReadonlyArray<AppBudget>;
  /** Combined raw ceiling across all apps, in KB. */
  combinedTotalKb: number;
  /** Combined gzip ceiling across all apps, in KB. */
  combinedTotalGzipKb: number;
}

export interface BundledFile {
  /** Owning app name (e.g. "portfolio"). */
  app: string;
  /** File basename (e.g. "index-abc123.js"). */
  name: string;
  /** Raw (uncompressed) size in bytes. */
  bytes: number;
  /** gzip-compressed size in bytes. */
  gzipBytes: number;
}

export interface AppTotal {
  app: string;
  bytes: number;
  gzipBytes: number;
}

export interface BundleCheckOutcome {
  violations: string[];
  appTotals: AppTotal[];
  combinedBytes: number;
  combinedGzipBytes: number;
}

/**
 * Evaluate a set of bundled files against the raw and gzip budgets. Pure: no
 * I/O, no env reads, no process.exit — it only inspects its arguments and
 * returns the outcome, which is what the CLI (and the unit tests) assert on.
 */
export function evaluateBudgets(
  budgets: BundleBudgets,
  files: ReadonlyArray<BundledFile>,
): BundleCheckOutcome {
  const violations: string[] = [];
  const appTotals: AppTotal[] = [];

  for (const app of budgets.apps) {
    const appFiles = files.filter((f) => f.app === app.name);
    if (appFiles.length === 0) {
      violations.push(`${app.name}: no bundled JS files found — run the build first.`);
      continue;
    }

    let totalBytes = 0;
    let totalGzipBytes = 0;
    for (const file of appFiles) {
      totalBytes += file.bytes;
      totalGzipBytes += file.gzipBytes;

      if (file.bytes > budgets.maxChunkKb * KB) {
        violations.push(
          `${app.name}/${file.name} is ${Math.floor(file.bytes / KB)}KB (per-chunk limit: ${budgets.maxChunkKb}KB)`,
        );
      }
      if (file.gzipBytes > budgets.maxChunkGzipKb * KB) {
        violations.push(
          `${app.name}/${file.name} is ${Math.floor(file.gzipBytes / KB)}KB gzip (per-chunk gzip limit: ${budgets.maxChunkGzipKb}KB)`,
        );
      }
    }

    if (totalBytes > app.totalKb * KB) {
      violations.push(
        `${app.name} total JS ${Math.floor(totalBytes / KB)}KB exceeds ${app.totalKb}KB budget`,
      );
    }
    if (totalGzipBytes > app.totalGzipKb * KB) {
      violations.push(
        `${app.name} total JS ${Math.floor(totalGzipBytes / KB)}KB gzip exceeds ${app.totalGzipKb}KB gzip budget`,
      );
    }
    appTotals.push({ app: app.name, bytes: totalBytes, gzipBytes: totalGzipBytes });
  }

  const combinedBytes = appTotals.reduce((sum, t) => sum + t.bytes, 0);
  const combinedGzipBytes = appTotals.reduce((sum, t) => sum + t.gzipBytes, 0);
  if (combinedBytes > budgets.combinedTotalKb * KB) {
    violations.push(
      `combined total JS ${Math.floor(combinedBytes / KB)}KB exceeds ${budgets.combinedTotalKb}KB budget`,
    );
  }
  if (combinedGzipBytes > budgets.combinedTotalGzipKb * KB) {
    violations.push(
      `combined total JS ${Math.floor(combinedGzipBytes / KB)}KB gzip exceeds ${budgets.combinedTotalGzipKb}KB gzip budget`,
    );
  }

  return { violations, appTotals, combinedBytes, combinedGzipBytes };
}

// ─── CLI wiring (env + filesystem + exit) ───────────────────────────────────

/** Per-app budgets. `totalKb` is the default; `totalEnvVar` overrides it. */
const APPS = [
  {
    name: "portfolio",
    totalKb: 1400,
    totalEnvVar: "PORTFOLIO_TOTAL_KB",
    totalGzipKb: 450,
    totalGzipEnvVar: "PORTFOLIO_TOTAL_GZIP_KB",
  },
  {
    name: "admin",
    totalKb: 2000,
    totalEnvVar: "ADMIN_TOTAL_KB",
    totalGzipKb: 600,
    totalGzipEnvVar: "ADMIN_TOTAL_GZIP_KB",
  },
] as const;

const DEFAULT_MAX_CHUNK_KB = 400;
const DEFAULT_MAX_CHUNK_GZIP_KB = 120;
const DEFAULT_TOTAL_JS_KB = 3400;
const DEFAULT_TOTAL_JS_GZIP_KB = 1050;

/** Read a positive-integer budget from the environment, falling back to `fallback`. */
function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    logError(
      `Ignoring invalid ${name}="${raw}" — expected a positive integer; using ${fallback}.`,
      undefined,
      LOG_CTX,
    );
    return fallback;
  }
  return parsed;
}

function scanFiles(app: string): BundledFile[] {
  const dir = resolve(ROOT, "artifacts", app, "dist", "public", "assets");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".js"))
    .map((f) => {
      const full = join(dir, f);
      const buffer = readFileSync(full);
      return { app, name: f, bytes: buffer.length, gzipBytes: gzipSync(buffer).length };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    logInfo("Usage: tsx scripts/src/check-bundle-size.ts [--help]", LOG_CTX);
    logInfo(
      "Budgets are read from MAX_JS_KB, MAX_JS_GZIP_KB, PORTFOLIO_TOTAL_KB, PORTFOLIO_TOTAL_GZIP_KB, ADMIN_TOTAL_KB, ADMIN_TOTAL_GZIP_KB, TOTAL_JS_KB, TOTAL_JS_GZIP_KB.",
      LOG_CTX,
    );
    process.exit(0);
  }

  const budgets: BundleBudgets = {
    maxChunkKb: intEnv("MAX_JS_KB", DEFAULT_MAX_CHUNK_KB),
    maxChunkGzipKb: intEnv("MAX_JS_GZIP_KB", DEFAULT_MAX_CHUNK_GZIP_KB),
    combinedTotalKb: intEnv("TOTAL_JS_KB", DEFAULT_TOTAL_JS_KB),
    combinedTotalGzipKb: intEnv("TOTAL_JS_GZIP_KB", DEFAULT_TOTAL_JS_GZIP_KB),
    apps: APPS.map((a) => ({
      name: a.name,
      totalKb: intEnv(a.totalEnvVar, a.totalKb),
      totalGzipKb: intEnv(a.totalGzipEnvVar, a.totalGzipKb),
    })),
  };

  const files = APPS.flatMap((a) => scanFiles(a.name));

  const outcome = evaluateBudgets(budgets, files);

  for (const total of outcome.appTotals) {
    logInfo(
      `${total.app} total JS: ${Math.floor(total.bytes / KB)}KB (gzip ${Math.floor(total.gzipBytes / KB)}KB)`,
      LOG_CTX,
    );
  }
  logInfo(
    `Combined total JS (portfolio + admin): ${Math.floor(outcome.combinedBytes / KB)}KB (gzip ${Math.floor(outcome.combinedGzipBytes / KB)}KB)`,
    LOG_CTX,
  );

  if (outcome.violations.length === 0) {
    logInfo(
      `✅ Bundle size check passed (per-chunk <= ${budgets.maxChunkKb}KB raw / ${budgets.maxChunkGzipKb}KB gzip; totals within budget).`,
      LOG_CTX,
    );
    process.exit(0);
  }

  logError(`Bundle size regression — ${outcome.violations.length} violation(s):`, undefined, LOG_CTX);
  for (const v of outcome.violations) {
    logError(`   ${v}`, undefined, LOG_CTX);
  }
  logError(
    "Split the offending chunk (dynamic import / Vite manualChunks) or raise the budget deliberately.",
    undefined,
    LOG_CTX,
  );
  process.exit(1);
}

// Run the CLI only when this file is the entry point — importing it (e.g. from
// the unit test) must not read the filesystem or call process.exit.
const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  main();
}
