-- 1. Index for sorting login attempts by date
CREATE INDEX IF NOT EXISTS login_attempts_created_at_idx 
ON public.login_attempts (created_at DESC);

-- 2. Index for fetching last successful login of a specific user
CREATE INDEX IF NOT EXISTS login_attempts_email_success_created_at_idx 
ON public.login_attempts (email, success, created_at DESC);

-- 3. Index for sorting user activity logs by date
CREATE INDEX IF NOT EXISTS user_logs_created_at_idx 
ON public.user_logs (created_at DESC);
