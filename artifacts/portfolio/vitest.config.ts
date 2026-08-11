import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reactEntry = path.resolve(__dirname, "node_modules/react");
const reactDomEntry = path.resolve(__dirname, "node_modules/react-dom");

function reactAlias(nm: string) {
  return {
    react: nm,
    "react-dom": nm.replace(/[\\/]react$/, "/react-dom"),
    "react/jsx-dev-runtime": path.resolve(nm, "../react/jsx-dev-runtime.js"),
    "react/jsx-runtime": path.resolve(nm, "../react/jsx-runtime.js"),
  };
}

const reactAliases = reactAlias(reactEntry);

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: true,
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
