-- ============================================================================
-- 002_constraints.sql — Layer 1: Database-level input validation
-- CHECK, NOT NULL, and UNIQUE constraints for all 18 tables
-- ============================================================================

-- 1a. NOT NULL + DEFAULT corrections
-- Ensure required fields that should never be empty have proper constraints.

-- skills
ALTER TABLE skills ALTER COLUMN name SET NOT NULL;
ALTER TABLE skills ALTER COLUMN category SET NOT NULL;
ALTER TABLE skills ALTER COLUMN proficiency SET NOT NULL;
ALTER TABLE skills ALTER COLUMN sort_order SET DEFAULT 0;
ALTER TABLE skills ALTER COLUMN is_visible SET DEFAULT true;

-- projects
ALTER TABLE projects ALTER COLUMN title SET NOT NULL;
ALTER TABLE projects ALTER COLUMN description SET NOT NULL;

-- experience
ALTER TABLE experience ALTER COLUMN title SET NOT NULL;
ALTER TABLE experience ALTER COLUMN company SET NOT NULL;
ALTER TABLE experience ALTER COLUMN location SET NOT NULL;
ALTER TABLE experience ALTER COLUMN period SET NOT NULL;

-- certifications
ALTER TABLE certifications ALTER COLUMN title SET NOT NULL;
ALTER TABLE certifications ALTER COLUMN issuer SET NOT NULL;
ALTER TABLE certifications ALTER COLUMN date SET NOT NULL;

-- messages
ALTER TABLE messages ALTER COLUMN name SET NOT NULL;
ALTER TABLE messages ALTER COLUMN email SET NOT NULL;
ALTER TABLE messages ALTER COLUMN message SET NOT NULL;
ALTER TABLE messages ALTER COLUMN status SET DEFAULT 'unread';

-- hero_content
ALTER TABLE hero_content ALTER COLUMN heading SET NOT NULL;
ALTER TABLE hero_content ALTER COLUMN name SET NOT NULL;

-- about_content
ALTER TABLE about_content ALTER COLUMN bio1 SET NOT NULL;
ALTER TABLE about_content ALTER COLUMN location SET NOT NULL;

-- 1b. CHECK constraints (with NOT VALID to preserve existing data)
-- All constraints apply to NEW and UPDATED rows only.
-- Existing rows that violate constraints are grandfathered in.

-- messages
ALTER TABLE messages DROP CONSTRAINT IF EXISTS chk_messages_name;
ALTER TABLE messages ADD CONSTRAINT chk_messages_name
  CHECK (char_length(trim(name)) BETWEEN 1 AND 100) NOT VALID;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS chk_messages_email;
ALTER TABLE messages ADD CONSTRAINT chk_messages_email
  CHECK (email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$') NOT VALID;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS chk_messages_message;
ALTER TABLE messages ADD CONSTRAINT chk_messages_message
  CHECK (char_length(trim(message)) BETWEEN 10 AND 2000) NOT VALID;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS chk_messages_status;
ALTER TABLE messages ADD CONSTRAINT chk_messages_status
  CHECK (status IN ('unread', 'read', 'archived')) NOT VALID;

-- skills
ALTER TABLE skills DROP CONSTRAINT IF EXISTS chk_skills_name;
ALTER TABLE skills ADD CONSTRAINT chk_skills_name
  CHECK (char_length(trim(name)) BETWEEN 1 AND 100) NOT VALID;
ALTER TABLE skills DROP CONSTRAINT IF EXISTS chk_skills_proficiency;
ALTER TABLE skills ADD CONSTRAINT chk_skills_proficiency
  CHECK (proficiency BETWEEN 1 AND 100) NOT VALID;
ALTER TABLE skills DROP CONSTRAINT IF EXISTS chk_skills_sort_order;
ALTER TABLE skills ADD CONSTRAINT chk_skills_sort_order
  CHECK (sort_order >= 0) NOT VALID;

-- projects
ALTER TABLE projects DROP CONSTRAINT IF EXISTS chk_projects_title;
ALTER TABLE projects ADD CONSTRAINT chk_projects_title
  CHECK (char_length(trim(title)) BETWEEN 1 AND 150) NOT VALID;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS chk_projects_description;
ALTER TABLE projects ADD CONSTRAINT chk_projects_description
  CHECK (char_length(trim(description)) BETWEEN 10 AND 2000) NOT VALID;

-- experience
ALTER TABLE experience DROP CONSTRAINT IF EXISTS chk_exp_title;
ALTER TABLE experience ADD CONSTRAINT chk_exp_title
  CHECK (char_length(trim(title)) BETWEEN 1 AND 150) NOT VALID;
ALTER TABLE experience DROP CONSTRAINT IF EXISTS chk_exp_company;
ALTER TABLE experience ADD CONSTRAINT chk_exp_company
  CHECK (char_length(trim(company)) BETWEEN 1 AND 150) NOT VALID;
ALTER TABLE experience DROP CONSTRAINT IF EXISTS chk_exp_type;
ALTER TABLE experience ADD CONSTRAINT chk_exp_type
  CHECK (type IN ('internship', 'certification', 'volunteer')) NOT VALID;

-- hero_content
ALTER TABLE hero_content DROP CONSTRAINT IF EXISTS chk_hero_heading;
ALTER TABLE hero_content ADD CONSTRAINT chk_hero_heading
  CHECK (char_length(trim(heading)) BETWEEN 1 AND 200) NOT VALID;
ALTER TABLE hero_content DROP CONSTRAINT IF EXISTS chk_hero_name;
ALTER TABLE hero_content ADD CONSTRAINT chk_hero_name
  CHECK (char_length(trim(name)) BETWEEN 1 AND 100) NOT VALID;

-- contact_info
ALTER TABLE contact_info DROP CONSTRAINT IF EXISTS chk_contact_email;
ALTER TABLE contact_info ADD CONSTRAINT chk_contact_email
  CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$') NOT VALID;
ALTER TABLE contact_info DROP CONSTRAINT IF EXISTS chk_contact_github;
ALTER TABLE contact_info ADD CONSTRAINT chk_contact_github
  CHECK (github IS NULL OR github ~* '^https?://') NOT VALID;
ALTER TABLE contact_info DROP CONSTRAINT IF EXISTS chk_contact_linkedin;
ALTER TABLE contact_info ADD CONSTRAINT chk_contact_linkedin
  CHECK (linkedin IS NULL OR linkedin ~* '^https?://') NOT VALID;

-- certifications
ALTER TABLE certifications DROP CONSTRAINT IF EXISTS chk_cert_title;
ALTER TABLE certifications ADD CONSTRAINT chk_cert_title
  CHECK (char_length(trim(title)) BETWEEN 1 AND 200) NOT VALID;
ALTER TABLE certifications DROP CONSTRAINT IF EXISTS chk_cert_url;
ALTER TABLE certifications ADD CONSTRAINT chk_cert_url
  CHECK (credential_url IS NULL OR credential_url ~* '^https?://') NOT VALID;

-- cv_settings
ALTER TABLE cv_settings DROP CONSTRAINT IF EXISTS chk_cv_filename;
ALTER TABLE cv_settings ADD CONSTRAINT chk_cv_filename
  CHECK (file_name ~* '\.(pdf)$') NOT VALID;
ALTER TABLE cv_settings DROP CONSTRAINT IF EXISTS chk_cv_path;
ALTER TABLE cv_settings ADD CONSTRAINT chk_cv_path
  CHECK (char_length(trim(object_path)) > 0) NOT VALID;

-- 1c. UNIQUE constraints
ALTER TABLE skills DROP CONSTRAINT IF EXISTS uq_skills_name;
ALTER TABLE skills ADD CONSTRAINT uq_skills_name UNIQUE (name);
ALTER TABLE section_settings DROP CONSTRAINT IF EXISTS uq_section_settings_key;
ALTER TABLE section_settings ADD CONSTRAINT uq_section_settings_key UNIQUE (key);
ALTER TABLE section_variants DROP CONSTRAINT IF EXISTS uq_section_variant;
ALTER TABLE section_variants ADD CONSTRAINT uq_section_variant UNIQUE (section_key, variant_key);

-- 1d. Verify constraints

-- This should FAIL (empty name, invalid email, short message, invalid status)
-- INSERT INTO messages (name, email, message, status)
-- VALUES ('', 'not-an-email', 'short', 'invalid');

-- This should SUCCEED
-- INSERT INTO messages (name, email, message, status)
-- VALUES ('John Doe', 'john@example.com', 'This is a valid message body.', 'unread');
