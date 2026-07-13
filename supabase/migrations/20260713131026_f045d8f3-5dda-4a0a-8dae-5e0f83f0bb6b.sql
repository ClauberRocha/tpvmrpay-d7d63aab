
-- Revoke broad UPDATE and re-grant only on user-editable columns for authenticated.
-- Admin flows go through the edge function which uses the service_role key
-- (service_role bypasses column privileges), so the admin panel keeps working.
REVOKE UPDATE ON public.profiles FROM authenticated;

GRANT UPDATE (first_name, last_name, department, updated_at)
  ON public.profiles TO authenticated;

-- service_role keeps full privileges (edge function admin actions)
GRANT ALL ON public.profiles TO service_role;
