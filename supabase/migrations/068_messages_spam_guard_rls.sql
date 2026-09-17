ALTER FUNCTION public.reject_messages_spam() SECURITY DEFINER;
ALTER FUNCTION public.reject_messages_spam() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.reject_messages_spam() FROM PUBLIC, anon, authenticated;
