# Architecture

## Overview

Monorepo with 3 apps sharing 2 library packages:

```
                    ┌─────────────────────┐
                    │     Supabase         │
                    │  (PostgreSQL + S3)   │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
        ┌─────┴─────┐  ┌──────┴──────┐  ┌──────┴──────┐
        │ Portfolio  │  │   Admin     │  │ API Server  │
        │  (React)   │  │   (React)   │  │  (Express)  │
        │ anon key   │  │ service key │  │ service key │
        │ public RLS │  │ bypass RLS  │  │ bypass RLS  │
        └─────┬─────┘  └──────┬──────┘  └──────┬──────┘
              │                │                │
        ┌─────┴─────┐  ┌──────┴──────┐         │
        │ @workspace│  │ @workspace  │         │
        │ /supabase │  │    /db      │         │
        │ client.ts │  │ skills.ts   │         │
        │ admin.ts  │  │ projects.ts │         │
        │ types.ts  │  │ messages.ts │         │
        └───────────┘  │ ... (14)    │         │
                       └─────────────┘         │
                                               │
                               ┌───────────────┘
                               │
                        ┌──────┴──────┐
                        │  Supabase   │
                        │  Storage    │
                        │ (cv bucket) │
                        └─────────────┘
```

## Data Flow

### Portfolio (Public)
```
Browser → React Query → @workspace/db → @workspace/supabase/client → Supabase REST API
                                                                         │
                                                                   RLS allows SELECT
                                                                   (public_read policies)
                                                                   RLS allows INSERT
                                                                   (messages only)
```

### Admin CMS
```
Browser → Clerk Auth → React Query → @workspace/db → @workspace/supabase/admin → Supabase REST API
                                                                                    │
                                                                              Service role key
                                                                              bypasses all RLS
```

### CV Download
```
Browser → /api/cv → Express → Supabase Storage (service role) → download as Buffer
           │
      Content-Disposition: attachment
           │
      Browser saves the file
```

## RLS Policy Strategy

**Public-read tables** (hero_content, skills, projects, etc.):
- `public_read` → `FOR SELECT USING (true)` — anyone can read
- `admin_*` → `FOR * USING (is_admin())` — only admin can modify

**Admin-only tables** (messages, cv_settings, etc.):
- `admin_*` → `FOR * USING (is_admin())` — admin only
- `public_insert_messages` → `FOR INSERT WITH CHECK (true)` — anyone can submit

The `is_admin()` function checks `request.jwt.claims.email` against `app.admin_emails`.
Since admin uses service role key (bypasses RLS), the email check only applies to
anonymous requests.

## Package Dependencies

```
@workspace/portfolio
  ├── @workspace/supabase (client)
  ├── @workspace/db
  └── @supabase/supabase-js

@workspace/admin
  ├── @workspace/supabase (admin)
  ├── @workspace/db
  ├── @supabase/supabase-js
  └── @clerk/clerk-react

@workspace/api-server
  ├── @workspace/supabase (server)
  ├── @workspace/db
  └── @supabase/supabase-js
```
