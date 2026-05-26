# API Reference

> **Base URL:** `/api/v1/`
> **Server:** Express 5 (`artifacts/api-server`)

All routes are registered in `artifacts/api-server/src/routes/v1/index.ts` and mounted via `app.ts`.

---

## Response Format

All responses follow a consistent envelope:

```json
{
  "success": true,
  "data": { ... }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": { "field": "Error message" }
}
```

---

## Public Routes

No authentication required.

### Health

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| GET | `/api/v1/healthz` | No | No | Health check with DB latency. 5s in-memory cache. |

**Response:** `HealthCheckResponse`
```json
{
  "status": "ok",
  "timestamp": "2026-05-24T00:00:00.000Z",
  "uptime": 12345.67,
  "db": { "status": "ok", "latency_ms": 42 },
  "api": { "status": "ok", "response_ms": 45 }
}
```

Returns 200 if healthy, 503 if DB is unreachable.

---

### CV

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| GET | `/api/v1/cv` | No | No | Download CV PDF |
| GET | `/api/v1/cv/settings` | No | No | Get CV metadata |

#### GET /api/v1/cv

Downloads the CV PDF. Tries dynamic generation first (jspdf + QR code linking to portfolio), falls back to Supabase Storage download.

**Response:** `Content-Type: application/pdf` with `Content-Disposition: attachment`

#### GET /api/v1/cv/settings

```json
{
  "success": true,
  "data": {
    "objectPath": "cv/path/to/file.pdf",
    "fileName": "Mustafa_Sayed_Resume.pdf",
    "updatedAt": "2026-05-24T00:00:00.000Z"
  }
}
```

---

### Images

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| GET | `/api/v1/images/:id/metadata` | No | imageMetadataLimiter | Get image metadata |
| POST | `/api/v1/images/upload` | Admin + CSRF | uploadLimiter | Upload image |
| DELETE | `/api/v1/images/:id` | Admin + CSRF | adminLimiter | Delete image |

#### GET /api/v1/images/:id/metadata

Returns image metadata by UUID.

```json
{
  "id": "uuid",
  "original_filename": "photo.jpg",
  "mime_type": "image/jpeg",
  "file_size_bytes": 123456,
  "entity_type": "projects",
  "entity_id": "uuid",
  "created_at": "2026-05-24T00:00:00.000Z"
}
```

#### POST /api/v1/images/upload

Upload an image. `multipart/form-data`.

**Fields:**
- `file` — Image file (JPEG, PNG, WebP — max 10MB)
- `entityType` — One of: `projects`, `about`, `hero`, `avatar`, `certifications`, `skills`, `experience`, `branding`, `content`
- `entityId` (optional) — UUID of related entity

**Response:**
```json
{
  "id": "metadata-uuid",
  "url": "https://xxx.supabase.co/storage/v1/object/public/project_images/...",
  "variants": [
    { "type": "thumbnail", "url": "...?width=150&height=150&resize=cover" },
    { "type": "small", "url": "...?width=400&resize=inside" },
    { "type": "medium", "url": "...?width=800&resize=inside" },
    { "type": "large", "url": "...?width=1200&resize=inside" },
    { "type": "social", "url": "...?width=1200&height=630&resize=cover" }
  ]
}
```

#### DELETE /api/v1/images/:id

Deletes image from storage and removes metadata record.

---

### Contact

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| POST | `/api/v1/contact` | No | 5/hour/IP | Submit contact form |

**Request body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "Hello, I'd like to discuss a project."
}
```

**Validation:** `name` 1–100 chars, `email` valid format, `message` 10–2000 chars. All fields HTML-entity-escaped before storage.

**Response:** `201 Created`
```json
{ "success": true, "data": { "id": "uuid" } }
```

---

### CSRF

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| GET | `/api/v1/csrf-token` | No | No | Get CSRF token |

Returns token in response body and sets it as a cookie.

```json
{ "csrfToken": "token-string" }
```

---

## Admin Routes

All admin routes require authentication (Clerk JWT or API key) and CSRF protection on mutations.

Prefix: `/api/v1/admin/`

### Hero (Singleton)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/hero` | Get hero content |
| PUT | `/admin/hero` | Update hero content (partial, Zod-validated) |

**PUT body (all optional):**
```json
{
  "heading": "Hi, I'm",
  "name": "Mustafa Sayed",
  "roles": ["Data Engineer", "ETL Developer"],
  "description": "Passionate about...",
  "github_url": "https://github.com/...",
  "linkedin_url": "https://linkedin.com/in/...",
  "email": "admin@example.com",
  "available": true,
  "is_published": true,
  "heading_ar": "...",
  "name_ar": "...",
  "description_ar": "..."
}
```

### About (Singleton)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/about` | Get about content |
| PUT | `/admin/about` | Update about content |

### Skills (Collection)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/skills` | List skills (paginated) |
| POST | `/admin/skills` | Create skill |
| PUT | `/admin/skills/:id` | Update skill |
| DELETE | `/admin/skills/:id` | Soft-delete skill |

**GET params:** `?limit=50&offset=0&userId=uuid`

**POST body:**
```json
{
  "name": "Python",
  "category": "Languages",
  "proficiency": 90,
  "icon": "python",
  "sort_order": 1,
  "is_visible": true
}
```

Validation: `name` 1–100 chars (required), `category` required, `proficiency` 0–100.

**Paginated response:**
```json
{
  "success": true,
  "data": [{ "id": "uuid", "name": "Python", ... }],
  "pagination": { "total": 25, "limit": 50, "offset": 0, "hasMore": false }
}
```

### Projects (Collection)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/projects` | List projects (paginated) |
| POST | `/admin/projects` | Create project |
| PUT | `/admin/projects/:id` | Update project |
| DELETE | `/admin/projects/:id` | Soft-delete project |

**POST/PUT validation:** `title` 1–150 chars (required), `description` 10–2000 chars (required), `github_url`/`live_url`/`image_url` valid URL or empty/null, `tech_stack`/`tags` string arrays, `metrics` string array (max 20), `featured`/`is_published` boolean.

### Experience (Collection)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/experience` | List experience entries (paginated) |
| POST | `/admin/experience` | Create experience |
| PUT | `/admin/experience/:id` | Update experience |
| DELETE | `/admin/experience/:id` | Soft-delete experience |

Validation: `title` 1–150, `company` 1–150, `period` required.

### Certifications (Collection)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/certifications` | List certifications (paginated) |
| POST | `/admin/certifications` | Create certification |
| PUT | `/admin/certifications/:id` | Update certification |
| DELETE | `/admin/certifications/:id` | Soft-delete certification |

Validation: `title` 1–200, `issuer` required, `credential_url` valid URL or null.

### Messages (Collection)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/messages` | List messages (paginated) |
| GET | `/admin/messages/unread-count` | Unread message count |
| PATCH | `/admin/messages/:id/read` | Mark as read |
| PATCH | `/admin/messages/:id/unread` | Mark as unread |
| DELETE | `/admin/messages/:id` | Soft-delete message |
| POST | `/admin/messages/bulk-delete` | Bulk soft-delete |

**bulk-delete body:**
```json
{ "ids": ["uuid1", "uuid2", "uuid3"] }
```

### Contact Info (Singleton)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/contact-info` | Get contact info |
| PUT | `/admin/contact-info` | Update contact info |

### Theme Settings (Singleton)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/theme-settings` | Get theme (HSL colors, radius) |
| PUT | `/admin/theme-settings` | Update theme |

### Typography Settings (Singleton)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/typography-settings` | Get typography |
| PUT | `/admin/typography-settings` | Update typography |

### SEO Settings (Singleton)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/seo-settings` | Get SEO settings |
| PUT | `/admin/seo-settings` | Update SEO settings |

### Section Settings (Collection)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/section-settings` | List section visibility/order |
| PUT | `/admin/section-settings` | Update section settings |
| POST | `/admin/section-settings` | Reorder sections |

### Site Settings (Singleton)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/site-settings` | Get site settings |
| PUT | `/admin/site-settings` | Update site settings |

### CV Management (Admin)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/cv/settings` | Get CV metadata |
| PUT | `/admin/cv/settings` | Update CV metadata (validated) |
| DELETE | `/admin/cv/settings` | Remove CV settings |

**PUT validation:** `objectPath` 1–500 chars, `fileName` 1–255 chars ending in `.pdf`.

### Seed

| Method | Path | Description |
|---|---|---|
| POST | `/admin/seed` | Import static default data |

### AI Assistant

| Method | Path | Description |
|---|---|---|
| POST | `/admin/ai-assistant` | AI content suggestions (requires `GEMINI_API_KEY`) |

### Users

| Method | Path | Description |
|---|---|---|
| GET | `/admin/users` | List users |
| POST | `/admin/users` | Create user |
| PUT | `/admin/users/:id` | Update user |
| DELETE | `/admin/users/:id` | Delete user |

---

## Middleware

| Middleware | Applied To | Description |
|---|---|---|
| `helmet` | All | Security headers (CSP, HSTS, X-Frame-Options) |
| `cors` | All | Allows configured origins with credentials |
| `compression` | All | gzip compression |
| `pinoHttp` | All | Structured request logging |
| `cookieParser` | All | Cookie parsing for CSRF |
| `generalLimiter` | `/api/v1/*` | 100 req/15min |
| `adminLimiter` | `/api/v1/admin/*` | Additional admin rate limit |
| `apiKeyLimiter` | `/api/v1/admin/*` | API key rate limit |
| `adminAuth` | Admin routes | Clerk JWT or API key verification |
| `doubleCsrfProtection` | Mutating admin routes | CSRF double-submit cookie |
| `contactLimiter` | `POST /api/v1/contact` | 5 req/hour/IP |
| `imageMetadataLimiter` | `GET /api/v1/images/:id/metadata` | Image metadata rate limit |
| `uploadLimiter` | `POST /api/v1/images/upload` | Image upload rate limit |

Rate limiting is disabled when `NODE_ENV !== "production"`.

---

## Error Responses

Standard error format from `errorHandler.ts`:

```json
{
  "success": false,
  "message": "Internal server error"
}
```

### Error Type → HTTP Status Mapping

| Error Type | Detection | HTTP Status | Response |
|-----------|-----------|-------------|----------|
| Zod validation | `instanceof ZodError` | 400 | `{ success, message, errors: fieldErrors }` |
| Generic validation | `err.name === "ValidationError"` | 400 | `{ success, message }` |
| PG unique violation | `code === "23505"` | 409 | `{ success, message, code }` |
| PG FK violation | `code === "23503"` | 409 | `{ success, message, code }` |
| PG not-null violation | `code === "23502"` | 400 | `{ success, message, code }` |
| PG undefined column | `code === "42703"` | 500 | `{ success, message, code }` |
| PG undefined table | `code === "42P01"` | 500 | `{ success, message, code }` |
| Supabase/PostgREST | `err.name === "PostgrestError"` | 502 | `{ success, message }` |
| Explicit HTTP error | `err.statusCode` exists | (varies) | `{ success, message }` |
| Unexpected error | fallback | 500 | `{ success, message: "Internal server error" }` |

Validation errors:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": { "name": "Name is required", "email": "Email is not valid" }
}
```

Auth errors:
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

Not found (404):
```json
{
  "success": false,
  "message": "Not found"
}
```

---

## Security Headers (Helmet CSP)

| Directive | Value | Note |
|---|---|---|
| `defaultSrc` | `'self'` | |
| `scriptSrc` | `'self', 'unsafe-inline'` | unsafe-inline for Tailwind |
| `styleSrc` | `'self', 'unsafe-inline', fonts.googleapis.com` | TailwindCSS requirement |
| `fontSrc` | `'self', fonts.gstatic.com` | |
| `imgSrc` | `'self', data:, blob:, *.supabase.co` | |
| `connectSrc` | `'self', *.supabase.co, wss://*.supabase.co` | |
| `frameSrc` | `'none'` | |
| `objectSrc` | `'none'` | |
| `baseUri` | `'self'` | |
| `formAction` | `'self'` | |
| `workerSrc` | `'self'` | |

---

## CORS

| Environment | Allowed Origins |
|---|---|
| Development | `http://localhost:5173`, `http://localhost:5174` |
| Production | `VITE_SITE_URL`, `VITE_ADMIN_URL`, Vercel preview URLs (`VERCEL_URL`) |

Credentials: enabled. Protocol validation: HTTPS enforced in production.
