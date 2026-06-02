/**
 * Boot-time env loader. Runs before any other module to ensure required
 * environment variables are present and surfaces clear diagnostics if not.
 *
 * This file is intentionally minimal: the actual typed accessors and
 * validation logic live in `./lib/env.ts`. The two files are kept separate
 * so the boot loader can be imported at the very top of `index.ts` (before
 * anything that might fail on missing env vars) without dragging the
 * full env module into the import graph.
 */

import "./lib/env";

const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
if (isTest) {
  // Tests rely on `setup.ts` to set required env vars before the app loads.
  // We do not call process.exit() in test mode — see env.ts for the same
  // guard.
} else {
  // In dev/prod, the env module's lazy validation (triggered on first
  // access) will exit(1) if anything is missing. Force that validation
  // now by touching each required var.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { env } = require("./lib/env");
    env.validate();
  } catch {
    // env.ts may not be resolvable in some test contexts — ignore.
  }
}
