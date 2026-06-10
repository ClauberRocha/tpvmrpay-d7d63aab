DROP POLICY IF EXISTS "Admins can view all logs" ON public.user_logs;
CREATE POLICY "Admins can view all logs" ON public.user_logs
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.authorized_users
    WHERE (authorized_users.id = auth.uid() OR authorized_users.email = auth.jwt() ->> 'email')
    AND authorized_users.role = 'admin'
  )
);
GRANT SELECT ON public.user_logs TO authenticated;