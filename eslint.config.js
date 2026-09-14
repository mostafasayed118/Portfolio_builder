import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import filenamesPlugin from "eslint-plugin-filenames";
import globals from "globals";

// eslint-plugin-filenames@1.3.2 predates flat config: it exports function-style
// rules with no option schema, which ESLint 9 rejects. Wrap `match-regex` into
// the object-style shape and declare the schema its implementation expects.
const matchRegexFactory = filenamesPlugin.rules["match-regex"];
const filenames = {
  rules: {
    "match-regex": {
      create:
        typeof matchRegexFactory === "function" ? matchRegexFactory : matchRegexFactory.create,
      meta: { schema: [{ type: "string" }, { type: "boolean" }] },
    },
  },
};

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
    // Hook files follow the camelCase `useXxx` convention (matching the
    // exported hook name); `*.test` companions are allowed.
    files: [
      "artifacts/*/src/hooks/*.{ts,tsx}",
      "artifacts/*/src/features/*/hooks/*.{ts,tsx}",
    ],
    plugins: { filenames },
    rules: {
      "filenames/match-regex": ["error", "^use[A-Z][A-Za-z0-9]*(\\.test)?$"],
    },
  },
  {
    // Feature barrel-only imports (CLAUDE.md): code outside a feature must
    // import from `@/features/<feature>`, never from the feature's internals
    // (components/, hooks/, lib/, ...). Same-feature code uses relative
    // paths instead of the `@/features/<feature>/...` alias.
    // Test files are exempt: they intentionally reach internals to render
    // components in isolation and mock them via vi.mock.
    files: ["artifacts/*/src/**/*.{ts,tsx}"],
    ignores: ["**/*.test.*", "**/src/test/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/features/*/*", "**/features/*/*/**"],
              message:
                "Deep imports into feature internals are forbidden. Import from the feature barrel: '@/features/<feature>'.",
            },
          ],
        },
      ],
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
