import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reactEntry = path.resolve(__dirname, "node_modules/react");

function reactAlias(nm: string) {
  return {
    react: nm,
    "react-dom": nm.replace(/[\\/]react$/, "/react-dom"),
    "react/jsx-dev-runtime": path.resolve(nm, "../react/jsx-dev-runtime.js"),
    "react/jsx-runtime": path.resolve(nm, "../react/jsx-runtime.js"),
  };
}

// node_modules/react is a junction to ../../node_modules/.pnpm/react@.../node_modules/react
// so the relative "../" jumps into the same package.
const reactAliases = reactAlias(reactEntry);

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: true,
    env: {
      VITE_API_URL: "http://localhost:3001",
    },
    // `react` is a workspace symlink into the pnpm store; Vite 7's resolver
    // can't follow it for the `react/jsx-dev-runtime` subpath. Without these
    // aliases, every test file that imports from `@workspace/ui` fails to
    // load with `Failed to resolve import "react/jsx-dev-runtime"`.
    // See docs/TESTING_GUIDE.md → "Vitest config gotcha".
    alias: reactAliases,
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      ...reactAliases,
    },
  },
});
