# Migration Checklist

All 47 Supabase migrations for the portfolio project, listed in order.

Numbering is contiguous `001`–`047` (no gaps). Earlier development had gaps at
010 and 016–019; those were filled when the migration set was consolidated.

| #   | File                                       | Purpose                                                                           |
| --- | ------------------------------------------ | --------------------------------------------------------------------------------- |
| 001 | `001_init.sql`                             | Full schema: 18 tables, enums, indexes, triggers, RLS, seed data, storage buckets |
| 002 | `002_fix_rls_policies.sql`                 | Fix RLS policies that use `FOR ALL`                                               |
| 003 | `003_constraints.sql`                      | Database-level input validation (CHECK, NOT NULL, UNIQUE)                         |
| 004 | `004_images.sql`                           | Image pipeline infrastructure — storage buckets, metadata tables, RLS             |
| 005 | `005_contact_messages.sql`                 | Contact messages table with subject support                                       |
| 006 | `006_hero_fields.sql`                      | Add avatar_url, twitter_url, cv_url, stats columns to hero_content                |
| 007 | `007_about_fields.sql`                     | Add bio, education, languages, interests columns to about_content                 |
| 008 | `008_projects_missing_fields.sql`          | Add full_description, challenges, outcome, completed_at to projects               |
| 009 | `009_storage_buckets.sql`                  | Additional storage buckets for uploads                                            |
| 010 | `010_sort_order.sql`                       | Initialize sort_order values from current row order                               |
| 011 | `011_fix_cert_url_constraint.sql`          | Relax chk_cert_url to allow empty strings alongside valid URLs                    |
| 012 | `012_dynamic_branding.sql`                 | Add dynamic branding fields (site_name, logo_url, favicon_url, tagline)           |
| 013 | `013_updated_at_triggers.sql`              | `update_updated_at()` trigger function                                            |
| 014 | `014_missing_indexes.sql`                  | Indexes for frequently queried columns                                            |
| 015 | `015_bilingual_content.sql`                | Arabic content columns (`_ar` suffix) across content tables                       |
| 016 | `016_language_settings.sql`                | Language control settings for the bilingual portfolio                             |
| 017 | `017_image_rls.sql`                        | Enable RLS on image_metadata and image_variants                                   |
| 018 | `018_fix_duplicate_triggers.sql`           | Remove duplicate trigger on image_metadata                                        |
| 019 | `019_analytics_cleanup.sql`                | `cleanup_old_analytics()` function (90-day retention)                             |
| 020 | `020_fk_constraints.sql`                   | Foreign key constraints + UNIQUE projects.slug                                    |
| 021 | `021_add_missing_indexes.sql`              | Indexes on foreign key columns for query performance                              |
| 022 | `022_fk_cascade_and_migration.sql`         | ON DELETE CASCADE for image_metadata + analytics_events.project_id FK             |
| 023 | `023_consolidate_messages.sql`             | Consolidate contact_messages into messages (safe & idempotent)                    |
| 024 | `024_fix_critical_issues.sql`              | UNIQUE projects.slug + RLS fixes + dedupe triggers/indexes                        |
| 025 | `025_add_soft_delete.sql`                  | Soft-delete (`deleted_at`) on collection tables                                   |
| 026 | `026_messages_constraints.sql`             | messages.status FK to msg_status enum + composite indexes                         |
| 027 | `027_reorder_sections_rpc.sql`             | `reorder_sections()` SECURITY DEFINER RPC                                         |
| 028 | `028_image_variants_index.sql`             | Index on image_variants.parent_image_id                                           |
| 029 | `029_users_table.sql`                      | users table (Clerk integration) + user_id on collections                          |
| 030 | `030_drop_duplicates.sql`                  | Drop duplicate constraints and indexes                                            |
| 031 | `031_fix_description_ar.sql`               | experience.description_ar type fix (TEXT[] to match description)                  |
| 032 | `032_cleanup.sql`                          | Drop legacy contact_messages table                                                |
| 033 | `033_snapshot_constraints.sql`             | CHECK constraint on content_snapshots.entity_type                                 |
| 034 | `034_drop_duplicate_policies.sql`          | Drop duplicate RLS policies                                                       |
| 035 | `035_backfill_project_slugs.sql`           | Backfill project slugs + enforce NOT NULL/UNIQUE                                  |
| 036 | `036_public_cv_settings_read.sql`          | Public read access for cv_settings                                                |
| 037 | `037_fix_storage_rls.sql`                  | Fix overly permissive storage bucket policies (admin-only)                        |
| 038 | `038_fix_reorder_sections_admin_check.sql` | is_admin() check on the reorder_sections RPC                                      |
| 039 | `039_fix_is_admin_function.sql`            | Fix is_admin() function (email allowlist)                                         |
| 040 | `040_add_proficiency_check.sql`            | Defense-in-depth CHECK constraints on proficiency columns                         |
| 041 | `041_content_snapshots_unique_version.sql` | content_snapshots version uniqueness                                              |
| 042 | `042_full_setup.sql`                       | Full setup script (is_admin function, GUC)                                        |
| 043 | `043_fix_missing_rls_policies.sql`         | Add missing RLS policies                                                          |
| 044 | `044_contact_spam_guard.sql`               | Contact spam guard (rate-limit helper)                                            |
| 045 | `045_admin_is_admin_users_table.sql`       | is_admin() via users table (avoids ALTER DATABASE GUC)                            |
| 046 | `046_blog_posts.sql`                       | blog_posts table + RLS                                                            |
| 047 | `047_singleton_table_guard.sql`            | Singleton row guards (hero/about/site_settings)                                   |

## Summary

- **Total migrations:** 47
- **Numbered range:** 001–047 (contiguous, no gaps)
- **Schema source of truth:** `001_init.sql` + follow-on migrations; `042_full_setup.sql` is the consolidated setup script.
