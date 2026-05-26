# File Storage

## Overview

Portfolio-Fixer uses **Supabase Storage** for all file storage. There are 7 storage buckets configured across multiple migration files.

## Storage Buckets

| Bucket | Public | Created In | Purpose |
|--------|--------|------------|---------|
| `cv` | No | 001_init.sql | CV PDF files |
| `project_images` | Yes | 004_images.sql | Project screenshots |
| `image_variants` | No | 004_images.sql | Processed image variants |
| `avatars` | Yes | 004_images.sql | Profile/avatar images |
| `projects` | Yes | 009_storage_buckets.sql | Project screenshots (newer) |
| `certifications` | Yes | 009_storage_buckets.sql | Certification badge images |
| `documents` | No | 009_storage_buckets.sql | General documents |

## CV Upload Flow

```
1. Admin opens CvManager page in admin dashboard
2. Admin selects PDF file via file input
3. Frontend validates file type (must be .pdf)
4. Frontend calls Supabase Storage upload:
   supabase.storage.from("cv").upload(objectPath, file)
5. On success, frontend calls API server:
   PUT /api/v1/cv/settings with { objectPath, fileName }
6. API server validates body (cvSettingsUpdateSchema):
   - objectPath: string, 1-500 chars
   - fileName: string, 1-255 chars, must end in .pdf
7. API server upserts cv_settings table via @workspace/db
8. cv_settings now has the path to the uploaded file
```

## CV Download Flow

```
1. Visitor clicks "Download CV" on portfolio
2. Browser navigates to GET /api/v1/cv
3. API server attempts dynamic PDF generation (jspdf)
4. If dynamic generation fails, falls back to storage:
   a. Reads cv_settings to get object_path
   b. Creates signed URL via Supabase Storage
   c. Streams the file with Content-Disposition: attachment
5. Browser downloads the PDF
```

## Image Upload Flow

```
1. Admin uses ImageUploader component or manager page
2. Frontend sends multipart/form-data to POST /api/v1/images/upload
   Fields: file, entityType, entityId (optional)
3. API server validates with adminAuth + CSRF
4. File uploaded to appropriate Supabase Storage bucket
5. Image metadata stored in image_metadata table:
   - storage_path, original_filename, mime_type
   - width, height, file_size_bytes
   - entity_type, entity_id (polymorphic reference)
6. Image can be referenced by projects, certifications, etc.
```

## Storage Policies

### CV Bucket (private)

| Policy | Operation | Rule |
|--------|-----------|------|
| `admin_upload_cv` | INSERT | `bucket_id = 'cv' AND auth.role() = 'authenticated'` |
| `public_download_cv` | SELECT | `bucket_id = 'cv'` (anyone can download) |
| `admin_update_cv` | UPDATE | `bucket_id = 'cv' AND auth.role() = 'authenticated'` |
| `admin_delete_cv` | DELETE | `bucket_id = 'cv' AND auth.role() = 'authenticated'` |

### Public Buckets (project_images, avatars, projects, certifications)

| Policy | Operation | Rule |
|--------|-----------|------|
| `public_read_*` | SELECT | Anyone can read |
| `admin_all_images` | ALL | `bucket_id IN ('project_images', 'image_variants', 'avatars')` |
| `auth_upload_all` | INSERT | `auth.role() = 'authenticated'` |
| `auth_update_own` | UPDATE | `auth.role() = 'authenticated'` |
| `auth_delete_own` | DELETE | `auth.role() = 'authenticated'` |

## File Constraints

| Bucket | Max Size | Allowed Types | Notes |
|--------|----------|---------------|-------|
| `cv` | 10 MB | PDF only | Enforced by DB CHECK constraint on file_name |
| `project_images` | 10 MB | image/* | |
| `avatars` | 5 MB | image/* | |
| `certifications` | 5 MB | image/* | |

The API server uses `express.json({ limit: "1mb" })` for request body size. File uploads via `multer` handle larger payloads.

## Deleting Files

When an image is deleted via `DELETE /api/v1/images/:id`:
1. API server looks up the image_metadata record
2. Deletes the file from Supabase Storage
3. Deletes the image_metadata record (cascades to image_variants via FK)
