# Database Reference

> **Database:** Supabase (PostgreSQL)
> **Migrations:** 40 files in `supabase/migrations/` (001–040, with gaps)
> **Tables:** 21 in final schema
> **ENUMs:** 3

## Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

## ENUM Types

| Type | Values | Usage |
|------|--------|-------|
| `theme_mode` | `light`, `dark` | `theme_settings.mode`, `site_settings.default_theme` |
| `msg_status` | `unread`, `read`, `archived` | `messages.status` |
| `exp_type` | `internship`, `certification`, `volunteer` | `experience.type` |

## Tables

### Singleton Tables (8)

Each has exactly one row, managed by the admin CMS.

#### `theme_settings`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` PK |
| `mode` | theme_mode | NOT NULL | `'light'` |
| `light_primary` | TEXT | NOT NULL | `'204 92% 42%'` |
| `light_accent` | TEXT | NOT NULL | `'189 90% 38%'` |
| `light_background` | TEXT | NOT NULL | `'220 30% 97%'` |
| `light_foreground` | TEXT | NOT NULL | `'222 40% 10%'` |
| `light_card` | TEXT | NOT NULL | `'0 0% 100%'` |
| `light_border` | TEXT | NOT NULL | `'220 18% 84%'` |
| `light_muted` | TEXT | NOT NULL | `'220 20% 91%'` |
| `light_muted_foreground` | TEXT | NOT NULL | `'220 15% 42%'` |
| `light_ring` | TEXT | NOT NULL | `'204 92% 45%'` |
| `dark_primary` | TEXT | NOT NULL | `'204 92% 62%'` |
| `dark_accent` | TEXT | NOT NULL | `'189 95% 53%'` |
| `dark_background` | TEXT | NOT NULL | `'222 48% 6%'` |
| `dark_foreground` | TEXT | NOT NULL | `'210 30% 96%'` |
| `dark_card` | TEXT | NOT NULL | `'222 40% 9%'` |
| `dark_border` | TEXT | NOT NULL | `'220 22% 18%'` |
| `dark_muted` | TEXT | NOT NULL | `'222 32% 12%'` |
| `dark_muted_foreground` | TEXT | NOT NULL | `'215 18% 72%'` |
| `dark_ring` | TEXT | NOT NULL | `'204 92% 62%'` |
| `radius` | TEXT | NOT NULL | `'0.9rem'` |
| `created_at` | TIMESTAMPTZ | nullable | `NOW()` |
| `updated_at` | TIMESTAMPTZ | nullable | `NOW()` |

#### `typography_settings`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` PK |
| `body_font` | TEXT | NOT NULL | `'Spline Sans'` |
| `display_font` | TEXT | NOT NULL | `'Unbounded'` |
| `body_font_url` | TEXT | nullable | null |
| `display_font_url` | TEXT | nullable | null |
| `base_font_size` | TEXT | NOT NULL | `'16px'` |
| `line_height` | TEXT | NOT NULL | `'1.6'` |
| `letter_spacing` | TEXT | NOT NULL | `'0em'` |
| `heading_scale` | TEXT | NOT NULL | `'1.25'` |
| `font_weight_body` | TEXT | NOT NULL | `'400'` |
| `font_weight_heading` | TEXT | NOT NULL | `'700'` |
| `created_at` | TIMESTAMPTZ | nullable | `NOW()` |
| `updated_at` | TIMESTAMPTZ | nullable | `NOW()` |

#### `site_settings`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` PK |
| `site_name` | TEXT | NOT NULL | `'Mustafa Sayed'` |
| `site_tagline` | TEXT | NOT NULL | `'Data Engineer'` |
| `footer_text` | TEXT | NOT NULL | `'Built with passion and a lot of coffee.'` |
| `copyright_text` | TEXT | NOT NULL | `'© Mustafa Sayed. All rights reserved.'` |
| `logo_text` | TEXT | NOT NULL | `'MS'` |
| `default_theme` | theme_mode | NOT NULL | `'dark'` |
| `language_mode` | TEXT | nullable | `'en_only'` CHECK `IN ('en_only','ar_only','both')` |
| `default_language` | TEXT | nullable | `'en'` CHECK `IN ('en','ar')` |
| `show_language_toggle` | BOOLEAN | nullable | `false` |
| `rtl_enabled` | BOOLEAN | nullable | `false` |
| `created_at` | TIMESTAMPTZ | nullable | `NOW()` |
| `updated_at` | TIMESTAMPTZ | nullable | `NOW()` |

#### `seo_settings`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` PK |
| `title` | TEXT | NOT NULL | `'Mustafa Sayed — Data Engineer'` |
| `description` | TEXT | NOT NULL | `'Data Engineer specializing in...'` |
| `keywords` | TEXT | NOT NULL | `'data engineer, ETL, ...'` |
| `og_title` | TEXT | NOT NULL | `'Mustafa Sayed — Data Engineer'` |
| `og_description` | TEXT | NOT NULL | `'Building scalable data pipelines...'` |
| `og_image` | TEXT | nullable | null |
| `canonical_url` | TEXT | NOT NULL | `'https://mustafasayed.replit.app'` |
| `twitter_card` | TEXT | NOT NULL | `'summary_large_image'` |
| `twitter_creator` | TEXT | nullable | null |
| `created_at` | TIMESTAMPTZ | nullable | `NOW()` |
| `updated_at` | TIMESTAMPTZ | nullable | `NOW()` |

#### `hero_content`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` PK |
| `heading` | TEXT | NOT NULL | `'Hi, I''m'` |
| `name` | TEXT | NOT NULL | `'Mustafa Sayed'` |
| `roles` | TEXT[] | NOT NULL | `'{"Data Engineer","ETL Developer",...}'` |
| `description` | TEXT | NOT NULL | (long default) |
| `github_url` | TEXT | NOT NULL | `'https://github.com/mustafasayed'` |
| `linkedin_url` | TEXT | NOT NULL | `'https://linkedin.com/in/mustafasayed'` |
| `email` | TEXT | NOT NULL | `'admin@example.com'` |
| `available` | BOOLEAN | NOT NULL | `true` |
| `cv_file_name` | TEXT | nullable | null |
| `is_published` | BOOLEAN | NOT NULL | `true` |
| `avatar_url` | TEXT | nullable | null |
| `twitter_url` | TEXT | nullable | null |
| `cv_url` | TEXT | nullable | null |
| `stats` | JSONB | nullable | null |
| `site_name` | TEXT | nullable | null |
| `logo_url` | TEXT | nullable | null |
| `favicon_url` | TEXT | nullable | null |
| `tagline` | TEXT | nullable | null |
| `name_ar` | TEXT | nullable | null |
| `description_ar` | TEXT | nullable | null |
| `heading_ar` | TEXT | nullable | null |
| `created_at` | TIMESTAMPTZ | nullable | `NOW()` |
| `updated_at` | TIMESTAMPTZ | nullable | `NOW()` |

CHECK: `heading` length 1–200, `name` length 1–100.

#### `about_content`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` PK |
| `bio1` | TEXT | NOT NULL | (default bio text) |
| `bio2` | TEXT | NOT NULL | (default bio text) |
| `location` | TEXT | NOT NULL | `'Cairo, Egypt'` |
| `years_of_experience` | INTEGER | NOT NULL | `1` |
| `degree` | TEXT | NOT NULL | `'B.Sc. Statistics & Computer Science'` |
| `school` | TEXT | NOT NULL | `'Ain Shams University'` |
| `grade` | TEXT | NOT NULL | `'Very Good'` |
| `education_years` | TEXT | NOT NULL | `'2020 – 2024'` |
| `languages` | JSONB | NOT NULL | `[{"lang":"Arabic","level":"Native","pct":100},...]` |
| `is_published` | BOOLEAN | NOT NULL | `true` |
| `bio` | TEXT | nullable | null |
| `education` | JSONB | nullable | `'[]'` |
| `interests` | JSONB | nullable | `'[]'` |
| `bio1_ar` | TEXT | nullable | null |
| `bio2_ar` | TEXT | nullable | null |
| `bio_ar` | TEXT | nullable | null |
| `created_at` | TIMESTAMPTZ | nullable | `NOW()` |
| `updated_at` | TIMESTAMPTZ | nullable | `NOW()` |

#### `contact_info`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` PK |
| `email` | TEXT | nullable | null |
| `phone` | TEXT | nullable | null |
| `location` | TEXT | nullable | null |
| `address` | TEXT | nullable | null |
| `github` | TEXT | nullable | null |
| `linkedin` | TEXT | nullable | null |
| `whatsapp` | TEXT | nullable | null |
| `map_embed_url` | TEXT | nullable | null |
| `availability_status` | TEXT | nullable | `'Open to opportunities'` |
| `working_hours` | TEXT | nullable | null |
| `social_links` | JSONB | nullable | `'[]'` |
| `created_at` | TIMESTAMPTZ | nullable | `NOW()` |
| `updated_at` | TIMESTAMPTZ | nullable | `NOW()` |

CHECK: `email` valid email or NULL, `github`/`linkedin` start with `https?://` or NULL.

#### `cv_settings`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` PK |
| `object_path` | TEXT | NOT NULL | |
| `file_name` | TEXT | NOT NULL | |
| `created_at` | TIMESTAMPTZ | nullable | `NOW()` |
| `updated_at` | TIMESTAMPTZ | nullable | `NOW()` |

CHECK: `file_name` must end in `.pdf`, `object_path` must be non-empty.

---

### Collection Tables (13)

#### `skills`

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` PK | |
| `name` | TEXT | NOT NULL | | UNIQUE, length 1–100 |
| `category` | TEXT | NOT NULL | | |
| `proficiency` | INTEGER | NOT NULL | | 1–100 |
| `icon` | TEXT | nullable | null | |
| `sort_order` | INTEGER | nullable | `0` | >= 0 |
| `is_visible` | BOOLEAN | nullable | `true` | |
| `category_ar` | TEXT | nullable | null | |
| `deleted_at` | TIMESTAMPTZ | nullable | null | soft delete |
| `user_id` | UUID | nullable | null | FK → users(id) CASCADE |
| `created_at` | TIMESTAMPTZ | nullable | `NOW()` | |
| `updated_at` | TIMESTAMPTZ | nullable | `NOW()` | |

Indexes: `idx_skills_category`, `idx_skills_sort_order`, `idx_skills_is_visible`, `idx_skills_deleted` (partial), `idx_skills_user`.

#### `projects`

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` PK | |
| `title` | TEXT | NOT NULL | | length 1–150 |
| `description` | TEXT | NOT NULL | | length 10–2000 |
| `tech_stack` | TEXT[] | nullable | `'{}'` | |
| `category` | TEXT | nullable | null | |
| `featured` | BOOLEAN | nullable | `false` | |
| `github_url` | TEXT | nullable | null | |
| `live_url` | TEXT | nullable | null | |
| `slug` | TEXT | NOT NULL | | UNIQUE |
| `metrics` | TEXT[] | nullable | `'{}'` | |
| `sort_order` | INTEGER | nullable | null | |
| `is_published` | BOOLEAN | nullable | `false` | |
| `image_url` | TEXT | nullable | null | |
| `tags` | TEXT[] | nullable | `'{}'` | |
| `full_description` | TEXT | nullable | null | |
| `challenges` | TEXT | nullable | null | |
| `outcome` | TEXT | nullable | null | |
| `completed_at` | TEXT | nullable | null | |
| `title_ar` | TEXT | nullable | null | |
| `description_ar` | TEXT | nullable | null | |
| `deleted_at` | TIMESTAMPTZ | nullable | null | soft delete |
| `user_id` | UUID | nullable | null | FK → users(id) CASCADE |
| `created_at` | TIMESTAMPTZ | nullable | `NOW()` | |
| `updated_at` | TIMESTAMPTZ | nullable | `NOW()` | |

Indexes: `idx_projects_sort_order`, `idx_projects_category`, `idx_projects_featured` (partial), `idx_projects_slug`, `idx_projects_is_published`, `idx_projects_deleted` (partial), `idx_projects_user`.

#### `experience`

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` PK | |
| `title` | TEXT | NOT NULL | | length 1–150 |
| `company` | TEXT | NOT NULL | | length 1–150 |
| `location` | TEXT | NOT NULL | | |
| `period` | TEXT | NOT NULL | | |
| `description` | TEXT[] | nullable | `'{}'` | |
| `technologies` | TEXT[] | nullable | `'{}'` | |
| `type` | exp_type | NOT NULL | | `internship`, `certification`, `volunteer` |
| `sort_order` | INTEGER | nullable | null | |
| `is_published` | BOOLEAN | nullable | `false` | |
| `current` | BOOLEAN | nullable | `false` | |
| `order_num` | INTEGER | nullable | null | |
| `title_ar` | TEXT | nullable | null | |
| `company_ar` | TEXT | nullable | null | |
| `description_ar` | TEXT[] | nullable | null | |
| `location_ar` | TEXT | nullable | null | |
| `deleted_at` | TIMESTAMPTZ | nullable | null | soft delete |
| `user_id` | UUID | nullable | null | FK → users(id) CASCADE |
| `created_at` | TIMESTAMPTZ | nullable | `NOW()` | |
| `updated_at` | TIMESTAMPTZ | nullable | `NOW()` | |

Indexes: `idx_experience_sort_order`, `idx_experience_is_published`, `idx_experience_deleted` (partial), `idx_experience_user`.

#### `certifications`

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` PK | |
| `title` | TEXT | NOT NULL | | length 1–200 |
| `issuer` | TEXT | NOT NULL | | |
| `issuer_logo` | TEXT | nullable | null | |
| `date` | TEXT | NOT NULL | | |
| `date_sort` | TEXT | nullable | null | |
| `category` | TEXT | nullable | null | |
| `credential_url` | TEXT | nullable | null | `https?://` or empty or NULL |
| `credential_id` | TEXT | nullable | null | |
| `sort_order` | INTEGER | nullable | null | |
| `is_published` | BOOLEAN | nullable | `false` | |
| `skills` | TEXT[] | nullable | `'{}'` | |
| `title_ar` | TEXT | nullable | null | |
| `issuer_ar` | TEXT | nullable | null | |
| `deleted_at` | TIMESTAMPTZ | nullable | null | soft delete |
| `user_id` | UUID | nullable | null | FK → users(id) CASCADE |
| `created_at` | TIMESTAMPTZ | nullable | `NOW()` | |
| `updated_at` | TIMESTAMPTZ | nullable | `NOW()` | |

#### `messages`

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` PK | |
| `name` | TEXT | NOT NULL | | length 1–100 |
| `email` | TEXT | NOT NULL | | valid email regex |
| `message` | TEXT | NOT NULL | | length 10–2000 |
| `status` | msg_status | NOT NULL | `'unread'` | `unread`, `read`, `archived` |
| `subject` | TEXT | nullable | null | |
| `reply_email_draft` | TEXT | nullable | null | |
| `replied_at` | TIMESTAMPTZ | nullable | null | |
| `deleted_at` | TIMESTAMPTZ | nullable | null | soft delete |
| `user_id` | UUID | nullable | null | FK → users(id) CASCADE |
| `created_at` | TIMESTAMPTZ | nullable | `NOW()` | |
| `updated_at` | TIMESTAMPTZ | nullable | `NOW()` | |

Indexes: `idx_messages_status`, `idx_messages_created_at`, `idx_messages_subject`, `idx_messages_status_created` (composite), `idx_messages_deleted` (partial), `idx_messages_status_active` (partial composite), `idx_messages_user`.

#### `section_settings`

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` PK | |
| `key` | TEXT | NOT NULL | | UNIQUE |
| `label` | TEXT | NOT NULL | | |
| `is_visible` | BOOLEAN | NOT NULL | `true` | |
| `sort_order` | INTEGER | NOT NULL | `0` | |
| `created_at` | TIMESTAMPTZ | nullable | `NOW()` | |
| `updated_at` | TIMESTAMPTZ | nullable | `NOW()` | |

#### `content_snapshots`

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` PK | |
| `entity_type` | TEXT | NOT NULL | | CHECK: 13 allowed values |
| `entity_id` | TEXT | NOT NULL | | |
| `version` | INTEGER | NOT NULL | `1` | |
| `data` | JSONB | NOT NULL | `'{}'` | |
| `changed_by` | TEXT | nullable | null | |
| `created_at` | TIMESTAMPTZ | nullable | `NOW()` | |

> Polymorphic reference: `entity_type` + `entity_id` reference different tables. FK constraints intentionally omitted — integrity enforced at application layer.

#### `section_variants`

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` PK | |
| `section_key` | TEXT | NOT NULL | | |
| `variant_key` | TEXT | NOT NULL | | |
| `label` | TEXT | NOT NULL | | |
| `is_active` | BOOLEAN | NOT NULL | `false` | |
| `config` | JSONB | NOT NULL | `'{}'` | |
| `preview_note` | TEXT | nullable | null | |
| `created_at` | TIMESTAMPTZ | nullable | `NOW()` | |
| `updated_at` | TIMESTAMPTZ | nullable | `NOW()` | |

UNIQUE: `(section_key, variant_key)`.

#### `analytics_events`

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` PK | |
| `type` | TEXT | NOT NULL | | |
| `path` | TEXT | nullable | null | |
| `section_key` | TEXT | nullable | null | FK → section_settings(key) SET NULL |
| `project_id` | UUID | nullable | null | FK → projects(id) SET NULL |
| `preset_id` | TEXT | nullable | null | |
| `referrer` | TEXT | nullable | null | |
| `device` | TEXT | nullable | null | |
| `created_at` | TIMESTAMPTZ | nullable | `NOW()` | |
| `updated_at` | TIMESTAMPTZ | nullable | `NOW()` | |

#### `content_health_reports`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` PK |
| `scope` | TEXT | NOT NULL | |
| `issues` | JSONB | NOT NULL | `'[]'` |
| `critical_count` | INTEGER | NOT NULL | `0` |
| `warning_count` | INTEGER | NOT NULL | `0` |
| `suggestion_count` | INTEGER | NOT NULL | `0` |
| `generated_at` | TIMESTAMPTZ | nullable | `NOW()` |
| `updated_at` | TIMESTAMPTZ | nullable | `NOW()` |

#### `image_metadata`

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` PK | |
| `storage_path` | TEXT | NOT NULL | | |
| `original_filename` | TEXT | NOT NULL | | |
| `mime_type` | TEXT | NOT NULL | | |
| `width` | INTEGER | nullable | null | |
| `height` | INTEGER | nullable | null | |
| `file_size_bytes` | BIGINT | NOT NULL | | |
| `blur_hash` | TEXT | nullable | null | |
| `dominant_color` | TEXT | nullable | null | |
| `alt_text` | TEXT | nullable | null | |
| `entity_type` | TEXT | NOT NULL | | |
| `entity_id` | UUID | nullable | null | FK → projects(id) CASCADE |
| `sort_order` | INTEGER | nullable | `0` | |
| `created_at` | TIMESTAMPTZ | nullable | `NOW()` | |
| `updated_at` | TIMESTAMPTZ | nullable | `NOW()` | |

#### `image_variants`

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` PK | |
| `parent_image_id` | UUID | nullable | null | FK → image_metadata(id) CASCADE |
| `variant_type` | TEXT | NOT NULL | | |
| `storage_path` | TEXT | NOT NULL | | |
| `width` | INTEGER | nullable | null | |
| `height` | INTEGER | nullable | null | |
| `file_size_bytes` | BIGINT | nullable | null | |
| `created_at` | TIMESTAMPTZ | nullable | `NOW()` | |
| `updated_at` | TIMESTAMPTZ | nullable | `NOW()` | |

#### `users`

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` PK | |
| `clerk_id` | TEXT | NOT NULL | | UNIQUE |
| `email` | TEXT | NOT NULL | | UNIQUE |
| `name` | TEXT | nullable | null | |
| `role` | TEXT | NOT NULL | `'user'` | CHECK `IN ('user','superadmin')` |
| `created_at` | TIMESTAMPTZ | nullable | `NOW()` | |
| `updated_at` | TIMESTAMPTZ | nullable | `NOW()` | |

## Functions

### `update_updated_at()`
Trigger function. Sets `NEW.updated_at = NOW()` on every UPDATE. Applied as BEFORE UPDATE trigger on all 20 tables with an `updated_at` column.

### `is_admin()`
RLS helper. Checks if the JWT email matches one of the comma-separated emails in `app.admin_emails` setting:
```sql
current_setting('request.jwt.claims', true)::jsonb ->> 'email'
= ANY(string_to_array(current_setting('app.admin_emails', true), ','))
```

### `cleanup_old_analytics()`
Deletes analytics events older than 90 days. SECURITY DEFINER.

### `reorder_sections(UUID[], INTEGER[])`
RPC function for batch-updating section sort orders. SECURITY DEFINER. Validates array lengths match.

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

| Bucket | Public | Purpose | Policies |
|--------|--------|---------|----------|
| `cv` | No | CV PDF files | Admin upload/download/delete, public download via API proxy |
| `project_images` | Yes | Project screenshots | Public read, admin write |
| `image_variants` | No | Processed variants | Admin only |
| `avatars` | Yes | Profile images | Public read, admin write |
| `projects` | Yes | Project screenshots | Public read, admin write |
| `certifications` | Yes | Badge images | Public read, admin write |
| `documents` | No | General documents | Authenticated write |
