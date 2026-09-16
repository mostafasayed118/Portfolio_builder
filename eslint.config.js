import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import filenamesPlugin from "eslint-plugin-filenames";
import globals from "globals";
import path from "node:path";

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

// Relative imports must not cross a feature boundary (CLAUDE.md: barrel-only
// imports). Specifier-only rules (no-restricted-imports patterns) cannot do
// this: they never see the importing file, so `../hooks/X` cannot be told
// apart from `../projects/X` — same-feature for one file, cross-feature for
// another at the same depth. This rule resolves each relative specifier
// against the importing file and checks feature containment instead.
//
// Allowed: relative imports that stay inside the same `features/<feature>/`,
// and any relative import resolving outside `features/` entirely (e.g.
// `../../lib/...`). Non-relative specifiers (`@/features/<feature>` barrels,
// `@/lib/...`, `@workspace/*`, npm packages) are out of scope here — the
// alias-form deep-import ban lives in the `no-restricted-imports` block.
// Blocked: any relative import from a file inside one feature into a
// different feature (or the shared `features/` root), and any relative
// import from outside `features/` into a feature — use the feature barrel
// `@/features/<feature>` instead. Test files are exempt (see ignores).
function featureOf(absolutePath) {
  const posix = absolutePath.split(path.sep).join("/");
  const matches = [...posix.matchAll(/\/features\/([^/]+)(?=\/|$)/g)];
  return matches.length ? matches[matches.length - 1][1] : null;
}

const relativeFeatureBoundary = {
  meta: { schema: [] },
  create(context) {
    const check = (node) => {
      const specifier = node.source?.value;
      if (typeof specifier !== "string" || !specifier.startsWith(".")) return;
      const importerDir = path.dirname(context.getFilename());
      const resolved = path.resolve(importerDir, specifier);
      const importerFeature = featureOf(context.getFilename());
      const resolvedFeature = featureOf(resolved);
      if (!resolvedFeature) return; // outside features/ (e.g. src/lib) — allowed
      if (importerFeature && importerFeature === resolvedFeature) return; // same feature
      context.report({
        node,
        message: `Relative import crosses a feature boundary ('${
          importerFeature ?? "outside features"
        }' -> '${resolvedFeature ?? "features root"}'). Use the feature barrel '@/features/${resolvedFeature}'.`,
      });
    };
    return {
      ImportDeclaration: check,
      ImportExpression: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
    };
  },
};

const local = { rules: { "relative-feature-boundary": relativeFeatureBoundary } };

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
    // Feature barrel-only imports (CLAUDE.md). Covered surface, by import
    // form:
    // - `@/features/<feature>/<internal>` — blocked here via
    //   no-restricted-imports patterns (alias deep imports).
    // - Relative imports (from any file in artifacts/*/src):
    //   * same-feature relative paths — allowed;
    //   * relative paths crossing into another feature (e.g.
    //     `../../projects/components/ProjectCard` from features/hero/) —
    //     blocked by `local/relative-feature-boundary`, which resolves the
    //     specifier against the importing file (specifier-only patterns
    //     cannot see the importer);
    //   * relative paths resolving outside `features/` (e.g. `../../lib`) —
    //     allowed.
    // - Relative imports into `features/` from outside are also blocked by
    //   the local rule (use the `@/features/<feature>` barrel).
    // Test files are exempt: they intentionally reach internals to render
    // components in isolation and mock them via vi.mock.
    files: ["artifacts/*/src/**/*.{ts,tsx}"],
    ignores: ["**/*.test.*", "**/src/test/**"],
    plugins: { local },
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
      "local/relative-feature-boundary": "error",
    },
  },
  {
    // API routes must not touch Supabase directly (CLAUDE.md: all DB access
    // goes through lib/db modules or api-server/src/lib helpers). Route files
    // obtain the client via ../../lib/supabase-client and delegate queries to
    // @workspace/db — inline .from()/.rpc()/client creation in a route file is
    // a violation. Test files are exempt (they stub the client chain).
    files: ["artifacts/api-server/src/routes/**/*.ts"],
    ignores: ["**/*.test.*", "**/src/test/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@supabase/supabase-js",
              message: "Routes must not import Supabase directly. Use lib/db modules or an api-server/src/lib helper.",
            },
            {
              name: "@workspace/supabase",
              message: "Routes must not create Supabase clients. Use getSupabaseClient from ../../lib/supabase-client and lib/db for queries.",
            },
          ],
        },
      ],
    },
  },
  {
    // File-size cap (CLAUDE.md: files ≤250 lines). Blank lines and comments
    // don't count, so documentation never forces a split. Scoped to app/lib
    // source; exempted: tests (suite files are intentionally long), the global
    // test setup dir, generated types, the vendored shadcn primitives, and the
    // hand-maintained Supabase types.
    files: ["artifacts/*/src/**/*.{ts,tsx}", "lib/*/src/**/*.{ts,tsx}"],
    ignores: [
      "**/*.test.*",
      "**/src/test/**",
      "**/generated/**",
      "lib/ui/src/components/primitives/**",
      "lib/supabase/src/types.ts",
    ],
    rules: {
      "max-lines": ["error", { max: 250, skipBlankLines: true, skipComments: true }],
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
