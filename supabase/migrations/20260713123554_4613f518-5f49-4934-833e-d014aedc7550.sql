
-- Session ID em auditoria
ALTER TABLE public.audit_logs ADD COLUMN session_id TEXT;
CREATE INDEX idx_audit_logs_session ON public.audit_logs(session_id);

-- Atualiza log_audit para aceitar session_id
CREATE OR REPLACE FUNCTION public.log_audit(
  _action TEXT,
  _description TEXT DEFAULT NULL,
  _result TEXT DEFAULT 'success',
  _metadata JSONB DEFAULT '{}'::jsonb,
  _session_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_email TEXT;
  v_role TEXT;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();
  SELECT role::text INTO v_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
  INSERT INTO public.audit_logs (user_id, user_email, user_role, action, description, result, metadata, session_id)
  VALUES (auth.uid(), v_email, v_role, _action, _description, _result, _metadata, _session_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.log_audit(TEXT, TEXT, TEXT, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit(TEXT, TEXT, TEXT, JSONB, TEXT) TO authenticated;

-- Login attempts / brute force
CREATE TABLE public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.login_attempts TO authenticated;
GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_login_attempts_email_time ON public.login_attempts(email, attempted_at DESC);

CREATE POLICY "Admins view login attempts" ON public.login_attempts
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Configuração (constantes)
-- MAX_ATTEMPTS = 5, WINDOW = 15 min, LOCK = 15 min

CREATE OR REPLACE FUNCTION public.check_login_allowed(_email TEXT)
RETURNS TABLE(allowed BOOLEAN, remaining_seconds INTEGER, attempts INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email TEXT := lower(trim(_email));
  v_fail_count INTEGER;
  v_last_fail TIMESTAMPTZ;
  v_last_success TIMESTAMPTZ;
  v_window INTERVAL := interval '15 minutes';
  v_max INTEGER := 5;
BEGIN
  SELECT MAX(attempted_at) INTO v_last_success
  FROM public.login_attempts
  WHERE email = v_email AND success = true;

  SELECT COUNT(*), MAX(attempted_at)
  INTO v_fail_count, v_last_fail
  FROM public.login_attempts
  WHERE email = v_email
    AND success = false
    AND attempted_at > (now() - v_window)
    AND (v_last_success IS NULL OR attempted_at > v_last_success);

  IF v_fail_count >= v_max THEN
    RETURN QUERY SELECT
      false,
      GREATEST(0, EXTRACT(EPOCH FROM ((v_last_fail + v_window) - now()))::INTEGER),
      v_fail_count;
  ELSE
    RETURN QUERY SELECT true, 0, v_fail_count;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.check_login_allowed(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_login_allowed(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_login_attempt(_email TEXT, _success BOOLEAN, _user_agent TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts (email, success, user_agent)
  VALUES (lower(trim(_email)), _success, _user_agent);
END;
$$;
REVOKE ALL ON FUNCTION public.record_login_attempt(TEXT, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(TEXT, BOOLEAN, TEXT) TO anon, authenticated;
