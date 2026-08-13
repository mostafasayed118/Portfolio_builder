# Migration Checklist

All 43 Supabase migrations for the portfolio project, listed in order.

Gaps exist at 010, 016–019 — these numbers were never assigned.

| # | File | Purpose | Tables Affected | Corrective? |
|---|------|---------|-----------------|-------------|
| 001 | `001_init.sql` | Full schema: 18 tables, enums, indexes, triggers, RLS, seed data, storage buckets | All core tables (hero_content, about_content, projects, skills, experience, certifications, contact_info, messages, analytics, cv_settings, theme_settings, site_settings, seo_settings, section_settings, content_snapshots, section_variants, collections, collection_items) | No |
| 002 | `002_fix_rls_policies.sql` | Fix RLS policies — Supabase doesn't combine FOR ALL with operation-specific policies | All tables with RLS | Yes (fix) |
| 003 | `003_constraints.sql` | CHECK, NOT NULL, UNIQUE constraints for all 18 tables | All core tables | No |
| 004 | `004_images.sql` | Image pipeline infrastructure — storage buckets, metadata tables, RLS | image_metadata, image_variants, storage.objects | No |
| 005 | `005_contact_messages.sql` | Create contact_messages table | contact_messages | No |
| 006 | `006_hero_fields.sql` | Add avatar_url, twitter_url, cv_url, stats columns | hero_content | No |
| 007 | `007_about_fields.sql` | Add bio, education, interests columns | about_content | No |
| 008 | `008_projects_missing_fields.sql` | Add full_description, challenges, outcome, completed_at | projects | No |
| 009 | `009_storage_buckets.sql` | Additional storage buckets | storage.buckets | No |
| 010 | — | *Gap: number never assigned* | — | — |
| 011 | `011_sort_order.sql` | Initialize sort_order values | projects, skills, experience, certifications | No |
| 012 | `012_fix_cert_url_constraint.sql` | Relax chk_cert_url to allow empty strings alongside valid URLs | certifications | Yes (fix) |
| 013 | `013_dynamic_branding.sql` | Add site_name, logo_url, favicon_url, tagline | site_settings | No |
| 014 | `014_updated_at_triggers.sql` | Create update_updated_at_column() trigger function | (function + triggers on multiple tables) | No |
| 015 | `015_missing_indexes.sql` | Indexes on sort_order, category, featured columns | projects, skills, experience, certifications | No |
| 016 | — | *Gap: number never assigned* | — | — |
| 017 | — | *Gap: number never assigned* | — | — |
| 018 | — | *Gap: number never assigned* | — | — |
| 019 | — | *Gap: number never assigned* | — | — |
| 020 | `020_bilingual_content.sql` | Add Arabic content columns (_ar suffix) to all content tables | projects, skills, experience, certifications, hero_content, about_content, contact_info, messages | No |
| 021 | `021_language_settings.sql` | Add language_mode, default_language settings | site_settings | No |
| 022 | `022_image_rls.sql` | RLS policies for image tables, content_snapshots, section_variants | image_metadata, image_variants, content_snapshots, section_variants | No |
| 023 | `023_fix_duplicate_triggers.sql` | Remove duplicate trigger/function created by 014 (keep 004's version) | image_metadata | Yes (fix) |
| 024 | `024_analytics_cleanup.sql` | Create cleanup_old_analytics() function | analytics | No |
| 025 | `025_fk_constraints.sql` | Foreign key constraints across tables | Multiple tables | No |
| 026 | `026_add_missing_indexes.sql` | Additional indexes for query performance | Multiple tables | No |
| 027 | `027_fk_cascade_and_migration.sql` | CASCADE foreign keys, analytics project_id migration | analytics, projects | No |
| 028 | `028_consolidate_messages.sql` | Merge contact_messages into messages table | messages, contact_messages | No |
| 029 | `029_fix_critical_issues.sql` | Fix: UNIQUE slug on projects, RLS for image tables, consolidate duplicate triggers, add missing indexes | projects, image_metadata, image_variants | Yes (fix) |
| 030 | `030_add_soft_delete.sql` | Add deleted_at columns, update RLS to exclude soft-deleted rows | projects, skills, experience, certifications, messages | No |
| 031 | `031_messages_constraints.sql` | CHECK constraint on messages.status, composite indexes | messages | No |
| 032 | `032_reorder_sections_rpc.sql` | Create reorder_sections() RPC function (SECURITY DEFINER) | section_settings | No |
| 033 | `033_image_variants_index.sql` | Index on image_variants for lookup performance | image_variants | No |
| 034 | `034_users_table.sql` | Create users table (Clerk integration), add user_id FK to collections | users, collections | No |
| 035 | `035_drop_duplicates.sql` | Drop duplicate constraints and indexes | projects | Yes (cleanup) |
| 036 | `036_fix_description_ar.sql` | Fix type mismatch: experience.description_ar should be TEXT[] not TEXT | experience | Yes (fix) |
| 037 | `037_cleanup.sql` | Drop legacy contact_messages table | contact_messages | Yes (cleanup) |
| 038 | `038_snapshot_constraints.sql` | CHECK constraint on content_snapshots.entity_type | content_snapshots | No |
| 039 | `039_drop_duplicate_policies.sql` | Drop duplicate RLS policies that serve the same purpose | section_variants, image_metadata | Yes (cleanup) |
| 040 | `040_backfill_project_slugs.sql` | Backfill missing slug values from titles, enforce NOT NULL + UNIQUE | projects | No |
| 041 | `041_public_cv_settings_read.sql` | Public read access for cv_settings | cv_settings | No |
| 042 | `042_fix_storage_rls.sql` | Fix overly permissive storage bucket policies — admin-only | storage.objects | Yes (fix) |
| 043 | `043_fix_reorder_sections_admin_check.sql` | Add is_admin() check to SECURITY DEFINER reorder_sections function | (function: reorder_sections) | Yes (fix) |

## Summary

- **Total migrations:** 43
- **Numbered range:** 001–043
- **Gaps:** 010, 016–019 (5 numbers never assigned)
- **Corrective migrations:** 9
  - Fixes (7): 002, 012, 023, 029, 036, 042, 043
  - Cleanups (3): 035, 037, 039
- **Unique tables affected:** ~25+ (including storage.objects and functions)
