---
"@workspace/api-server": patch
"@workspace/portfolio": patch
"@workspace/admin": patch
"@workspace/db": patch
---

feat: add blog feature (posts CRUD, public blog pages, sitemap integration), Cloudflare Turnstile on the contact form, mailer service, and env validation hardening. Fixes live-app audit runtime errors and makes the Vitest projects honour the configured 15s timeout.
