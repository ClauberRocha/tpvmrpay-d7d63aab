GRANT DELETE ON public.audit_logs TO authenticated;
CREATE POLICY "Admins delete audit logs" ON public.audit_logs FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));