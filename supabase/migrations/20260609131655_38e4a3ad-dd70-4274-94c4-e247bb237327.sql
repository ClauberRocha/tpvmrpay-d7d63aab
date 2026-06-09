CREATE TABLE public.authorized_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.authorized_users TO authenticated;
GRANT ALL ON public.authorized_users TO service_role;

ALTER TABLE public.authorized_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view authorized users" ON public.authorized_users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage authorized users" ON public.authorized_users
  FOR ALL USING (auth.jwt()->>'email' = 'clauber.rocha@mrpay.com.br')
  WITH CHECK (auth.jwt()->>'email' = 'clauber.rocha@mrpay.com.br');

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_authorized_users_updated_at
BEFORE UPDATE ON public.authorized_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();