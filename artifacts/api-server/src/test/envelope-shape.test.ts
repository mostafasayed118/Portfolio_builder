import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Anchor at the monorepo root so the guards pass whether vitest runs from
// the repo root (`pnpm vitest run ...`) or per-package (`pnpm --filter
// api-server ...`, where cwd would be artifacts/api-server).
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const readRoot = (rel: string): string => fs.readFileSync(resolve(repoRoot, rel), "utf8");

describe("envelope", () => {
  it("no raw res.status().json in target files", () => {
    for (const f of ["artifacts/api-server/src/app.ts","artifacts/api-server/src/middleware/validateUuid.ts","artifacts/api-server/src/middleware/errorHandler.ts"]) {
      const src = readRoot(f);
      expect(src).not.toMatch(/res\.status\(\d+\)\.json/);
    }
  });
  it("users route uses paginated()", () => {
    const src = readRoot("artifacts/api-server/src/routes/admin/users.ts");
    expect(src).toContain("paginated(");
  });
  it("collection helper sends via paginated()", () => {
    const src = readRoot("artifacts/api-server/src/lib/route-helpers.ts");
    expect(src).toContain("paginated(res, data");
  });
});
