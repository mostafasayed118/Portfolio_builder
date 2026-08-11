# Database Reference

> **Database:** Supabase (PostgreSQL)
> **Migrations:** 43 files in `supabase/migrations/` (001–043)
> **Tables:** 21 in final schema
> **ENUMs:** 3

## Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

## ENUM Types

| Type         | Values                                     | Usage                                                |
| ------------ | ------------------------------------------ | ---------------------------------------------------- |
| `theme_mode` | `light`, `dark`                            | `theme_settings.mode`, `site_settings.default_theme` |
| `msg_status` | `unread`, `read`, `archived`               | `messages.status`                                    |
| `exp_type`   | `internship`, `certification`, `volunteer` | `experience.type`                                    |

## Tables

### Singleton Tables (8)

Each has exactly one row, managed by the admin CMS.

#### `theme_settings` — 25 columns: mode, light*\*/dark*\* HSL colors, radius, timestamps

#### `typography_settings` — 12 columns: body_font, display_font, font_urls, base_font_size, line_height, letter_spacing, heading_scale, font weights, timestamps

#### `site_settings` — 12 columns: site_name, site_tagline, footer_text, copyright_text, logo_text, default_theme, language_mode (en_only/ar_only/both), default_language (en/ar), show_language_toggle, rtl_enabled, timestamps

#### `seo_settings` — 10 columns: title, description, keywords, og\_\*, canonical_url, twitter_card, twitter_creator, timestamps

#### `hero_content` — 24 columns: heading, name, roles[], description, \*\_ar, github/linkedin/twitter URLs, avatar_url, cv_url, stats JSONB, available, site_name, logo_url, favicon_url, tagline, cv_file_name, is_published, timestamps. CHECKS: heading 1–200, name 1–100.

#### `about_content` — 18 columns: bio1, bio2, location, years_of_experience, degree, school, grade, education_years, languages JSONB, languages_ar JSONB, interests JSONB, is_published, bio, education JSONB, \*\_ar, timestamps

#### `contact_info` — 12 columns: email, phone, location, address, github, linkedin, whatsapp, map_embed_url, availability_status, working_hours, social_links JSONB, timestamps. CHECKS: email valid or NULL, github/linkedin start with `https?://` or NULL.

#### `cv_settings` — 4 columns: object_path, file_name, timestamps. CHECKS: file_name ends in `.pdf`, object_path non-empty.

### Collection Tables (13)

#### `skills` — id PK, name UNIQUE, category, category_ar, proficiency (1–100), icon, sort_order (>=0), is_visible, user_id (FK users CASCADE), deleted_at, timestamps. Indexes: category, sort_order, is_visible, deleted (partial, idx_skills_deleted), user.

#### `projects` — id PK, title (1–150), description (10–2000), full_description, challenges, outcome, \*\_ar, completed_at, tech_stack[], category, featured, github_url, live_url, slug UNIQUE NOT NULL (backfilled in migration 035), metrics[], sort_order, is_published, image_url, tags[], user_id (FK users CASCADE), deleted_at, timestamps. Indexes: sort_order, category, featured (partial), slug, is_published, deleted (partial), user.

#### `experience` — id PK, title (1–150), company (1–150), location, period, description[], technologies[], type (exp_type), sort_order, is_published, current, order_num, \*\_ar, user_id (FK users CASCADE), deleted_at, timestamps. Indexes: sort_order, is_published, deleted (partial), user.

#### `certifications` — id PK, title (1–200), issuer, issuer_logo, date, date_sort, category, credential_url (`https?://` or NULL), credential_id, sort_order, is_published, skills[], \*\_ar, user_id (FK users CASCADE), deleted_at, timestamps. Indexes: user, is_published, sort_order.

#### `messages` — id PK, name (1–100), email (valid regex), message (10–2000), status (msg_status), subject, reply_email_draft, replied_at, user_id (FK users CASCADE), deleted_at, timestamps. Indexes: status, created_at, subject, status+created (composite), deleted (partial), status+status_active (partial composite), user.

#### `section_settings` — id PK, key UNIQUE, label, is_visible, sort_order, timestamps.

#### `content_snapshots` — id PK, entity_type (CHECK: 13 allowed values), entity_id, version, data JSONB, changed_by, created_at. Polymorphic reference (no FK).

#### `section_variants` — id PK, section_key, variant_key, label, is_active, config JSONB, preview_note, timestamps. UNIQUE(section_key, variant_key).

#### `analytics_events` — id PK, type, path, section_key (FK section_settings SET NULL), project_id (FK projects SET NULL), preset_id, referrer, device, timestamps.

#### `content_health_reports` — id PK, scope, issues JSONB, critical_count, warning_count, suggestion_count, generated_at, timestamps.

#### `image_metadata` — id PK, storage_path, original_filename, mime_type, width, height, file_size_bytes, blur_hash, dominant_color, alt_text, entity_type, entity_id (FK projects CASCADE), sort_order, timestamps.

#### `image_variants` — id PK, parent_image_id (FK image_metadata CASCADE), variant_type, storage_path, width, height, file_size_bytes, timestamps.

#### `users` — id PK, clerk_id UNIQUE NOT NULL, email UNIQUE NOT NULL, name, role CHECK(IN 'user','superadmin'), timestamps.

## Functions

### `update_updated_at()`

Trigger function. Sets `NEW.updated_at = NOW()` on every UPDATE. Applied as BEFORE UPDATE trigger on all 20 tables with an `updated_at` column.

### `is_admin()` (migration 039, latest version)

RLS helper. Prefers Supabase-native `auth.jwt()` over legacy GUC:

```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
  allowlist TEXT;
  allow_guc_fallback TEXT;
BEGIN
  BEGIN
    user_email := auth.jwt() ->> 'email';
  EXCEPTION WHEN OTHERS THEN user_email := NULL; END;

  IF user_email IS NULL OR user_email = '' THEN
    BEGIN
      allow_guc_fallback := current_setting('app.allow_guc_admin_fallback', true);
    EXCEPTION WHEN OTHERS THEN allow_guc_fallback := NULL; END;
    IF allow_guc_fallback = 'on' THEN
      BEGIN
        user_email := current_setting('request.jwt.claims', true)::jsonb ->> 'email';
      EXCEPTION WHEN OTHERS THEN user_email := NULL; END;
    END IF;
  END IF;

  IF user_email IS NULL OR user_email = '' THEN RETURN FALSE; END IF;

  allowlist := current_setting('app.admin_emails', true);
  IF allowlist IS NULL OR allowlist = '' THEN RETURN FALSE; END IF;

  RETURN lower(user_email) = ANY(string_to_array(lower(allowlist), ','));
END;
$$ LANGUAGE plpgsql STABLE;
```

Admin emails set at database level (migration 042):

```sql
ALTER DATABASE postgres SET app.admin_emails = 'email1@example.com,email2@example.com';
```

### `cleanup_old_analytics()`

Deletes analytics events older than 90 days. SECURITY DEFINER.

### `reorder_sections(UUID[], INTEGER[])`

RPC function for batch-updating section sort orders. SECURITY DEFINER. Includes `is_admin()` check. Validates array lengths match.

## RLS Policies

### Public-Read Tables (14)

Anyone can SELECT; only admins (via `is_admin()`) can INSERT/UPDATE/DELETE.

`hero_content`, `about_content`, `contact_info`, `theme_settings`, `typography_settings`, `site_settings`, `seo_settings`, `section_settings`, `section_variants`, `image_metadata`, `image_variants`

Collection tables filter public reads:

- `skills`: `is_visible = true AND deleted_at IS NULL`
- `projects`: `is_published = true AND deleted_at IS NULL`
- `experience`: `is_published = true AND deleted_at IS NULL`
- `certifications`: `is_published = true AND deleted_at IS NULL`

### Admin-Only Tables (7)

No public SELECT. Admins have full CRUD. Public can INSERT only into `messages` and `analytics_events`.

`messages`, `cv_settings`, `content_snapshots`, `analytics_events`, `content_health_reports`, `users`

## Storage Buckets

| Bucket           | Public | Purpose             | Policies                                                                        |
| ---------------- | ------ | ------------------- | ------------------------------------------------------------------------------- |
| `cv`             | No     | CV PDF files        | Admin upload/download/delete (uses `is_admin()`), public download via API proxy |
| `project_images` | Yes    | Project screenshots | Public read, admin write (uses `is_admin()`)                                    |
| `image_variants` | No     | Processed variants  | Admin only (uses `is_admin()`)                                                  |
| `avatars`        | Yes    | Profile images      | Public read, admin write (uses `is_admin()`)                                    |
| `projects`       | Yes    | Project screenshots | Public read, admin write (uses `is_admin()`)                                    |
| `certifications` | Yes    | Badge images        | Public read, admin write (uses `is_admin()`)                                    |
| `documents`      | No     | General documents   | Admin only (uses `is_admin()`)                                                  |

> All storage policies were hardened in migration 037 to use `is_admin()` instead of the previous `auth.role() = 'authenticated'`.
