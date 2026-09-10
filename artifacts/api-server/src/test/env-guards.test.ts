import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Anchor at the monorepo root so the guards pass whether vitest runs from
// the repo root (`pnpm vitest run ...`) or per-package (`pnpm --filter
// api-server run test`, where cwd would be artifacts/api-server).
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const readRoot = (rel: string): string => fs.readFileSync(resolve(repoRoot, rel), "utf8");

describe("env guards", () => {
  it("replit.md never mentions VITE service-role key", () => {
    const md = readRoot("replit.md");
    expect(md).not.toContain("VITE_SUPABASE_SERVICE_ROLE_KEY");
  });
  // Task 8 owns artifacts/api-server/src/lib/env.ts (ADMIN_EMAILS rename).
  // Unskip once the VITE_ADMIN_EMAILS fallback is removed there.
  it.skip("server env rejects VITE_ADMIN_EMAILS fallback", async () => {
    const src = readRoot("artifacts/api-server/src/lib/env.ts");
    expect(src).not.toContain("VITE_ADMIN_EMAILS");
  });
  it("admin env fails closed in prod without URL/anon key", () => {
    const src = readRoot("artifacts/admin/src/lib/env.ts");
    expect(src).toContain('throw new Error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY")');
  });
  it("portfolio env fails closed in prod without URL/anon key", () => {
    const src = readRoot("artifacts/portfolio/src/lib/env.ts");
    expect(src).toContain('throw new Error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY")');
  });
  it("show-admin-emails masks addresses to count + ***@domain", () => {
    const src = readRoot("artifacts/api-server/scripts/show-admin-emails.mjs");
    expect(src).toContain('"***@"');
    expect(src).not.toContain("console.log");
  });
});
