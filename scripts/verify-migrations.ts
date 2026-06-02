/**
 * verify-migrations.ts — TASK-015 Migration Verification Script
 *
 * Reads all .sql files from supabase/migrations/ and reports:
 * - Total count and numbered range
 * - Gaps in numbering sequence
 * - Corrective migrations (filenames containing fix/correct/patch/hotfix)
 * - Purpose of each corrective migration (from first comment line)
 *
 * Usage: npx tsx scripts/verify-migrations.ts
 */

import { readdirSync, readFileSync } from "node:fs";
import { resolve, join, basename } from "node:path";

// ─── Config ──────────────────────────────────────────────────────────────────

const MIGRATIONS_DIR = resolve(
  import.meta.dirname ?? ".",
  "..",
  "supabase",
  "migrations",
);

const CORRECTIVE_KEYWORDS = ["fix", "correct", "patch", "hotfix"] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface MigrationInfo {
  filename: string;
  number: number;
  isCorrective: boolean;
  correctiveKeyword: string | null;
  firstComment: string | null;
}

function parseMigrationNumber(filename: string): number | null {
  const match = filename.match(/^(\d{3})_/);
  return match ? parseInt(match[1], 10) : null;
}

function isCorrective(filename: string): { flag: boolean; keyword: string | null } {
  const lower = filename.toLowerCase();
  for (const kw of CORRECTIVE_KEYWORDS) {
    if (lower.includes(kw)) {
      return { flag: true, keyword: kw };
    }
  }
  return { flag: false, keyword: null };
}

function extractFirstComment(filepath: string): string | null {
  try {
    const content = readFileSync(filepath, "utf-8");
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and decorative comment borders (===, ---)
      if (!trimmed || /^[--/*\s-=]+$/.test(trimmed)) continue;
      if (trimmed.startsWith("--")) {
        // Strip leading "-- " and decorative characters
        const comment = trimmed
          .replace(/^--\s*/, "")
          .replace(/^[\s-=]+|[\s-=]+$/g, "")
          .trim();
        if (comment && comment.length > 3) return comment;
      }
      // If we hit a non-comment line, stop
      if (!trimmed.startsWith("--")) break;
    }
  } catch {
    // File read error — ignore
  }
  return null;
}

function findGaps(numbers: number[]): [number, number][] {
  const gaps: [number, number][] = [];
  const sorted = [...numbers].sort((a, b) => a - b);

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (curr - prev > 1) {
      gaps.push([prev + 1, curr - 1]);
    }
  }
  return gaps;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main(): void {
  console.log("=== Migration Verification (TASK-015) ===\n");

  // Read migration directory
  let files: string[];
  try {
    files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));
  } catch (err) {
    console.error(`ERROR: Cannot read migrations directory: ${MIGRATIONS_DIR}`);
    console.error(err);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error("ERROR: No .sql files found in migrations directory.");
    process.exit(1);
  }

  // Sort by filename
  files.sort();

  // Parse each migration
  const migrations: MigrationInfo[] = [];
  const numbers: number[] = [];

  for (const file of files) {
    const num = parseMigrationNumber(file);
    if (num === null) {
      console.warn(`WARN: ${file} has no numeric prefix — skipping numbering.`);
      continue;
    }

    const { flag, keyword } = isCorrective(file);
    const fullPath = join(MIGRATIONS_DIR, file);
    const firstComment = flag ? extractFirstComment(fullPath) : null;

    migrations.push({
      filename: file,
      number: num,
      isCorrective: flag,
      correctiveKeyword: keyword,
      firstComment,
    });
    numbers.push(num);
  }

  // ─── Summary ─────────────────────────────────────────────────────────────

  const total = migrations.length;
  const minNum = Math.min(...numbers);
  const maxNum = Math.max(...numbers);
  const gaps = findGaps(numbers);
  const corrective = migrations.filter((m) => m.isCorrective);

  console.log(`Total migrations: ${total}`);
  console.log(`Numbered range:   ${String(minNum).padStart(3, "0")} — ${String(maxNum).padStart(3, "0")}`);
  console.log(`Expected count:   ${maxNum - minNum + 1} (if no gaps)`);

  // Gaps
  if (gaps.length === 0) {
    console.log(`Gaps:             None`);
  } else {
    console.log(`Gaps:             ${gaps.length} gap(s) found:`);
    for (const [from, to] of gaps) {
      const label = from === to
        ? `0${from}`.slice(-3)
        : `0${from}`.slice(-3) + "–" + `0${to}`.slice(-3);
      console.log(`                  - ${label} (${to - from + 1} missing)`);
    }
  }

  // Corrective migrations
  console.log(`\n--- Corrective Migrations (${corrective.length}) ---\n`);

  if (corrective.length === 0) {
    console.log("  None found.");
  } else {
    // Table header
    const hdr = [
      "#".padStart(3),
      "File".padEnd(48),
      "Keyword".padEnd(10),
      "Purpose",
    ].join(" | ");
    console.log(hdr);
    console.log("-".repeat(hdr.length + 4));

    for (const m of corrective) {
      const num = String(m.number).padStart(3, "0");
      const kw = (m.correctiveKeyword ?? "").padEnd(10);
      const purpose = m.firstComment ?? "(no comment found)";
      console.log(`${num} | ${m.filename.padEnd(48)} | ${kw} | ${purpose}`);
    }
  }

  // Full listing
  console.log(`\n--- All Migrations (${total}) ---\n`);

  const listHdr = [
    "#".padStart(3),
    "File".padEnd(48),
    "Corrective?",
  ].join(" | ");
  console.log(listHdr);
  console.log("-".repeat(listHdr.length + 2));

  for (const m of migrations) {
    const num = String(m.number).padStart(3, "0");
    const flag = m.isCorrective ? `YES (${m.correctiveKeyword})` : "no";
    console.log(`${num} | ${m.filename.padEnd(48)} | ${flag}`);
  }

  console.log("\n=== Verification complete ===");
}

main();
