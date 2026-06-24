-- Adiciona colunas para controle da senha temporária
ALTER TABLE public.authorized_users
  ADD COLUMN IF NOT EXISTS temp_password text,
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

-- Recria a função de consulta trazendo os novos campos para exibição no painel administrativo
CREATE OR REPLACE FUNCTION public.get_users_access_status()
RETURNS TABLE (
  id uuid,
  email text,
  is_active boolean,
  role text,
  created_at timestamptz,
  invited_at timestamptz,
  invitation_status text,
  invitation_error text,
  invitation_sent_at timestamptz,
  invitation_type text,
  invitation_expires_at timestamptz,
  invitation_count integer,
  auth_user_id uuid,
  auth_confirmed_at timestamptz,
  auth_last_sign_in_at timestamptz,
  temp_password text,
  must_change_password boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    au.id, au.email, au.is_active, au.role, au.created_at,
    au.invited_at, au.invitation_status, au.invitation_error, au.invitation_sent_at,
    au.invitation_type, au.invitation_expires_at, au.invitation_count,
    u.id AS auth_user_id,
    u.confirmed_at AS auth_confirmed_at,
    u.last_sign_in_at AS auth_last_sign_in_at,
    au.temp_password,
    au.must_change_password
  FROM public.authorized_users au
  LEFT JOIN auth.users u ON lower(u.email) = lower(au.email)
  WHERE EXISTS (
    SELECT 1 FROM public.authorized_users me
    WHERE (me.email = (auth.jwt() ->> 'email'))
      AND me.role = 'admin'
  )
  OR (auth.jwt() ->> 'email') = 'clauber.rocha@mrpay.com.br'
  ORDER BY au.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_users_access_status() TO authenticated;
