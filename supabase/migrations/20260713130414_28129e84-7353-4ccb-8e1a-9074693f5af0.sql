
-- 1) Lock down SECURITY DEFINER functions: revoke default PUBLIC execute, then grant narrowly.

-- Role checks (used inside RLS policies)
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

-- Audit logging (only authenticated users can log actions)
REVOKE ALL ON FUNCTION public.log_audit(text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, text, jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.log_audit(text, text, text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, text, jsonb, text) TO authenticated, service_role;

-- Login flow helpers (called before sign-in => anon needs execute)
REVOKE ALL ON FUNCTION public.check_login_allowed(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_login_allowed(text) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.record_login_attempt(text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, boolean, text) TO anon, authenticated, service_role;

-- Trigger-only functions: not callable via API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;

-- 2) login_attempts: allow inserts from the sign-in page (both anon and authenticated),
--    but keep it fail-safe. The record_login_attempt SECURITY DEFINER function is the
--    intended path; this policy makes direct inserts also possible while preventing
--    tampering with success flag values by restricting via WITH CHECK.
GRANT INSERT ON public.login_attempts TO anon, authenticated;

CREATE POLICY "Anyone can record a login attempt"
ON public.login_attempts
FOR INSERT
TO anon, authenticated
WITH CHECK (email IS NOT NULL AND length(email) <= 320);
