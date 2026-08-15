/**
 * Drift guard for the generated OpenAPI client.
 *
 * Regenerates `lib/api-client-react/src/generated` from `openapi.yaml` and
 * fails if the committed output differs (modified, deleted, or untracked).
 * This catches the failure mode where the spec is edited but the generated
 * client is not regenerated, which silently leaves the admin app calling
 * stale endpoints.
 *
 * Usage: pnpm --filter @workspace/api-spec run codegen:check
 */
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const specDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(specDir, "..", "..");
const generated = "lib/api-client-react/src/generated";

// 1. Regenerate from the spec (inherits stdio so orval output is visible).
execSync("orval --config ./orval.config.ts", { cwd: specDir, stdio: "inherit" });

// 2. Any change in the generated dir (modified, deleted, or untracked) = drift.
const status = execSync(`git status --porcelain -- ${generated}`, {
  cwd: repoRoot,
  encoding: "utf8",
}).trim();

if (status) {
  console.error("✖ OpenAPI client is out of sync with the spec.");
  console.error("  Run: pnpm --filter @workspace/api-spec run codegen");
  console.error("  Then commit the regenerated files under lib/api-client-react/src/generated.");
  console.error(status);
  process.exit(1);
}

console.log("✓ OpenAPI client is in sync with the spec.");
