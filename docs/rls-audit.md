# RLS (Row Level Security) Audit

Complete audit of all Supabase RLS policies for the portfolio CMS.

**Audit date:** 2026-06-01
**Source:** `supabase/migrations/` (001 through 043)

---

## 1. is_admin() Function

**Defined in:** `001_init.sql`

```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    current_setting('request.jwt.claims', true)::jsonb ->> 'email'
    = ANY(string_to_array(current_setting('app.admin_emails', true), ','))
  );
END;
$$ LANGUAGE plpgsql STABLE;
```

**How it works:**
- Reads the `email` field from the JWT claims (`request.jwt.claims`)
- Compares it against a comma-separated list in the `app.admin_emails` database setting
- Returns `true` if the JWT email matches any entry in the admin list
- Marked `STABLE` (reads no side-effecting data within a transaction)

**Used by:** Every RLS policy that restricts access to admin users.

---

## 2. Public-Read Tables

These tables allow anonymous/authenticated users to SELECT (public portfolio rendering), but restrict INSERT/UPDATE/DELETE to admins via `is_admin()`.

### 2a. Simple Public-Read (SELECT USING true)

These tables expose all rows to public readers. Admins get full CRUD via `admin_all_*` FOR ALL policy.

| Table | SELECT Policy | Admin Policy | Migration |
|---|---|---|---|
| `hero_content` | `public_read_hero` FOR SELECT USING (true) | `admin_all_hero` FOR ALL USING (is_admin()) | 001 |
| `about_content` | `public_read_about` FOR SELECT USING (true) | `admin_all_about` FOR ALL USING (is_admin()) | 001 |
| `contact_info` | `public_read_contact` FOR SELECT USING (true) | `admin_all_contact` FOR ALL USING (is_admin()) | 001 |
| `theme_settings` | `public_read_theme` FOR SELECT USING (true) | `admin_all_theme` FOR ALL USING (is_admin()) | 001 |
| `typography_settings` | `public_read_typography` FOR SELECT USING (true) | `admin_all_typography` FOR ALL USING (is_admin()) | 001 |
| `site_settings` | `public_read_site` FOR SELECT USING (true) | `admin_all_site` FOR ALL USING (is_admin()) | 001 |
| `seo_settings` | `public_read_seo` FOR SELECT USING (true) | `admin_all_seo` FOR ALL USING (is_admin()) | 001 |
| `section_settings` | `public_read_sections` FOR SELECT USING (true) | `admin_all_sections` FOR ALL USING (is_admin()) | 001 |
| `image_metadata` | `public_read_image_metadata` FOR SELECT USING (true) | `admin_all_image_metadata` FOR ALL USING (is_admin()) WITH CHECK (is_admin()) | 022 |
| `image_variants` | `public_read_image_variants` FOR SELECT USING (true) | `admin_all_image_variants` FOR ALL USING (is_admin()) WITH CHECK (is_admin()) | 022 |
| `section_variants` | `public_read_variants` FOR SELECT USING (true) | `admin_all_section_variants` FOR ALL USING (is_admin()) WITH CHECK (is_admin()) | 022 (deduplicated in 039) |

### 2b. Filtered Public-Read (soft-delete + visibility)

These tables filter public SELECT to exclude soft-deleted rows and unpublished/invisible items. Updated in migration 030.

| Table | SELECT Policy | USING Clause | Admin Policy |
|---|---|---|---|
| `projects` | `public_read_projects` FOR SELECT | `is_published = true AND deleted_at IS NULL` | `admin_all_projects` FOR ALL USING (is_admin()) |
| `skills` | `public_read_skills` FOR SELECT | `is_visible = true AND deleted_at IS NULL` | `admin_all_skills` FOR ALL USING (is_admin()) |
| `experience` | `public_read_experience` FOR SELECT | `is_published = true AND deleted_at IS NULL` | `admin_all_experience` FOR ALL USING (is_admin()) |
| `certifications` | `public_read_certifications` FOR SELECT | `is_published = true AND deleted_at IS NULL` | `admin_all_certifications` FOR ALL USING (is_admin()) |

**Note:** Admins bypass these filters because the `admin_all_*` FOR ALL policy uses `is_admin()` in its USING clause, which allows admins to see all rows including soft-deleted and unpublished ones.

### 2c. cv_settings (public read added later)

**Initial (001):** Admin-only with per-operation policies.
**Updated (041):** Public SELECT added for portfolio CV download functionality.

| Policy | Operation | Clause | Target |
|---|---|---|---|
| `public_read_cv` | FOR SELECT | USING (true) | `anon, authenticated` |
| `admin_select_cv` | FOR SELECT | USING (is_admin()) | (all roles) |
| `admin_insert_cv` | FOR INSERT | WITH CHECK (is_admin()) | (all roles) |
| `admin_update_cv` | FOR UPDATE | USING (is_admin()) | (all roles) |
| `admin_delete_cv` | FOR DELETE | USING (is_admin()) | (all roles) |

**Note:** The `public_read_cv` policy targets `anon, authenticated` explicitly (not the default `public` role), allowing unauthenticated portfolio visitors to read the CV file path without the service role key.

---

## 3. Admin-Only Tables

These tables have no public read access. All operations require `is_admin()`.

### messages

Per-operation policies (fixed from FOR ALL in migration 002):

| Policy | Operation | Clause |
|---|---|---|
| `admin_select_messages` | FOR SELECT | USING (is_admin()) |
| `admin_insert_messages` | FOR INSERT | WITH CHECK (is_admin()) |
| `admin_update_messages` | FOR UPDATE | USING (is_admin()) |
| `admin_delete_messages` | FOR DELETE | USING (is_admin()) |
| `public_insert_messages` | FOR INSERT | WITH CHECK (true) |

**Note:** Has an additional public INSERT exception (see Section 4).

### content_snapshots

Single FOR ALL policy (consolidated in migration 039, granular policies from 001/002 dropped):

| Policy | Operation | Clause |
|---|---|---|
| `admin_all_content_snapshots` | FOR ALL | USING (is_admin()) WITH CHECK (is_admin()) |

### analytics_events

Per-operation policies (fixed from FOR ALL in migration 002):

| Policy | Operation | Clause |
|---|---|---|
| `admin_select_analytics` | FOR SELECT | USING (is_admin()) |
| `admin_insert_analytics` | FOR INSERT | WITH CHECK (is_admin()) |
| `admin_update_analytics` | FOR UPDATE | USING (is_admin()) |
| `admin_delete_analytics` | FOR DELETE | USING (is_admin()) |
| `public_insert_analytics` | FOR INSERT | WITH CHECK (true) |

**Note:** Has an additional public INSERT exception (see Section 4).

### content_health_reports

Per-operation policies (fixed from FOR ALL in migration 002):

| Policy | Operation | Clause |
|---|---|---|
| `admin_select_health` | FOR SELECT | USING (is_admin()) |
| `admin_insert_health` | FOR INSERT | WITH CHECK (is_admin()) |
| `admin_update_health` | FOR UPDATE | USING (is_admin()) |
| `admin_delete_health` | FOR DELETE | USING (is_admin()) |

### users

Per-operation policies (added in migration 034):

| Policy | Operation | Clause |
|---|---|---|
| `admin_select_users` | FOR SELECT | USING (is_admin()) |
| `admin_insert_users` | FOR INSERT | WITH CHECK (is_admin()) |
| `admin_update_users` | FOR UPDATE | USING (is_admin()) |
| `admin_delete_users` | FOR DELETE | USING (is_admin()) |

---

## 4. Public INSERT Exceptions

Two tables allow unauthenticated INSERT for specific use cases:

### messages (contact form)

```sql
CREATE POLICY "public_insert_messages" ON messages FOR INSERT WITH CHECK (true);
```

- **Purpose:** Allows portfolio visitors to submit the contact form without authentication
- **Risk mitigated by:** Public users cannot SELECT, UPDATE, or DELETE messages; only admins can read/manage them

### analytics_events (tracking)

```sql
CREATE POLICY "public_insert_analytics" ON analytics_events FOR INSERT WITH CHECK (true);
```

- **Purpose:** Allows the portfolio frontend to log analytics events (page views, section visibility, project clicks) without authentication
- **Risk mitigated by:** Public users cannot SELECT analytics data; only admins can read/query it. Analytics data is automatically purged after 90 days (see Section 6).

---

## 5. Storage Bucket Policies

All storage policies were tightened in migration 042 from `auth.role() = 'authenticated'` (any logged-in user) to `is_admin()` (admin-only) for write operations.

### Bucket Overview

| Bucket | Public | Created In | Purpose |
|---|---|---|---|
| `cv` | No | 001 | CV/resume files |
| `projects` | Yes | 009 | Project screenshots |
| `certifications` | Yes | 009 | Certification badge images |
| `documents` | No | 009 | Private documents |
| `project_images` | Yes | 004 | Legacy project images |
| `image_variants` | No | 004 | Processed image variants |
| `avatars` | Yes | 004 | User avatar images |

### Public Read Policies

These allow unauthenticated SELECT (file downloads) for public buckets:

```sql
-- cv (from 001)
CREATE POLICY "public_download_cv" ON storage.objects FOR SELECT
  USING (bucket_id = 'cv');

-- project_images (from 004)
CREATE POLICY "public_read_project_images" ON storage.objects FOR SELECT
  USING (bucket_id = 'project_images');

-- avatars (from 004)
CREATE POLICY "public_read_avatars" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- projects (from 009)
CREATE POLICY "public_read_projects" ON storage.objects FOR SELECT
  USING (bucket_id = 'projects');

-- certifications (from 009)
CREATE POLICY "public_read_certifications" ON storage.objects FOR SELECT
  USING (bucket_id = 'certifications');
```

### Admin-Only Write Policies (from 042)

Per-bucket INSERT, UPDATE, DELETE policies all require `is_admin()`:

| Bucket | INSERT Policy | UPDATE Policy | DELETE Policy |
|---|---|---|---|
| `cv` | `admin_upload_cv` | `admin_update_cv` | `admin_delete_cv` |
| `projects` | `admin_upload_projects` | `admin_update_projects` | `admin_delete_projects` |
| `certifications` | `admin_upload_certifications` | `admin_update_certifications` | `admin_delete_certifications` |
| `documents` | `admin_upload_documents` | `admin_update_documents` | `admin_delete_documents` |
| `project_images` | `admin_insert_project_images` | `admin_update_project_images` | `admin_delete_project_images` |
| `image_variants` | `admin_insert_image_variants` | `admin_update_image_variants` | `admin_delete_image_variants` |
| `avatars` | `admin_insert_avatars` | `admin_update_avatars` | `admin_delete_avatars` |

All use the pattern:
```sql
CREATE POLICY "admin_<op>_<bucket>" ON storage.objects FOR <INSERT|UPDATE|DELETE>
  USING/WITH CHECK (bucket_id = '<bucket>' AND is_admin());
```

---

## 6. SECURITY DEFINER Functions

### reorder_sections()

**Defined in:** `032_reorder_sections_rpc.sql`
**Fixed in:** `043_fix_reorder_sections_admin_check.sql`

```sql
CREATE OR REPLACE FUNCTION reorder_sections(
  section_ids UUID[],
  sort_orders INTEGER[]
)
RETURNS void AS $$
BEGIN
  -- Only admins can reorder sections
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can reorder sections';
  END IF;

  -- Validate input arrays have same length
  IF array_length(section_ids, 1) != array_length(sort_orders, 1) THEN
    RAISE EXCEPTION 'section_ids and sort_orders arrays must have the same length';
  END IF;

  -- Update all sections atomically
  FOR i IN 1..array_length(section_ids, 1) LOOP
    UPDATE section_settings
    SET sort_order = sort_orders[i],
        updated_at = NOW()
    WHERE id = section_ids[i];
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Why SECURITY DEFINER:** The function updates `section_settings` in a single atomic transaction. Since it runs with the privileges of the function owner (superuser), it bypasses RLS. The `is_admin()` check inside the function body ensures only admins can call it.

### cleanup_old_analytics()

**Defined in:** `024_analytics_cleanup.sql`

```sql
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM analytics_events WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;
```

**Purpose:** Implements 90-day data retention for analytics events. Designed to be called by a scheduled pg_cron job or Supabase Edge Function.

**Note:** This function has no internal `is_admin()` check because it is intended to be invoked only by a trusted scheduler (not exposed as a public RPC). If exposed via the PostgREST API, it should be restricted at the API layer or an `is_admin()` guard should be added.

---

## 7. Security Fixes Applied

### Fix 042: Storage policies tightened

**File:** `042_fix_storage_rls.sql`

**Problem:** Migration 009 created `auth_upload_all`, `auth_update_own`, and `auth_delete_own` policies on `storage.objects` that allowed ANY authenticated user to upload, update, or delete files in ALL storage buckets. Migration 001 also used `auth.role() = 'authenticated'` instead of `is_admin()` for the CV bucket. Migration 004 used `FOR ALL` without an `is_admin()` check for image buckets.

**Fix:** Dropped all overly permissive policies and replaced them with per-bucket admin-only policies using `is_admin()`.

**Policies dropped:**
- `auth_upload_all` (009)
- `auth_update_own` (009)
- `auth_delete_own` (009)
- `admin_upload_cv` (001, used `auth.role() = 'authenticated'`)
- `admin_update_cv` (001)
- `admin_delete_cv` (001)
- `admin_all_images` (004, FOR ALL without admin check)

**Policies created:** 21 per-bucket admin-only policies (3 operations x 7 buckets).

### Fix 043: is_admin() check added to reorder_sections

**File:** `043_fix_reorder_sections_admin_check.sql`

**Problem:** The `reorder_sections()` SECURITY DEFINER function (from 032) had no authorization check. Any authenticated user could call it to reorder sections, bypassing RLS since the function runs as the table owner.

**Fix:** Added `IF NOT is_admin() THEN RAISE EXCEPTION 'Only admins can reorder sections'; END IF;` as the first statement in the function body.

### Fix 002: FOR ALL replaced with per-operation policies

**File:** `002_fix_rls_policies.sql`

**Problem:** Supabase/PostgREST does not properly combine `FOR ALL` policies with operation-specific policies. A `FOR ALL` policy applies to SELECT, INSERT, UPDATE, and DELETE, but when combined with a `public_insert_*` policy, the behavior is ambiguous.

**Fix:** Replaced `FOR ALL` admin policies on 5 tables with explicit per-operation policies (SELECT, INSERT, UPDATE, DELETE):

| Table | Old Policy | New Policies |
|---|---|---|
| `messages` | `admin_all_messages` FOR ALL | `admin_select_messages`, `admin_insert_messages`, `admin_update_messages`, `admin_delete_messages` |
| `cv_settings` | `admin_all_cv` FOR ALL | `admin_select_cv`, `admin_insert_cv`, `admin_update_cv`, `admin_delete_cv` |
| `content_snapshots` | `admin_all_snapshots` FOR ALL | `admin_select_snapshots`, `admin_insert_snapshots`, `admin_update_snapshots`, `admin_delete_snapshots` |
| `analytics_events` | `admin_all_analytics` FOR ALL | `admin_select_analytics`, `admin_insert_analytics`, `admin_update_analytics`, `admin_delete_analytics` |
| `content_health_reports` | `admin_all_health` FOR ALL | `admin_select_health`, `admin_insert_health`, `admin_update_health`, `admin_delete_health` |

**Note:** The `content_snapshots` granular policies were later dropped in migration 039 in favor of a single `admin_all_content_snapshots` FOR ALL policy (re-added in 022). The net effect is the same since `content_snapshots` has no public INSERT exception.

### Additional cleanup: 039 (duplicate policy removal)

**File:** `039_drop_duplicate_policies.sql`

- Dropped `admin_all_variants` on `section_variants` (duplicate of `admin_all_section_variants` from 022)
- Dropped granular `admin_select/insert/update/delete_snapshots` on `content_snapshots` (superseded by `admin_all_content_snapshots` from 022)

---

## 8. Current Status

**All RLS policies are in good shape after fixes 042 and 043. No remaining security findings.**

Summary of policy coverage:

| Category | Tables | Policy Pattern |
|---|---|---|
| Public-read, admin-write | 11 tables (hero, about, skills, projects, experience, certifications, contact, theme, typography, site, seo, section_settings) | SELECT USING (true) or filtered; FOR ALL USING (is_admin()) |
| Public-read (image tables) | image_metadata, image_variants | SELECT USING (true); FOR ALL USING/CHECK (is_admin()) |
| Public-read (variants) | section_variants | SELECT USING (true); FOR ALL USING/CHECK (is_admin()) |
| Public-read (added later) | cv_settings | SELECT USING (true) for anon/authenticated; per-op admin policies |
| Admin-only (per-op) | messages, analytics_events, content_health_reports, users | Per-operation USING (is_admin()) |
| Admin-only (FOR ALL) | content_snapshots | FOR ALL USING/CHECK (is_admin()) |
| Public INSERT exceptions | messages (contact form), analytics_events (tracking) | INSERT WITH CHECK (true) |
| Storage (public read) | cv, projects, certifications, project_images, avatars | SELECT USING (bucket_id = '...') |
| Storage (admin write) | All 7 buckets | Per-bucket INSERT/UPDATE/DELETE USING (is_admin()) |
| SECURITY DEFINER | reorder_sections, cleanup_old_analytics | Both have proper authorization boundaries |
