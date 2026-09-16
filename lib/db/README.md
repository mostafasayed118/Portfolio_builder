# @workspace/db

Supabase data-access layer: one module per entity (`heroContent`, `projects`,
`messages`, `images`, `analytics`, ...). Every function takes a
`SupabaseClient` as its first parameter — no global client, no framework
imports — so the same module serves the api-server (service-role) and
portfolio read paths (anon).

All reads/writes go through `queryOrThrow`, which wraps PostgREST errors in
`[table.operation]`-prefixed `Error`s.

## Public API (src/index.ts)

- Per-entity query modules: `heroContent`, `aboutContent`, `projects`,
  `skills`, `experience`, `certifications`, `posts`, `messages`, `images`,
  `analytics`, `users`, `siteSettings`, `seoSettings`, `themeSettings`, ...
- Shared helpers: `queryOrThrow`, `sanitizeUrl`, storage helpers, reorder helpers.
- `trackEvent`, `fetchEventStats`, `fetchMessageStats` (Postgres RPC-backed).

## Position

Consumed by `artifacts/api-server` (all writes) and `artifacts/portfolio`
(read-only paths). The admin SPA talks to the API server, never to this
package directly.

## Usage

```ts
import { getSupabaseClient } from "./lib/supabase-client";
import { fetchEventStats } from "@workspace/db/analytics";

const stats = await fetchEventStats(getSupabaseClient(), 30);
```
