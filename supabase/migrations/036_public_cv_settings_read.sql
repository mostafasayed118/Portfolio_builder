-- Public read access for cv_settings
-- cv_settings only stores the file path and name for the publicly-downloadable CV.
-- The storage bucket 'cv' already allows public downloads (public_download_cv policy).
-- This policy allows the anon key to read the file path so public CV download works
-- without the service role key.

DROP POLICY IF EXISTS "public_read_cv" ON cv_settings;
CREATE POLICY "public_read_cv"
  ON cv_settings FOR SELECT
  TO anon, authenticated
  USING (true);
