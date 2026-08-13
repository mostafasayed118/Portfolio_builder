# Contributing

## Code Conventions

### Naming

| Context                        | Convention                        | Example                                    |
| ------------------------------ | --------------------------------- | ------------------------------------------ |
| Database columns               | `snake_case`                      | `created_at`, `is_published`, `sort_order` |
| TypeScript variables/functions | `camelCase`                       | `getHeroContent()`, `isPublished`          |
| React components               | `PascalCase`                      | `HeroSection`, `SmartConfirmDialog`        |
| Files (components)             | `PascalCase.tsx`                  | `HeroSection.tsx`, `AdminLayout.tsx`       |
| Files (utilities)              | `camelCase.ts` or `kebab-case.ts` | `heroContent.ts`, `use-typewriter.ts`      |
| Files (hooks)                  | `use-*.ts`                        | `use-reveal.ts`, `use-before-unload.ts`    |
| Database tables                | `snake_case`                      | `hero_content`, `section_settings`         |
| Supabase policies              | `snake_case` descriptive          | `public_read_hero`, `admin_all_skills`     |
| CSS classes                    | Tailwind utilities                | `flex items-center gap-4`                  |

### File Structure — Feature-Based

| New file type               | Location                                                 |
| --------------------------- | -------------------------------------------------------- |
| Portfolio feature component | `artifacts/portfolio/src/features/<feature>/components/` |
| Portfolio feature hook      | `artifacts/portfolio/src/features/<feature>/hooks/`      |
| Portfolio feature types     | `artifacts/portfolio/src/features/<feature>/types.ts`    |
| Portfolio barrel export     | `artifacts/portfolio/src/features/<feature>/index.ts`    |
| Shared portfolio component  | `artifacts/portfolio/src/components/`                    |
| Admin feature component     | `artifacts/admin/src/features/<feature>/components/`     |
| Admin feature hook          | `artifacts/admin/src/features/<feature>/hooks/`          |
| Admin feature types         | `artifacts/admin/src/features/<feature>/types.ts`        |
| Admin barrel export         | `artifacts/admin/src/features/<feature>/index.ts`        |
| Shared admin component      | `artifacts/admin/src/components/`                        |
| API route                   | `artifacts/api-server/src/routes/v1/`                    |
| API middleware              | `artifacts/api-server/src/middleware/`                   |
| DB access module            | `lib/db/src/`                                            |
| Validation schema           | `lib/validation/src/schemas.ts`                          |
| UI primitive                | `lib/ui/src/components/primitives/`                      |
| Database migration          | `supabase/migrations/NNN_description.sql`                |

### Feature Folder Structure

Every new feature MUST follow this structure:

```
features/<feature>/
  ├── components/
  │   ├── FeaturePage.tsx        # Main page component
  │   ├── FeatureSubComponent.tsx # Extracted sub-component if > 250 lines
  │   └── FeatureSkeleton.tsx     # Loading state (optional)
  ├── hooks/
  │   └── useFeature.ts          # Data fetching and business logic
  ├── types.ts                   # TypeScript interfaces
  └── index.ts                   # Barrel export
```

**Rules:**

- All imports from features use barrel files: `import { Feature } from "@/features/<feature>"`
- No file exceeds 250 lines — split into sub-components
- One component per file
- Types extracted to separate file when shared across components

### TypeScript

- **Strict mode** fully enabled in `tsconfig.base.json`:
  - `strictFunctionTypes: true` — function parameter bivariance disabled
  - `noUnusedLocals: true` — dead code flagged as error
  - `strictNullChecks: true` — null/undefined must be handled explicitly
  - `noImplicitAny: true` — no implicit `any`
  - `useUnknownInCatchVariables: true` — catch variables are `unknown`
- Avoid `any` — use `unknown` and narrow with type guards
- Avoid type assertions (`as`) — prefer runtime validation

### React Patterns

- **Data fetching:** TanStack Query (`useQuery`) with `@workspace/db` functions
- **State management:** React hooks for local state, React Query for server state
- **Routing:** wouter (`<Route>`, `<Link>`, `useLocation`)
- **Styling:** Tailwind CSS utility classes, no inline styles
- **Error handling:** Components use loading/error/empty state patterns
- **Toasts:** `useToast()` hook from `@workspace/ui/hooks`

### Validation

Every new form field must be validated at all 4 layers. See [Validation System](./validation.md).

## Adding a New Feature

Checklist for adding a new CMS-managed content type:

- [ ] **Database:** Create migration with table, constraints, indexes, RLS policies
- [ ] **Types:** Update `lib/supabase/src/types.ts` with new table types
- [ ] **DB module:** Create `lib/db/src/newEntity.ts` with CRUD functions
- [ ] **Validation:** Add schema in `lib/validation/src/schemas.ts`
- [ ] **API routes:** Add Express routes in `artifacts/api-server/src/routes/v1/`
- [ ] **Admin feature:** Create `artifacts/admin/src/features/<feature>/` with components, hooks, types, index.ts
- [ ] **Portfolio feature:** Create `artifacts/portfolio/src/features/<feature>/` with components, hooks, types, index.ts
- [ ] **Lazy import:** Add route in `App.tsx` with `lazy(() => import("@/features/<feature>"))`
- [ ] **Section settings:** Add entry to `section_settings` table
- [ ] **Static data:** Add fallback data in `artifacts/portfolio/src/data/`
- [ ] **Tests:** Unit tests for DB module, API route, admin page, portfolio component
- [ ] **Typecheck:** `pnpm run typecheck` passes
- [ ] **Tests:** `pnpm run test` passes (415+ tests expected)

## Pre-commit Hooks

The repo uses **husky** + **lint-staged** to enforce quality gates:

- **ESLint + typecheck** runs on staged `.ts/.tsx` files
- **Prettier** formats `.json` and `.md` files
- **commitlint** enforces conventional commit format

These run automatically on every `git commit`. If hooks reject the commit, fix the issues and retry.

## Git Conventions

### Branch Naming

```
feature/description-of-feature
fix/description-of-fix
refactor/description-of-refactor
```

### Commit Messages

**Enforced by commitlint** — must follow conventional commits format:

```
type(scope): short description

Optional body explaining why the change was made.
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`, `perf`, `ci`

Examples:

```
feat(hero): add typewriter animation
fix(api): handle null stats on hero update
refactor(navbar): split into sub-components
test(admin): add Overview page integration tests
ci: add bundle analysis job to workflow
```

## Running Tests

```bash
# All tests
pnpm run test

# Specific project
pnpm run test -- --project portfolio
pnpm run test -- --project admin
pnpm run test -- --project api-server
pnpm run test -- --project validation
pnpm run test -- --project db

# Watch mode
pnpm run test -- --watch

# Coverage
pnpm run test -- --coverage

# E2E (requires all 3 servers running)
pnpm run test:e2e
```

### Test File Locations

| Project    | Test Files                                                              |
| ---------- | ----------------------------------------------------------------------- |
| portfolio  | `artifacts/portfolio/src/test/*.test.{ts,tsx}`                          |
| admin      | `artifacts/admin/src/test/*.test.{ts,tsx}`, `src/hooks/*.test.{ts,tsx}` |
| api-server | `artifacts/api-server/src/test/**/*.test.ts`                            |
| validation | `lib/validation/src/*.test.ts`                                          |
| db         | `lib/db/src/*.test.ts`                                                  |

## Pull Request Guidelines

1. Create a branch from `master`
2. Make changes with tests
3. Run `pnpm run typecheck` and `pnpm run test`
4. Commit with descriptive message
5. Open PR with description of changes
6. Ensure CI passes
