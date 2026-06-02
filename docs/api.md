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
  "message": "Hello, I'd like to discuss a project.",
  "website": "",
  "_formLoadedAt": 1717200000000
}
```

**Field-by-field validation:**
- `name` — required, 1–100 chars, trim, control chars stripped
- `email` — required, valid format, trim, lowercased, max 254 chars (RFC 5321)
- `message` — required, 10–2000 chars, trim, control chars stripped
- `website` — **honeypot** (must be empty). Bots that auto-fill all fields trip this.
- `_formLoadedAt` — **time-trap** (optional client-side timestamp). Server rejects:
  - submissions < 2 seconds after render (bots submit too fast)
  - submissions > 1 hour after render (stale/replayed form)

**Abuse controls:**
- Origin / referer check (production rejects missing origin; allowlist otherwise)
- Honeypot field silently dropped with `200 OK` to avoid tipping off bots
- Time-trap silently dropped with `200 OK` when form is too fast
- Per-IP rate limit: 5 requests per hour
- All rejections logged with IP, UA, origin, and rejection reason (never message content)

**Response:** `200 OK`
```json
{ "success": true }
```

Note: a honeypot or time-trap hit still returns `200 OK` so the bot doesn't
know it was caught. True validation failures return `400`.

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

| Method | Path | Description | Error codes |
|---|---|---|---|
| GET | `/admin/skills` | List skills (paginated) | — |
| POST | `/admin/skills` | Create skill | 400 (validation) |
| PUT | `/admin/skills/:id` | Update skill | 400 (validation), 404 (not found / not yours) |
| DELETE | `/admin/skills/:id` | Soft-delete skill | 404 (not found / not yours) |

**GET params:** `?limit=50&offset=0&userId=uuid` (superadmins may pass `userId` to query on behalf of another user; non-superadmins always see their own rows).

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

**404 contract:** `PUT /admin/skills/:id` and `DELETE /admin/skills/:id` both return `404 Skill not found` when:
- the row id doesn't exist, **or**
- the row exists but belongs to a different user (and the caller is not a superadmin)

This is enforced via `.select("id")` + count check on every update/delete.

### Projects (Collection)

| Method | Path | Description | Error codes |
|---|---|---|---|
| GET | `/admin/projects` | List projects (paginated) | — |
| POST | `/admin/projects` | Create project | 400 |
| PUT | `/admin/projects/:id` | Update project | 400, 404 |
| DELETE | `/admin/projects/:id` | Soft-delete project | 404 |

**POST/PUT validation:** `title` 1–150 chars (required), `description` 10–2000 chars (required), `github_url`/`live_url`/`image_url` valid URL or empty/null, `tech_stack`/`tags` string arrays, `metrics` string array (max 20), `featured`/`is_published` boolean.

### Experience (Collection)

| Method | Path | Description | Error codes |
|---|---|---|---|
| GET | `/admin/experience` | List experience entries (paginated) | — |
| POST | `/admin/experience` | Create experience | 400 |
| PUT | `/admin/experience/:id` | Update experience | 400, 404 |
| DELETE | `/admin/experience/:id` | Soft-delete experience | 404 |

Validation: `title` 1–150, `company` 1–150, `period` required.

### Certifications (Collection)

| Method | Path | Description | Error codes |
|---|---|---|---|
| GET | `/admin/certifications` | List certifications (paginated) | — |
| POST | `/admin/certifications` | Create certification | 400 |
| PUT | `/admin/certifications/:id` | Update certification | 400, 404 |
| DELETE | `/admin/certifications/:id` | Soft-delete certification | 404 |

Validation: `title` 1–200, `issuer` required, `credential_url` valid URL or null.

### Messages (Collection)

| Method | Path | Description | Error codes |
|---|---|---|---|
| GET | `/admin/messages` | List messages (paginated) | — |
| GET | `/admin/messages/unread-count` | Unread message count | — |
| PATCH | `/admin/messages/:id/read` | Mark as read | 404 |
| PATCH | `/admin/messages/:id/unread` | Mark as unread | 404 |
| DELETE | `/admin/messages/:id` | Soft-delete message | 404 |
| POST | `/admin/messages/bulk-delete` | Bulk soft-delete | 400 |

**bulk-delete body:**
```json
{ "ids": ["uuid1", "uuid2", "uuid3"] }
```

### Section Settings (Collection)

| Method | Path | Description | Error codes |
|---|---|---|---|
| GET | `/admin/section-settings` | List section visibility/order | — |
| PUT | `/admin/section-settings/:id` | Update section settings | 400, 404 |
| POST | `/admin/section-settings/reorder` | Reorder sections | 400 |

### Users

| Method | Path | Description | Error codes |
|---|---|---|---|
| GET | `/admin/users/me` | Get current authenticated user | 401 |
| GET | `/admin/users` | List users (superadmin only) | 403 |
| PATCH | `/admin/users/:id/role` | Change user role (superadmin only) | 400, 403, 404 |

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
