# API Server — Express 5 REST API

REST API server for the Portfolio-Fixer project. Handles CV generation, image uploads, contact messages, and health checks.

## Quick Start

```bash
# Copy env file
cp .env.example .env

# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CSRF_SECRET

# Build and start
pnpm --filter @workspace/api-server dev
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key |
| `CSRF_SECRET` | Yes | Secret for CSRF token generation |
| `PORT` | No | HTTP port (default 3001) |

## API Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/healthz` | Health check | None |
| GET | `/api/csrf-token` | Get CSRF token | None |
| POST | `/api/images/upload` | Upload image | CSRF |
| DELETE | `/api/images/:id` | Delete image | CSRF |
| POST | `/api/contact` | Submit contact form | Rate limited |
| GET | `/api/cv` | Download CV PDF | None |
| GET | `/api-docs` | OpenAPI documentation | None |

## Security

- **Helmet**: HTTP headers security
- **CORS**: Configured origin restrictions
- **CSRF**: Double-submit cookie pattern on mutating routes
- **Rate Limiting**: General (100/15min), Contact (5/hour), Auth (10/15min)
- **Input Validation**: Entity type allowlist for uploads

## Tech Stack

- Express 5 (beta)
- Supabase JS SDK
- csrf-csrf (double-submit cookie)
- express-rate-limit
- helmet
- pino (logging)
- jspdf + qrcode (CV generation)
- multer (file uploads)
