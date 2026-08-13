-- Indexes for frequently queried columns

-- contact_messages: query by is_read status
CREATE INDEX IF NOT EXISTS idx_contact_messages_is_read
  ON contact_messages(is_read);

-- contact_messages: query by created_at for recent messages
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at
  ON contact_messages(created_at DESC);

-- analytics_events already has idx_analytics_type and idx_analytics_created from 001_init
-- Skipping — column name is `type`, not `event_type`

-- projects: query by category for filtering
CREATE INDEX IF NOT EXISTS idx_projects_category
  ON projects(category);

-- projects: query by featured
CREATE INDEX IF NOT EXISTS idx_projects_featured
  ON projects(featured) WHERE featured = true;

-- skills: query by category for grouping
CREATE INDEX IF NOT EXISTS idx_skills_category
  ON skills(category);

-- All tables: sort_order for ordered queries
CREATE INDEX IF NOT EXISTS idx_projects_sort_order ON projects(sort_order);
CREATE INDEX IF NOT EXISTS idx_skills_sort_order ON skills(sort_order);
CREATE INDEX IF NOT EXISTS idx_experience_sort_order ON experience(sort_order);
CREATE INDEX IF NOT EXISTS idx_certifications_sort_order ON certifications(sort_order);
