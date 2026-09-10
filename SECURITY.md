# Security Policy

## Supported versions

Only the latest commit on `main` receives security updates. Older
tags are not patched.

## Reporting a vulnerability

**Do not open a public GitHub issue for security problems.**

Email `security@mustafasayed.dev` (or the maintainer address listed
in `package.json`) with:

- A clear description of the issue and the attack scenario
- The commit / version where you observed it
- Reproduction steps (PoC code, curl commands, screenshot)
- Your contact info if you'd like a credit in the advisory

We will acknowledge within **2 business days** and aim to ship a fix
or mitigation within **7 days** for critical issues, **30 days** for
high-severity issues.

## What we consider a vulnerability

- RLS bypass that exposes another user's data
- Auth bypass on the admin SPA or api-server
- Stored XSS via a portfolio/admin input (we accept only `http(s)`,
  `mailto:`, and `tel:` URL schemes)
- CSRF protection bypass
- Service-role key leak or unintended client exposure
- Rate-limit bypass that allows resource exhaustion
- SSRF or path traversal in the storage upload pipeline

## What is NOT a vulnerability

- Denial of service against the public portfolio site (use a CDN /
  WAF in production)
- Missing rate limits on the contact form (we have a 5/hour limit
  by default)
- Enumeration of the published `projects`, `skills`, `certifications`
  tables (these are intentionally public)

## Security features already in place

- **CSP, HSTS, frame-ancestors, X-Frame-Options, Referrer-Policy** on
  every response (see `artifacts/api-server/src/app.ts`)
- **Helmet** for default-hardened HTTP headers
- **CSRF double-submit cookie** on all mutating endpoints
- **Rate limiting** (per IP, per endpoint) via `express-rate-limit`
- **Per-bucket storage RLS** so any authenticated user cannot
  overwrite another user's files
- **RLS on every public-read table** so anon users see only the
  columns the API documents
- **Timing-safe API-key comparison** in `adminAuth`
- **HTML-escaped user input** in every React component (React's
  default escaping); no `dangerouslySetInnerHTML` is used
- **Production fail-closed** for `ADMIN_EMAILS` — empty list
  grants nobody admin
- **Email allowlist + DB role** dual-gate for superadmin elevation
- **AbortController timeouts** on every fetch (5s CSRF, 15s API)

## Hall of fame

We credit reporters (with their permission) in release notes after a
fix ships.
