CREATE TABLE public.user_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    email TEXT,
    action TEXT NOT NULL,
    details TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.user_logs TO authenticated;
GRANT ALL ON public.user_logs TO service_role;

ALTER TABLE public.user_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all logs" ON public.user_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.authorized_users
            WHERE authorized_users.id = auth.uid()
            AND authorized_users.role = 'admin'
        )
    );

CREATE POLICY "Users can insert logs" ON public.user_logs
    FOR INSERT
    WITH CHECK (true);

-- Function to log activity from database triggers if needed, but we'll mainly use application-level logging for now.
