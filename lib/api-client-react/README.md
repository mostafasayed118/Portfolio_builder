# @workspace/api-client-react

Typed API client for the SPAs, generated from `lib/api-spec/openapi.yaml`
with orval, plus the runtime glue that makes it production-ready: base-URL
injection, auth-token getter, CSRF-token getter, a missing-auth handler, and
request grouping/aborting.

## Public API (src/index.ts)

- Generated query/mutation hooks + schemas (`./generated/api`).
- Runtime glue: `setBaseUrl`, `setAuthTokenGetter`, `setCsrfTokenGetter`,
  `setAuthMissingHandler`, `beginRequestGroup`, `abortAllRequests`,
  `customFetch`.

## Position

Consumed by `artifacts/admin` (all admin data flow) and `artifacts/portfolio`
(public read paths). Regenerate via `pnpm --filter @workspace/api-spec
codegen` — never edit `src/generated/` by hand.

## Usage

```ts
import { setBaseUrl, setAuthTokenGetter, api } from "@workspace/api-client-react";

setBaseUrl(getApiUrl());
setAuthTokenGetter(() => clerk.getToken());
```
