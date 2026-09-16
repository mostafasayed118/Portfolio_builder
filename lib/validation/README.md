# @workspace/validation

Client-side form-validation layer for the portfolio frontend, built on
**Zod**. Two complementary surfaces:

1. **RuleFn maps** — field → `(value: unknown) => string | null` validators,
   consumed by `lib/ui`'s `useFormValidation` hook. Every rule factory
   (`rules.*`) and the contact validators are thin `safeParse` adapters over
   Zod schemas, so the string errors match the API layer's messages.
2. **Real Zod object schemas** — `contactZodSchema` mirrors
   `@workspace/api-zod`'s `contactSubmissionSchema` (same field bounds, same
   messages, same honeypot/timestamp fields). `contact-drift.test.ts` pins
   both schemas to accept/reject a fixed input matrix identically.

## Layer position

Fourth of the four validation layers — portfolio client-side only, for
instant user feedback:

1. DB CHECK constraints
2. API middleware (vanilla TS validators in `artifacts/api-server`)
3. `@workspace/api-zod` — Zod schemas for API request/response payloads
4. `@workspace/validation` — this package (client-side form rules)

This package never parses API payloads; `artifacts/admin` does not depend
on it (admin forms validate server-side).

## Public API (src/index.ts)

- `rules` — Zod-backed rule factories: `required`, `minLength`, `maxLength`,
  `email`, `url`, `range`, `fileType`, `fileSize`.
- `validateField(value, ...rules)` — first error wins; short-circuits.
- `validateForm(values, schema)`, `isFormValid(errors)` — form-level helpers.
- `FormErrors<T>`, `ValidationSchema<T>`, `RuleFn` — types for `useFormValidation`.
- `contactZodSchema` — parseable Zod contact schema (api-zod aligned);
  `contactFormSchema` — its RuleFn-map form.
- Pre-built RuleFn maps: `skillSchema`, `projectSchema`, `experienceSchema`,
  `certificationSchema`, `heroSchema`, `cvUploadSchema`, `contactInfoSchema`,
  `siteSettingsSchema`, `seoSchema`.
- `CV_MAX_MB`, `CV_EXT` — canonical CV upload bounds (mirrored by api-zod).

## Usage

```ts
import { useFormValidation } from "@workspace/ui";
import { contactFormSchema, contactZodSchema } from "@workspace/validation/schemas";

const form = useFormValidation({ name: "", email: "", message: "" }, contactFormSchema);
if (form.validateAll()) {
  const parsed = contactZodSchema.parse(form.values); // trim + normalize + typed
}
```
