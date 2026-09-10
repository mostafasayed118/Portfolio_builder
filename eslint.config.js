import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/build/**",
      "**/.vercel/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/graphify-out/**",
      "**/coverage/**",
      "eslint.config.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", ignoreRestSiblings: true }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "no-console": ["warn", { allow: ["error", "warn"] }],
    },
  },
  {
    // Node build/deploy scripts (e.g. api-server/build.mjs) run outside the
    // browser, so they must see Node globals (process, console, Buffer, ...).
    // Without this, js.configs.recommended's `no-undef` flags them.
    files: ["**/*.mjs", "**/*.cjs"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Node CLI/build scripts (api-server build, verify-jwt-template,
      // show-admin-emails, check-codegen) print to stdout by design.
      "no-console": "off",
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "**/test/**", "**/setup.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-require-imports": "off",
      "no-console": "off",
      "no-useless-assignment": "off",
    },
  },
);
