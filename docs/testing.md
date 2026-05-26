# Testing Guide

> **Last Updated:** 2026-05-23
> **Framework:** Vitest 3.2.4 + Testing Library + jsdom + supertest
> **E2E:** Playwright (BLOCKED — config issue)

---

## Quick Start

```bash
# Run all unit tests
pnpm run test

# Run with coverage
pnpm run test -- --coverage

# Run in watch mode
pnpm run test -- --watch

# Run specific project
pnpm run test -- --project portfolio
pnpm run test -- --project admin
pnpm run test -- --project api-server
pnpm run test -- --project validation
pnpm run test -- --project db
```

---

## Test Configuration

Test config is in `vitest.config.ts` at the workspace root. It defines 5 test projects:

| Project | Root | Environment | Test Files |
|---|---|---|---|
| portfolio | `artifacts/portfolio` | jsdom | `src/**/*.test.{ts,tsx}` |
| admin | `artifacts/admin` | jsdom | `src/**/*.test.{ts,tsx}` |
| api-server | `artifacts/api-server` | node | `src/**/*.test.ts` |
| validation | `lib/validation` | node | `src/**/*.test.ts` |
| db | `lib/db` | node | `src/**/*.test.ts` |

---

## Test File Locations

```
artifacts/portfolio/src/test/          — 18 test files
artifacts/portfolio/src/hooks/         — 1 test file
artifacts/admin/src/test/              — 26 test files
artifacts/admin/src/hooks/             — 7 test files
artifacts/admin/src/lib/               — 2 test files
artifacts/api-server/src/test/         — 18 test files
lib/db/src/                            — 14 test files
```

**Total:** 78 test files

---

## Writing Tests

### Portfolio / Admin (React components)

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import MyComponent from "./MyComponent";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

Setup files: `artifacts/portfolio/src/test/setup.ts`, `artifacts/admin/src/test/setup.ts`

### API Server (Express routes)

```typescript
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";

describe("GET /api/v1/healthz", () => {
  it("returns 200", async () => {
    const res = await request(app).get("/api/v1/healthz");
    expect(res.status).toBe(200);
  });
});
```

Setup file: `artifacts/api-server/src/test/setup.ts`

### Database functions

```typescript
import { describe, it, expect } from "vitest";
import { listSkills } from "./skills";

// Uses test-utils.ts for mock Supabase client
```

---

## E2E Tests (BLOCKED)

E2E tests use Playwright but are currently blocked.

**Root cause:** `testsprite.config.json` uses `npm` in `startCommand` instead of `pnpm`. The `@workspace/*` protocol fails to resolve under npm.

**Fix:** Change `startCommand` values in `testsprite.config.json` from npm to pnpm:

```json
{
  "apps": {
    "portfolio": {
      "startCommand": "pnpm --filter @workspace/portfolio dev"
    },
    "admin": {
      "startCommand": "pnpm --filter @workspace/admin dev"
    }
  }
}
```

E2E spec files:
- `e2e/admin-messages.spec.ts`

Run E2E (after fix):
```bash
pnpm run test:e2e
```

---

## Coverage

Run with coverage:
```bash
pnpm run test -- --coverage
```

Coverage provider: `@vitest/coverage-v8`
