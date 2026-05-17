-- ============================================================================
-- 011_sort_order.sql — Initialize sort_order values from current row order
-- sort_order column already exists on all 4 tables (from 001_init.sql)
-- This migration sets meaningful initial values
-- ============================================================================

-- -------------------------------------------------------------------
-- DATA CLEANUP: fix existing rows that violate NOT VALID constraints
-- (constraints were added with NOT VALID so existing bad data was
--  grandfathered in, but any subsequent UPDATE re-evaluates them)
-- -------------------------------------------------------------------

-- projects
UPDATE projects SET title = LPAD(title, 1, '_')
WHERE char_length(trim(title)) < 1;                                      -- chk_projects_title

UPDATE projects SET description = LPAD(description, 10, '_')
WHERE char_length(trim(description)) < 10;                               -- chk_projects_description

-- skills
UPDATE skills SET name = LPAD(name, 1, '_')
WHERE char_length(trim(name)) < 1;                                       -- chk_skills_name

UPDATE skills SET proficiency = 50
WHERE proficiency < 1 OR proficiency > 100;                               -- chk_skills_proficiency

-- experience
UPDATE experience SET title = LPAD(title, 1, '_')
WHERE char_length(trim(title)) < 1;                                      -- chk_exp_title

UPDATE experience SET company = LPAD(company, 1, '_')
WHERE char_length(trim(company)) < 1;                                    -- chk_exp_company

UPDATE experience SET type = 'internship'
WHERE type NOT IN ('internship', 'certification', 'volunteer');           -- chk_exp_type

-- certifications
UPDATE certifications SET title = LPAD(title, 1, '_')
WHERE char_length(trim(title)) < 1;                                      -- chk_cert_title

UPDATE certifications SET credential_url = NULL
WHERE credential_url IS NOT NULL AND credential_url !~* '^https?://';    -- chk_cert_url

-- -------------------------------------------------------------------
-- SORT ORDER INITIALIZATION
-- -------------------------------------------------------------------

-- Projects: oldest first
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) * 10 AS rn
  FROM projects
)
UPDATE projects SET sort_order = ranked.rn
FROM ranked WHERE projects.id = ranked.id;

-- Skills: alphabetical within each category
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY category ORDER BY name ASC
  ) * 10 AS rn
  FROM skills
)
UPDATE skills SET sort_order = ranked.rn
FROM ranked WHERE skills.id = ranked.id;

-- Experience: newest first
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) * 10 AS rn
  FROM experience
)
UPDATE experience SET sort_order = ranked.rn
FROM ranked WHERE experience.id = ranked.id;

-- Certifications: newest first by date_sort then date
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY date_sort DESC, date DESC) * 10 AS rn
  FROM certifications
)
UPDATE certifications SET sort_order = ranked.rn
FROM ranked WHERE certifications.id = ranked.id;
