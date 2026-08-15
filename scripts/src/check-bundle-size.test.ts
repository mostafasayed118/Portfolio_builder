import { describe, it, expect } from "vitest";
import {
  evaluateBudgets,
  type BundleBudgets,
  type BundledFile,
} from "./check-bundle-size";

const KB = 1024;

// Budgets mirroring the production defaults (scripts/src/check-bundle-size.ts).
const budgets: BundleBudgets = {
  maxChunkKb: 400,
  maxChunkGzipKb: 120,
  apps: [
    { name: "portfolio", totalKb: 1400, totalGzipKb: 450 },
    { name: "admin", totalKb: 2000, totalGzipKb: 600 },
  ],
  combinedTotalKb: 3400,
  combinedTotalGzipKb: 1050,
};

/** gzip defaults to ~1/4 of raw, close to the real 3-4x JS compression ratio. */
function file(app: string, name: string, kb: number, gzipKb = Math.ceil(kb / 4)): BundledFile {
  return { app, name, bytes: kb * KB, gzipBytes: gzipKb * KB };
}

describe("evaluateBudgets", () => {
  it("passes when raw and gzip are within every budget", () => {
    const files = [
      file("portfolio", "index.js", 115, 30),
      file("portfolio", "vendor-react.js", 186, 47),
      file("admin", "index.js", 138, 35),
      file("admin", "recharts.js", 369, 93),
    ];

    const outcome = evaluateBudgets(budgets, files);

    expect(outcome.violations).toEqual([]);
    expect(outcome.appTotals).toEqual([
      { app: "portfolio", bytes: 301 * KB, gzipBytes: 77 * KB },
      { app: "admin", bytes: 507 * KB, gzipBytes: 128 * KB },
    ]);
    expect(outcome.combinedBytes).toBe(808 * KB);
    expect(outcome.combinedGzipBytes).toBe(205 * KB);
  });

  it("flags any single chunk that exceeds the raw per-chunk ceiling", () => {
    const files = [
      file("portfolio", "index.js", 100),
      file("admin", "big.js", 401), // raw over 400 KB; gzip ~101 KB stays under 120 KB
    ];

    const outcome = evaluateBudgets(budgets, files);

    expect(outcome.violations).toHaveLength(1);
    expect(outcome.violations[0]).toContain("admin/big.js");
    expect(outcome.violations[0]).toContain("per-chunk limit: 400KB");
  });

  it("flags any single chunk that exceeds the gzip per-chunk ceiling", () => {
    const files = [
      file("portfolio", "index.js", 100),
      file("admin", "fat.js", 200, 130), // raw 200 KB is fine; gzip 130 KB is over 120 KB
    ];

    const outcome = evaluateBudgets(budgets, files);

    expect(outcome.violations).toHaveLength(1);
    expect(outcome.violations[0]).toContain("admin/fat.js");
    expect(outcome.violations[0]).toContain("per-chunk gzip limit: 120KB");
  });

  it("flags an app whose summed raw JS exceeds its per-app total", () => {
    // Five 300 KB chunks stay under the 400 KB per-chunk ceiling but sum to
    // 1500 KB, over the portfolio's 1400 KB raw total (gzip stays under 450 KB).
    const files = [
      file("portfolio", "a.js", 300),
      file("portfolio", "b.js", 300),
      file("portfolio", "c.js", 300),
      file("portfolio", "d.js", 300),
      file("portfolio", "e.js", 300),
      file("admin", "index.js", 100),
    ];

    const outcome = evaluateBudgets(budgets, files);

    expect(outcome.violations).toHaveLength(1);
    expect(outcome.violations[0]).toContain("portfolio total JS");
    expect(outcome.violations[0]).toContain("exceeds 1400KB budget");
  });

  it("flags an app whose summed gzip JS exceeds its per-app gzip total", () => {
    // Eight 100 KB raw chunks (60 KB gzip each) stay under every per-chunk
    // limit and under the 1400 KB raw total, but sum to 480 KB gzip — over
    // the portfolio's 450 KB gzip total.
    const files = [
      file("portfolio", "a.js", 100, 60),
      file("portfolio", "b.js", 100, 60),
      file("portfolio", "c.js", 100, 60),
      file("portfolio", "d.js", 100, 60),
      file("portfolio", "e.js", 100, 60),
      file("portfolio", "f.js", 100, 60),
      file("portfolio", "g.js", 100, 60),
      file("portfolio", "h.js", 100, 60),
      file("admin", "index.js", 100),
    ];

    const outcome = evaluateBudgets(budgets, files);

    expect(outcome.violations).toHaveLength(1);
    expect(outcome.violations[0]).toContain("portfolio total JS");
    expect(outcome.violations[0]).toContain("exceeds 450KB gzip budget");
  });

  it("flags the combined raw total when both apps are individually within budget", () => {
    // A combined budget tighter than the sum of the per-app totals makes the
    // combined check binding on its own. gzip limits are set equal to the raw
    // limits so they can't interfere with this raw-focused assertion.
    const tightBudgets: BundleBudgets = {
      maxChunkKb: 400,
      maxChunkGzipKb: 400,
      apps: [
        { name: "portfolio", totalKb: 1000, totalGzipKb: 1000 },
        { name: "admin", totalKb: 1000, totalGzipKb: 1000 },
      ],
      combinedTotalKb: 1500,
      combinedTotalGzipKb: 1500,
    };
    const files = [
      file("portfolio", "a.js", 300),
      file("portfolio", "b.js", 300),
      file("portfolio", "c.js", 300), // 900 KB, within 1000
      file("admin", "d.js", 300),
      file("admin", "e.js", 300),
      file("admin", "f.js", 300), // 900 KB, within 1000
    ];

    const outcome = evaluateBudgets(tightBudgets, files);

    expect(outcome.violations).toHaveLength(1);
    expect(outcome.violations[0]).toContain("combined total JS");
    expect(outcome.violations[0]).toContain("exceeds 1500KB budget");
    expect(outcome.violations[0]).not.toContain("gzip");
  });

  it("flags the combined gzip total when both apps are within their per-app gzip totals", () => {
    const tightBudgets: BundleBudgets = {
      maxChunkKb: 400,
      maxChunkGzipKb: 120,
      apps: [
        { name: "portfolio", totalKb: 1000, totalGzipKb: 1000 },
        { name: "admin", totalKb: 1000, totalGzipKb: 1000 },
      ],
      combinedTotalKb: 5000, // raw combined can't trigger
      combinedTotalGzipKb: 300,
    };
    // Each app contributes 200 KB gzip (under its 1000 KB budget); combined
    // 400 KB gzip exceeds the 300 KB combined gzip cap while raw stays tiny.
    const files = [
      file("portfolio", "a.js", 100, 50),
      file("portfolio", "b.js", 100, 50),
      file("portfolio", "c.js", 100, 50),
      file("portfolio", "d.js", 100, 50),
      file("admin", "e.js", 100, 50),
      file("admin", "f.js", 100, 50),
      file("admin", "g.js", 100, 50),
      file("admin", "h.js", 100, 50),
    ];

    const outcome = evaluateBudgets(tightBudgets, files);

    expect(outcome.violations).toHaveLength(1);
    expect(outcome.violations[0]).toContain("combined total JS");
    expect(outcome.violations[0]).toContain("exceeds 300KB gzip budget");
  });

  it("flags an app with no bundled files (e.g. the build did not run)", () => {
    const files = [file("portfolio", "index.js", 100, 25)]; // admin missing

    const outcome = evaluateBudgets(budgets, files);

    expect(outcome.violations).toEqual([
      "admin: no bundled JS files found — run the build first.",
    ]);
    // The missing app is excluded from the totals rather than counted as 0 KB.
    expect(outcome.appTotals).toEqual([
      { app: "portfolio", bytes: 100 * KB, gzipBytes: 25 * KB },
    ]);
    expect(outcome.combinedBytes).toBe(100 * KB);
    expect(outcome.combinedGzipBytes).toBe(25 * KB);
  });

  it("does not flag a chunk that sits exactly at the raw per-chunk limit (strict >)", () => {
    const files = [
      file("portfolio", "exact.js", 400, 100), // == 400 KB raw limit, not over
      file("admin", "index.js", 100),
    ];

    const outcome = evaluateBudgets(budgets, files);

    expect(outcome.violations).toEqual([]);
  });
});
