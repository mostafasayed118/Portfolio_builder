# Supabase Schema

## Tables (22)

### Singleton Tables (8)
Each has exactly one row, managed by the admin CMS.

| Table | Key Fields | RLS |
|-------|-----------|-----|
| `theme_settings` | `mode`, `light_*` (9 HSL colors), `dark_*` (9 HSL colors), `radius` | public read, admin write |
| `typography_settings` | `body_font`, `display_font`, `body_font_url`, `display_font_url`, `base_font_size`, `line_height`, `heading_scale` | public read, admin write |
| `site_settings` | `site_name`, `site_tagline`, `footer_text`, `copyright_text`, `logo_text`, `default_theme` | public read, admin write |
| `seo_settings` | `title`, `description`, `keywords`, `og_title`, `og_description`, `og_image`, `canonical_url`, `twitter_card`, `twitter_creator` | public read, admin write |
| `hero_content` | `heading`, `name`, `roles` (TEXT[]), `description`, `github_url`, `linkedin_url`, `email`, `available`, `cv_file_name`, `is_published` | public read, admin write |
| `about_content` | `bio1`, `bio2`, `location`, `years_of_experience`, `degree`, `school`, `grade`, `education_years`, `languages` (JSONB), `is_published` | public read, admin write |
| `contact_info` | `email`, `phone`, `location`, `github`, `linkedin`, `whatsapp`, `map_embed_url`, `availability_status`, `social_links` (JSONB) | public read, admin write |
| `cv_settings` | `object_path`, `file_name` | admin only (via API) |

### Collection Tables (10)
Each can have multiple rows, managed by the admin CMS.

| Table | Key Fields | Indexes | RLS |
|-------|-----------|---------|-----|
| `skills` | `name`, `category`, `proficiency`, `icon`, `sort_order`, `is_visible` | `idx_skills_category` | public read, admin write |
| `projects` | `title`, `description`, `tech_stack` (TEXT[]), `category`, `featured`, `github_url`, `live_url`, `metrics` (TEXT[]), `sort_order`, `is_published` | — | public read, admin write |
| `experience` | `title`, `company`, `location`, `period`, `description` (TEXT[]), `technologies` (TEXT[]), `type` (ENUM), `sort_order`, `is_published` | — | public read, admin write |
| `certifications` | `title`, `issuer`, `issuer_logo`, `date`, `date_sort`, `category`, `credential_url`, `sort_order`, `is_published` | — | public read, admin write |
| `messages` | `name`, `email`, `message`, `status` (ENUM), `reply_email_draft`, `replied_at` | `idx_messages_status`, `idx_messages_created_at` | admin all, public insert |
| `section_settings` | `key` (UNIQUE), `label`, `is_visible`, `sort_order` | `idx_section_settings_key`, `idx_section_settings_sort` | public read, admin write |
| `content_snapshots` | `entity_type`, `entity_id`, `version`, `data` (JSONB), `changed_by` | `idx_content_snapshots_entity`, `idx_content_snapshots_version` | admin only |
| `section_variants` | `section_key`, `variant_key`, `label`, `is_active`, `config` (JSONB), `preview_note` | `idx_section_variants_section`, `idx_section_variants_active` | public read, admin write |
| `analytics_events` | `type`, `path`, `section_key`, `project_id`, `device` | `idx_analytics_type`, `idx_analytics_created` | admin all, public insert |
| `content_health_reports` | `scope`, `issues` (JSONB), `critical_count`, `warning_count`, `suggestion_count` | `idx_content_health_scope` | admin only |

### Storage/Internal Tables

| Table | Key Fields | RLS |
|-------|-----------|-----|
| `image_metadata` | `storage_path`, `original_filename`, `mime_type`, `file_size_bytes`, `entity_type`, `entity_id` | admin all, public read |
| `image_variants` | `parent_image_id`, `variant_type`, `storage_path`, `width`, `height` | admin all |
| `users` | `clerk_id`, `email`, `name`, `role` | admin all |
| `reorder_sections` | (RPC function for batch section reordering) | admin only |

## Enums

```sql
CREATE TYPE theme_mode AS ENUM ('light', 'dark');
CREATE TYPE msg_status AS ENUM ('unread', 'read', 'archived');
CREATE TYPE exp_type AS ENUM ('internship', 'certification', 'volunteer');
```

## Storage

| Bucket | Visibility | Purpose |
|--------|-----------|---------|
| `cv` | Private (service role) | CV PDF files |

## Triggers

All tables with `updated_at` have a `BEFORE UPDATE` trigger that sets `updated_at = NOW()`.
