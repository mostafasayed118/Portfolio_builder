import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

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
        esbuild: {
          jsx: "automatic",
          jsxImportSource: "react",
        },
        resolve: {
          alias: {
            "@": path.resolve(dirname, "artifacts/portfolio/src"),
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
        esbuild: {
          jsx: "automatic",
          jsxImportSource: "react",
        },
        resolve: {
          alias: {
            "@": path.resolve(dirname, "artifacts/admin/src"),
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
    ],
  },
});
