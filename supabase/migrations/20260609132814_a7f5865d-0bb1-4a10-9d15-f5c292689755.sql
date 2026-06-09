-- Drop existing complex policies to fix recursion
DROP POLICY IF EXISTS "Admins can manage authorized users" ON public.authorized_users;
DROP POLICY IF EXISTS "Users can view authorized users" ON public.authorized_users;

-- 1. Everyone authenticated can view the list (needed for role checks during login/session)
CREATE POLICY "Enable read access for all authenticated users" ON public.authorized_users
  FOR SELECT TO authenticated USING (true);

-- 2. Direct management access for the primary administrator email
CREATE POLICY "Primary admin can manage everything" ON public.authorized_users
  FOR ALL TO authenticated
  USING (auth.jwt()->>'email' = 'clauber.rocha@mrpay.com.br')
  WITH CHECK (auth.jwt()->>'email' = 'clauber.rocha@mrpay.com.br');

-- 3. Management access for other admins (using a non-recursive approach)
-- Note: Subqueries in RLS policies on the same table cause recursion. 
-- For now, we'll stick to the primary admin or use a different approach if multiple admins are needed.
-- If we need multiple admins, we should ideally use custom claims or a separate profile table.
