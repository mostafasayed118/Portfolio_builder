import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const adminNodeModules = path.resolve(dirname, "artifacts/admin/node_modules");
const portfolioNodeModules = path.resolve(dirname, "artifacts/portfolio/node_modules");

function reactAlias(nm: string) {
  return {
    react: path.resolve(nm, "react"),
    "react-dom": path.resolve(nm, "react-dom"),
    "react/jsx-dev-runtime": path.resolve(nm, "react/jsx-dev-runtime.js"),
    "react/jsx-runtime": path.resolve(nm, "react/jsx-runtime.js"),
  };
}

export default defineConfig({
  test: {
    projects: [
      {
        name: "portfolio",
        test: {
          root: path.resolve(dirname, "artifacts/portfolio"),
          environment: "jsdom",
          globals: true,
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.test.{ts,tsx}"],
          css: true,
          env: {
            VITE_SUPABASE_URL: "http://test.supabase.co",
            VITE_SUPABASE_ANON_KEY: "test-anon-key",
          },
        },
        ssr: { noExternal: ["@workspace/ui"] },
        esbuild: { jsx: "automatic", jsxImportSource: "react" },
        resolve: {
          alias: {
            "@": path.resolve(dirname, "artifacts/portfolio/src"),
            ...reactAlias(portfolioNodeModules),
          },
        },
      },
      {
        name: "admin",
        test: {
          root: path.resolve(dirname, "artifacts/admin"),
          environment: "jsdom",
          globals: true,
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.test.{ts,tsx}"],
          css: true,
        },
        ssr: { noExternal: ["@workspace/ui"] },
        esbuild: { jsx: "automatic", jsxImportSource: "react" },
        resolve: {
          alias: {
            "@": path.resolve(dirname, "artifacts/admin/src"),
            ...reactAlias(adminNodeModules),
          },
        },
      },
      {
        name: "api-server",
        test: {
          root: path.resolve(dirname, "artifacts/api-server"),
          environment: "node",
          include: ["src/**/*.test.ts"],
          setupFiles: ["./src/test/setup.ts"],
        },
      },
      {
        name: "validation",
        test: {
          root: path.resolve(dirname, "lib/validation"),
          environment: "node",
          include: ["src/**/*.test.ts"],
          globals: true,
        },
      },
      {
        name: "db",
        test: {
          root: path.resolve(dirname, "lib/db"),
          environment: "node",
          include: ["src/**/*.test.ts"],
          globals: true,
        },
      },
    ],
  },
});
