# @workspace/app-infra

Browser-app infrastructure shared by the admin and portfolio SPAs — the
modules that were copy-pasted (and drifting) between the two apps, now
maintained in one place.

## Public API (exports)

- `./logger` — app-level logger: re-exports `@workspace/logging` after
  wiring `import.meta.env.DEV` (both apps re-export this from `@/lib/logger`).
- `./csrf` — `fetchCsrfToken(apiBase)` + `extractCsrfToken(body)`: the
  wire-level CSRF handshake (endpoint, envelope parsing, timeout, error
  wrapping). Caching strategy stays app-side (portfolio caches with a TTL,
  admin fetches per call).

## Position

Consumed by `artifacts/admin` and `artifacts/portfolio`. CSP and env-var
schemas remain app-local on purpose — their directives/keys intentionally
differ per app.

## Usage

```ts
import { fetchCsrfToken } from "@workspace/app-infra/csrf";

const token = await fetchCsrfToken(getApiUrl());
```
