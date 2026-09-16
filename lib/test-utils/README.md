# @workspace/test-utils

Shared test doubles used by the SPA vitest suites: browser API mocks, a
Supabase client mock builder, and CSP helpers — so individual test files
don't hand-roll the same fakes.

## Public API (src/index.ts)

- `./browser-mocks` — `installBrowserMocks()` fakes for browser globals
  (`matchMedia`, `IntersectionObserver`, ...).
- `./supabase-mock` — `makeSupabaseCreateClientMock()` chainable
  `SupabaseClient` mock factory.
- `./csp` — `describeSharedCspBehavior(helpers)` for asserting nonce-based
  CSP behavior across apps.

## Position

Consumed by `artifacts/admin` and `artifacts/portfolio` test suites
(devDependency only — never imported by production code).

## Usage

```ts
import { installBrowserMocks, makeSupabaseCreateClientMock } from "@workspace/test-utils";

installBrowserMocks();
```
