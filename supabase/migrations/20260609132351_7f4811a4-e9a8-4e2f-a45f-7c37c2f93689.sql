DROP POLICY IF EXISTS "Anyone can insert login attempts" ON public.login_attempts;

CREATE POLICY "Authenticated users can insert login attempts" ON public.login_attempts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Also allow service role (internal)
GRANT INSERT ON public.login_attempts TO service_role;