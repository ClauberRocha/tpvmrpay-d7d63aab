
-- authorized_users: remove permissive SELECT, add scoped policies + UPDATE guard
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.authorized_users;

CREATE POLICY "Users can view their own record"
  ON public.authorized_users
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'email') = email);

CREATE POLICY "Admins can view all records"
  ON public.authorized_users
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = 'clauber.rocha@mrpay.com.br'
    OR EXISTS (
      SELECT 1 FROM public.authorized_users au
      WHERE au.email = (auth.jwt() ->> 'email') AND au.role = 'admin'
    )
  );

-- Explicitly block non-admin UPDATE/INSERT/DELETE (Primary admin policy already allows admin)
CREATE POLICY "Block non-admin updates"
  ON public.authorized_users
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'clauber.rocha@mrpay.com.br')
  WITH CHECK ((auth.jwt() ->> 'email') = 'clauber.rocha@mrpay.com.br');

-- user_logs: restrict INSERT to authenticated
DROP POLICY IF EXISTS "Users can insert logs" ON public.user_logs;
CREATE POLICY "Authenticated users can insert logs"
  ON public.user_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IS NULL OR user_id = auth.uid() OR email = (auth.jwt() ->> 'email')
  );

-- login_attempts: scope INSERT explicitly to authenticated role
DROP POLICY IF EXISTS "Authenticated users can insert login attempts" ON public.login_attempts;
CREATE POLICY "Authenticated users can insert login attempts"
  ON public.login_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Revoke execute on SECURITY DEFINER functions from anon (and public)
REVOKE EXECUTE ON FUNCTION public.get_users_access_status() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
