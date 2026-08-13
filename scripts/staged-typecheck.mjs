/* global process */
// lint-staged appends the staged file list to the configured command.
// `pnpm run typecheck` cannot receive file args (tsc -p rejects mixing
// a project with source files), so this wrapper ignores argv and runs
// the full typecheck exactly once per commit.
import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
// On Windows, .cmd shims cannot be spawned directly by Node without a
// shell, so route through cmd.exe /c.
const result = isWindows
  ? spawnSync("cmd.exe", ["/c", "pnpm run typecheck"], { stdio: "inherit" })
  : spawnSync("pnpm", ["run", "typecheck"], { stdio: "inherit" });

process.exit(result.status ?? 1);