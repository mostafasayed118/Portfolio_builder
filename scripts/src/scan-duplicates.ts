/**
 * scan-duplicates.ts — Supabase duplicate-row scanner
 *
 * Scans every table in the public schema and reports which ones contain
 * duplicate rows that likely need cleanup.
 *
 * Two detection modes:
 *
 *  1. Singleton tables — the settings tables the app reads via `.limit(1)`
 *     with no user scoping. ANY second row is a duplicate regardless of
 *     content (the app only ever uses one row). The canonical row is the
 *     most recently updated.
 *
 *  2. Generic content fingerprint — for every other table, rows are grouped
 *     by all columns except the audit columns (`id`, `created_at`,
 *     `updated_at`, `deleted_at`). Groups with more than one row are
 *     flagged. `user_id` (when present) is part of the fingerprint, so
 *     identical content belonging to different users is NOT flagged.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts scan-duplicates
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npx tsx scripts/src/scan-duplicates.ts
 *
 * Flags:
 *   --table <name>   only scan one table
 *   --json           machine-readable output (JSON on stdout; use `pnpm -s`
 *                    so the pnpm banner doesn't pollute the pipe)
 *   --allow-duplicates  always exit 0 (default: exit 1 when duplicates found)
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logInfo, logError } from "@workspace/logging";

const LOG_CTX = "scan-duplicates";

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

/** Tables the app treats as singletons (read via `.limit(1)`, no user_id). */
const SINGLETON_TABLES = new Set([
  "site_settings",
  "theme_settings",
  "typography_settings",
  "seo_settings",
  "contact_info",
  "hero_content",
  "about_content",
  "cv_settings",
]);

/**
 * Tables where timestamps are part of the row's identity — append-only event
 * logs / audit trails. Two rows differing only in `created_at` are distinct
 * events, NOT duplicates, so `created_at` stays in the fingerprint here.
 */
const TIMESTAMP_IS_CONTENT = new Set([
  "analytics_events",
  "content_health_reports",
]);

/** Columns that are bookkeeping, not content — never part of the fingerprint. */
const AUDIT_COLUMNS = new Set(["id", "deleted_at"]);

/** Columns excluded from the fingerprint only for non-timestamp tables. */
const TIMESTAMP_COLUMNS = new Set(["created_at", "updated_at"]);

const PAGE_SIZE = 1000; // PostgREST default max rows per request
const MAX_GROUPS_REPORTED = 5; // groups shown per table in human output
const MAX_IDS_SHOWN = 10; // ids shown per group in human output

// ─── Env loading (root .env, falls back to process.env) ─────────────────────

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) env[k] = v;
  }
  const envPath = resolve(ROOT, ".env");
  if (!existsSync(envPath)) return env;
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!env[key]) env[key] = value;
  }
  return env;
}

// ─── Supabase helpers ────────────────────────────────────────────────────────

interface TableInfo {
  name: string;
  columns: string[];
  hasUserId: boolean;
}

async function listTables(
  supabaseUrl: string,
  supabaseKey: string,
): Promise<TableInfo[]> {
  // PostgREST exposes the schema as an OpenAPI doc at /rest/v1/.
  const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });
  if (!res.ok) throw new Error(`Failed to introspect schema: HTTP ${res.status}`);
  const doc = (await res.json()) as { definitions?: Record<string, { properties?: Record<string, unknown> }> };
  const defs = doc.definitions ?? {};
  return Object.entries(defs)
    .map(([name, def]) => {
      const columns = Object.keys(def.properties ?? {});
      return {
        name,
        columns,
        hasUserId: columns.includes("user_id"),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Fetch ALL rows of a table, paging past PostgREST's 1000-row cap. */
async function fetchAllRows<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data as T[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

function contentFingerprint(
  row: Record<string, unknown>,
  columns: string[],
  table: string,
): string {
  const content: Record<string, unknown> = {};
  const timestampsAreContent = TIMESTAMP_IS_CONTENT.has(table);
  for (const col of columns) {
    if (AUDIT_COLUMNS.has(col)) continue;
    // For event-log tables the timestamp IS the row's identity — keep it.
    // For content tables the timestamp is bookkeeping — drop it so two rows
    // with identical content but different save times are still flagged.
    if (!timestampsAreContent && TIMESTAMP_COLUMNS.has(col)) continue;
    content[col] = row[col];
  }
  // Stable serialization (sorted keys) so equal objects hash identically.
  const sorted = JSON.stringify(content, Object.keys(content).sort());
  return createHash("sha256").update(sorted).digest("hex");
}

interface DuplicateGroup {
  count: number;
  fingerprint: string;
  sample: Record<string, unknown>; // one representative row (audit columns included)
  ids: string[];
}

interface TableReport {
  table: string;
  isSingleton: boolean;
  rowCount: number;
  duplicateGroups: DuplicateGroup[];
  extraRows: number;
  keepIds: string[]; // singleton mode: id of the most recently updated row
  needsCleanup: boolean;
}

// ─── Per-table scan ──────────────────────────────────────────────────────────

function scanTable(
  info: TableInfo,
  rows: Record<string, unknown>[],
): TableReport {
  if (SINGLETON_TABLES.has(info.name)) {
    const report: TableReport = {
      table: info.name,
      isSingleton: true,
      rowCount: rows.length,
      duplicateGroups: [],
      extraRows: Math.max(0, rows.length - 1),
      keepIds: [],
      needsCleanup: rows.length > 1,
    };
    if (rows.length > 1) {
      const sorted = [...rows].sort(
        (a, b) =>
          String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")),
      );
      report.keepIds = [String(sorted[0].id)];
      report.duplicateGroups = [
        {
          count: rows.length,
          fingerprint: "singleton",
          sample: sorted[0],
          ids: rows.map((r) => String(r.id)),
        },
      ];
    }
    return report;
  }

  const groups = new Map<string, DuplicateGroup>();
  for (const row of rows) {
    const fp = contentFingerprint(row, info.columns, info.name);
    const existing = groups.get(fp);
    if (existing) {
      existing.count += 1;
      existing.ids.push(String(row.id));
    } else {
      groups.set(fp, {
        count: 1,
        fingerprint: fp,
        sample: row,
        ids: [String(row.id)],
      });
    }
  }

  const duplicateGroups = [...groups.values()]
    .filter((g) => g.count > 1)
    .sort((a, b) => b.count - a.count);

  return {
    table: info.name,
    isSingleton: false,
    rowCount: rows.length,
    duplicateGroups,
    extraRows: duplicateGroups.reduce((sum, g) => sum + (g.count - 1), 0),
    keepIds: [],
    needsCleanup: duplicateGroups.length > 0,
  };
}

// ─── Output ──────────────────────────────────────────────────────────────────

function describeContent(row: Record<string, unknown>, info: TableInfo): string {
  const contentCols = info.columns.filter((c) => !AUDIT_COLUMNS.has(c));
  const shown: string[] = [];
  for (const col of contentCols) {
    const v = row[col];
    if (v === null || v === undefined || v === "") continue;
    let s = typeof v === "string" ? v : JSON.stringify(v);
    if (s.length > 60) s = `${s.slice(0, 57)}…`;
    shown.push(`${col}=${s}`);
  }
  const preview = shown.join(", ") || "(all null)";
  return preview.length > 180 ? `${preview.slice(0, 177)}…` : preview;
}

function printHuman(
  reports: TableReport[],
  infos: Map<string, TableInfo>,
): void {
  const dirty = reports.filter((r) => r.needsCleanup);
  logInfo(`=== Supabase duplicate scan: ${reports.length} tables ===`, LOG_CTX);

  for (const rep of reports) {
    if (!rep.needsCleanup) continue;
    const info = infos.get(rep.table);
    if (!info) continue;
    logInfo(`❌ ${rep.table} (${rep.rowCount} rows) — ${rep.extraRows} extra row(s) to remove`, LOG_CTX);
    for (const group of rep.duplicateGroups.slice(0, MAX_GROUPS_REPORTED)) {
      if (rep.isSingleton) {
        logInfo(`   singleton table — ${group.count} rows exist; app uses only one`, LOG_CTX);
        logInfo(`   KEEP: ${rep.keepIds[0]} (most recently updated)`, LOG_CTX);
        logInfo(`   DELETE: ${group.ids.filter((id) => id !== rep.keepIds[0]).join(", ")}`, LOG_CTX);
        logInfo(`   content: ${describeContent(group.sample, info)}`, LOG_CTX);
      } else {
        const shown = group.ids.slice(0, MAX_IDS_SHOWN);
        const extra = group.ids.length - shown.length;
        logInfo(`   duplicate group (${group.count} identical rows)`, LOG_CTX);
        logInfo(`   ids: ${shown.join(", ")}${extra > 0 ? `, … +${extra} more` : ""}`, LOG_CTX);
        logInfo(`   content: ${describeContent(group.sample, info)}`, LOG_CTX);
      }
    }
    const hidden = rep.duplicateGroups.length - MAX_GROUPS_REPORTED;
    if (hidden > 0) logInfo(`   … and ${hidden} more group(s)`, LOG_CTX);
    logInfo("", LOG_CTX);
  }

  if (dirty.length === 0) {
    logInfo("✅ No duplicate rows found in any table.", LOG_CTX);
  } else {
    logInfo(`⚠️  ${dirty.length} table(s) need cleanup:`, LOG_CTX);
    for (const rep of dirty) {
      logInfo(`   - ${rep.table} (${rep.extraRows} extra rows)`, LOG_CTX);
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

function parseFlags(argv: string[]): {
  table: string | null;
  json: boolean;
  allowDuplicates: boolean;
} {
  let table: string | null = null;
  let json = false;
  let allowDuplicates = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--table" && argv[i + 1]) {
      table = argv[++i];
    } else if (arg === "--json") {
      json = true;
    } else if (arg === "--allow-duplicates") {
      allowDuplicates = true;
    } else    if (arg === "--help" || arg === "-h") {
      logInfo("Usage: tsx scripts/src/scan-duplicates.ts [--table <name>] [--json] [--allow-duplicates]", LOG_CTX);
      process.exit(0);
    }
  }
  return { table, json, allowDuplicates };
}

async function main(): Promise<void> {
  const { table, json, allowDuplicates } = parseFlags(process.argv.slice(2));
  const env = loadEnv();
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    logError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (set them in .env or the environment).", undefined, LOG_CTX);
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const infos = new Map<string, TableInfo>();
  for (const info of await listTables(url, key)) {
    if (table && info.name !== table) continue;
    infos.set(info.name, info);
  }

  if (infos.size === 0) {
    logError(`no tables found${table ? ` matching "${table}"` : ""}.`, undefined, LOG_CTX);
    process.exit(1);
  }

  const reports: TableReport[] = [];
  for (const info of infos.values()) {
    try {
      const rows = await fetchAllRows<Record<string, unknown>>(supabase, info.name);
      reports.push(scanTable(info, rows));
      // Progress goes to stderr so --json stdout stays machine-clean.
      process.stderr.write(`[scan] ${info.name}: ${rows.length} rows scanned\n`);
    } catch (err) {
      process.stderr.write(`[scan] ${info.name}: FAILED — ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  if (json) {
    const payload = reports.map((r) => ({
      table: r.table,
      isSingleton: r.isSingleton,
      rowCount: r.rowCount,
      extraRows: r.extraRows,
      needsCleanup: r.needsCleanup,
      keepIds: r.keepIds,
      duplicateGroups: r.duplicateGroups.map((g) => ({
        count: g.count,
        ids: g.ids,
        sample: g.sample,
      })),
    }));
    // Machine-readable stdout — must stay pure JSON (the wrapper would
    // prefix it in dev mode, so write the stream directly).
    process.stdout.write(JSON.stringify({ scannedTables: reports.length, tables: payload }, null, 2) + "\n");
  } else {
    printHuman(reports, infos);
  }

  const needsCleanup = reports.some((r) => r.needsCleanup);
  if (needsCleanup && !allowDuplicates) {
    process.exit(1);
  }
}

await main();
