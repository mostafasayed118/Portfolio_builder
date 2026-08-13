-- Analytics cleanup function
-- Removes analytics events older than 90 days

CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM analytics_events WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;
