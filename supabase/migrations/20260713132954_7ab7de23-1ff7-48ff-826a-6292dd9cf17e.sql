
-- Revoke broad EXECUTE from PUBLIC / anon / authenticated on all SECURITY DEFINER functions,
-- then re-grant only to the roles that must call them.

-- Trigger-only functions: no one should call them via the API
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Role helpers: only used inside RLS policies (run as postgres), not client-callable
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;

-- Audit logging: only authenticated users
REVOKE ALL ON FUNCTION public.log_audit(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_audit(text, text, text, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, text, jsonb, text) TO authenticated;

-- Login gate / attempt recording: needed on the public login screen (anon) and after login
REVOKE ALL ON FUNCTION public.check_login_allowed(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_login_attempt(text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_login_allowed(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, boolean, text) TO anon, authenticated;

-- service_role keeps full access for admin/edge-function code
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, text, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_login_allowed(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, boolean, text) TO service_role;
