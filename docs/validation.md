# Validation System

## Architecture (4 Layers)

The project uses a defense-in-depth validation strategy. Every piece of user input passes through up to four independent validation layers:

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1 — Database Constraints (PostgreSQL)                  │
│ CHECK constraints, NOT NULL, UNIQUE, FK constraints          │
│ Last line of defense — rejects invalid data at the DB level  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│ Layer 2 — API Server (Express middleware)                     │
│ Vanilla TypeScript validators in artifacts/api-server/       │
│ Validates request bodies before they reach route handlers    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│ Layer 3 — Supabase RLS (Row Level Security)                  │
│ is_admin() function + policy rules                           │
│ Prevents unauthorized reads/writes at the database level     │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│ Layer 4 — Frontend (React)                                   │
│ useFormValidation hook + Zod schemas in lib/validation       │
│ Client-side validation for instant user feedback             │
└─────────────────────────────────────────────────────────────┘
```

## Layer 1 — Database Constraints

Defined in `supabase/migrations/003_constraints.sql`. All constraints use `NOT VALID` to preserve existing data and apply only to new/updated rows.

### CHECK Constraints

| Table | Constraint | Rule |
|-------|-----------|------|
| `messages` | `chk_messages_name` | `char_length(trim(name)) BETWEEN 1 AND 100` |
| `messages` | `chk_messages_email` | Valid email regex |
| `messages` | `chk_messages_message` | `char_length(trim(message)) BETWEEN 10 AND 2000` |
| `messages` | `chk_messages_status` | `status IN ('unread', 'read', 'archived')` |
| `skills` | `chk_skills_name` | `char_length(trim(name)) BETWEEN 1 AND 100` |
| `skills` | `chk_skills_proficiency` | `proficiency BETWEEN 1 AND 100` |
| `skills` | `chk_skills_sort_order` | `sort_order >= 0` |
| `projects` | `chk_projects_title` | `char_length(trim(title)) BETWEEN 1 AND 150` |
| `projects` | `chk_projects_description` | `char_length(trim(description)) BETWEEN 10 AND 2000` |
| `experience` | `chk_exp_title` | `char_length(trim(title)) BETWEEN 1 AND 150` |
| `experience` | `chk_exp_company` | `char_length(trim(company)) BETWEEN 1 AND 150` |
| `experience` | `chk_exp_type` | `type IN ('internship', 'certification', 'volunteer')` |
| `hero_content` | `chk_hero_heading` | `char_length(trim(heading)) BETWEEN 1 AND 200` |
| `hero_content` | `chk_hero_name` | `char_length(trim(name)) BETWEEN 1 AND 100` |
| `contact_info` | `chk_contact_email` | Valid email or NULL |
| `contact_info` | `chk_contact_github` | Starts with `https?://` or NULL |
| `contact_info` | `chk_contact_linkedin` | Starts with `https?://` or NULL |
| `certifications` | `chk_cert_title` | `char_length(trim(title)) BETWEEN 1 AND 200` |
| `certifications` | `chk_cert_url` | `https?://` or empty or NULL |
| `cv_settings` | `chk_cv_filename` | Must end in `.pdf` |
| `cv_settings` | `chk_cv_path` | Non-empty after trim |

### UNIQUE Constraints

| Table | Columns |
|-------|---------|
| `skills` | `name` |
| `section_settings` | `key` |
| `section_variants` | `(section_key, variant_key)` |
| `projects` | `slug` |
| `users` | `clerk_id` |
| `users` | `email` |

## Layer 2 — API Server (Express)

Defined in `artifacts/api-server/src/middleware/validate.ts`. Uses vanilla TypeScript — no external validation library.

### Primitive Validators

```typescript
import { v, schema, validateBody } from "@workspace/validation/validate";

// String with constraints
v.string({ min: 1, max: 100, trim: true, label: "Name" })

// Number with range
v.number({ min: 1, max: 100, integer: true, label: "Proficiency" })

// Boolean
v.boolean()

// Email (regex validated)
v.email({ label: "Email" })

// URL (optionally require HTTPS)
v.url({ requireHttps: true, label: "Website" })

// Enum (whitelist)
v.enum("unread", "read", "archived")

// Wrappers
v.optional(v.string())    // allows undefined
v.nullable(v.string())    // allows null
v.array(v.string(), { minLength: 1, maxLength: 10 })
```

### Composing Schemas

```typescript
const heroUpdateSchema = schema({
  heading: v.string({ min: 1, max: 200, label: "Heading" }),
  name: v.string({ min: 1, max: 100, label: "Name" }),
  roles: v.array(v.string(), { minLength: 1, label: "Roles" }),
  description: v.string({ min: 1, label: "Description" }),
  github_url: v.url({ label: "GitHub URL" }),
  linkedin_url: v.url({ label: "LinkedIn URL" }),
  email: v.email({ label: "Email" }),
});
```

### Express Middleware

```typescript
import { validateBody } from "@workspace/validation/validate";

router.put("/hero", adminAuth, validateBody(heroUpdateSchema), async (req, res) => {
  const data = req.validatedBody; // typed, validated data
  // ...
});
```

Validation errors return:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "name": "Name must be at least 1 characters",
    "email": "Email is not a valid email address"
  }
}
```

## Layer 3 — Supabase RLS

See [Authentication](./auth.md) for the full RLS policy reference.

Key validation role: RLS policies prevent unauthorized writes even if the API server is bypassed. The `is_admin()` function validates the JWT email against the configured admin email list.

## Layer 4 — Frontend (React)

### useFormValidation Hook

Defined in `lib/ui/src/hooks/useFormValidation.ts`. Provides real-time field validation in React forms.

```typescript
import { useFormValidation } from "@workspace/ui/hooks";

const { errors, validate, validateAll } = useFormValidation(rules);

// Validate single field on blur
<input onBlur={() => validate("name", value)} />

// Validate all fields on submit
if (validateAll(formData)) {
  submitForm(formData);
}
```

### Zod Schemas (lib/validation)

The `@workspace/validation` package exports both the vanilla TS validators (for API server) and pre-built schemas:

```typescript
// From lib/validation/src/schemas.ts
import { heroSchema, aboutSchema, skillSchema } from "@workspace/validation/schemas";
```

## Error Response Format

All validation errors follow a consistent envelope:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "fieldName": "Human-readable error message"
  }
}
```

Database constraint violations (Layer 1) are caught by the error handler and mapped to appropriate HTTP status codes:

| PostgreSQL Code | Meaning | HTTP Status |
|----------------|---------|-------------|
| `23505` | unique_violation | 409 Conflict |
| `23503` | foreign_key_violation | 409 Conflict |
| `23502` | not_null_violation | 400 Bad Request |
| `42703` | undefined_column | 500 Internal Server Error |
| `42P01` | undefined_table | 500 Internal Server Error |
