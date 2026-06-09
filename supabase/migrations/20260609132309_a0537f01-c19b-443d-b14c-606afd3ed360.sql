-- Add role column to authorized_users
ALTER TABLE public.authorized_users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- Create login_attempts table
CREATE TABLE public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT,
  success BOOLEAN NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.login_attempts TO authenticated;
GRANT ALL ON public.login_attempts TO service_role;

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can see login attempts
CREATE POLICY "Admins can view login attempts" ON public.login_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.authorized_users 
      WHERE email = auth.jwt()->>'email' AND role = 'admin'
    ) OR auth.jwt()->>'email' = 'clauber.rocha@mrpay.com.br'
  );

-- Allow inserting attempts from anyone (needed for logging)
CREATE POLICY "Anyone can insert login attempts" ON public.login_attempts
  FOR INSERT WITH CHECK (true);

-- Update authorized_users policies for role-based access
DROP POLICY IF EXISTS "Admins can manage authorized users" ON public.authorized_users;
DROP POLICY IF EXISTS "Users can view authorized users" ON public.authorized_users;

CREATE POLICY "Users can view authorized users" ON public.authorized_users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage authorized users" ON public.authorized_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.authorized_users 
      WHERE email = auth.jwt()->>'email' AND role = 'admin'
    ) OR auth.jwt()->>'email' = 'clauber.rocha@mrpay.com.br'
  );

-- Initial admin setup if not exists
INSERT INTO public.authorized_users (email, role, is_active)
VALUES ('clauber.rocha@mrpay.com.br', 'admin', true)
ON CONFLICT (email) DO UPDATE SET role = 'admin', is_active = true;