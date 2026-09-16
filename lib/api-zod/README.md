# @workspace/api-zod

Zod schemas shared across the backend boundary: orval-generated schemas for
the OpenAPI surface plus hand-written schemas for admin-only payloads
(entity-type allowlists, analytics queries, AI content types).

## Public API (src/index.ts)

- Generated payload schemas (`./generated/api`).
- Hand-written: `imageEntityTypeSchema` / `IMAGE_ENTITY_TYPES`,
  `adminListImagesQuerySchema`, `contactSubmissionSchema`, `aiGenerateSchema`,
  `updateRoleSchema`, section/theme/cv settings schemas, and more.
- Input types: `ProjectInput`, `PostInput`, `HeroInput`, ...

## Position

Consumed by `artifacts/api-server` (route-body validation) and
`artifacts/admin` (client-side validation of the same shapes — the
entity-type allowlist is shared so the two cannot drift).

## Usage

```ts
import { imageEntityTypeSchema } from "@workspace/api-zod";

const parsed = imageEntityTypeSchema.safeParse(req.body.entityType);
```
