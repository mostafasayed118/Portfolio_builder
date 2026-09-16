# @workspace/supabase

Supabase browser client plus the generated `Database` type. Exposes a
lazily-created singleton anon client that degrades to `null` (offline mode)
when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing.

## Public API (exports)

- `./client` — `getSupabase(): SupabaseClient<Database> | null`,
  `isSupabaseConfigured: boolean`.
- `./types` — generated `Database` type definitions
  (refresh with `pnpm --filter @workspace/supabase gen:types`).

## Position

Consumed by both SPAs (`artifacts/portfolio`, `artifacts/admin`) for direct
anon-key reads. The api-server builds its own service-role client and does
not use this package.

## Usage

```ts
import { getSupabase, isSupabaseConfigured } from "@workspace/supabase/client";

const client = getSupabase(); // SupabaseClient<Database> | null
```
