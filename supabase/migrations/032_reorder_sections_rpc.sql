-- RPC function for atomic section reorder
-- Uses a single transaction to update all sort_orders at once

CREATE OR REPLACE FUNCTION reorder_sections(
  section_ids UUID[],
  sort_orders INTEGER[]
)
RETURNS void AS $$
BEGIN
  -- Validate input arrays have same length
  IF array_length(section_ids, 1) != array_length(sort_orders, 1) THEN
    RAISE EXCEPTION 'section_ids and sort_orders arrays must have the same length';
  END IF;

  -- Update all sections atomically
  FOR i IN 1..array_length(section_ids, 1) LOOP
    UPDATE section_settings
    SET sort_order = sort_orders[i],
        updated_at = NOW()
    WHERE id = section_ids[i];
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reorder_sections(UUID[], INTEGER[])
  IS 'Atomically reorders multiple sections in a single transaction';
