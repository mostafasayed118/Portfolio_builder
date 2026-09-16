# @workspace/logging

The sanctioned console boundary for the whole monorepo. Every other module
routes logging through these functions instead of calling `console.*`
directly (enforced by review + the lib/logging eslint contract).

DEV mode prints pretty, coloured lines; PROD emits single-line JSON for log
aggregation. Apps wire the mode via `configureLogger` and may forward errors
to Sentry through `setCaptureError`.

## Public API (src/index.ts)

- `logInfo`, `logWarn`, `logError(message, error, context?)`.
- `configureLogger(envProvider)` — apps provide `{ dev: boolean }`.
- `setCaptureError(fn)` — optional error-monitor hook (e.g. Sentry).

## Position

Consumed by every lib (`db`, `supabase`, `ui`, `app-infra`) and both SPAs
via thin shims (`@/lib/logger`). The api-server uses pino directly for
request logging but imports this package for app-level errors.

## Usage

```ts
import { logError } from "@workspace/logging";

logError("Failed to load projects", err, "ProjectsManager");
```
