-- 036_fix_description_ar.sql
-- Fix type mismatch: experience.description_ar should be TEXT[] (array) to match description column
-- Migration 020 created it as TEXT (scalar), but types.ts expects string[]

-- Check current type and alter if needed
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'experience'
    AND column_name = 'description_ar';

  -- If it's TEXT (character varying/TEXT), convert to TEXT[]
  IF col_type = 'text' OR col_type = 'character varying' THEN
    -- First convert empty strings to NULL, then alter type
    UPDATE experience SET description_ar = NULL WHERE description_ar = '';
    ALTER TABLE experience ALTER COLUMN description_ar TYPE TEXT[] USING
      CASE
        WHEN description_ar IS NULL THEN NULL
        ELSE ARRAY[description_ar]
      END;
  END IF;
END $$;
