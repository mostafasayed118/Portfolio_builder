# @workspace/api-spec

OpenAPI 3.1 source of truth for the API server's `/api/v1` surface. The
generated React client (`@workspace/api-client-react`) and the generated Zod
schemas (`@workspace/api-zod`) both derive from `openapi.yaml` via
[orval](https://orval.dev).

## Public API

- `openapi.yaml` — the spec itself (edit this, then regenerate).
- Scripts: `pnpm --filter @workspace/api-spec codegen` (regenerate clients),
  `codegen:check` (CI guard against drift).

## Position

Consumed at generation time only — nothing imports it at runtime. Downstream
generated packages: `lib/api-client-react`, `lib/api-zod`.

## Usage

```bash
pnpm --filter @workspace/api-spec codegen        # regenerate after editing the spec
pnpm --filter @workspace/api-spec codegen:check  # verify generated code is in sync
```
