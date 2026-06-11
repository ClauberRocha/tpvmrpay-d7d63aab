-- Add status and error columns to authorized_users
ALTER TABLE public.authorized_users ADD COLUMN IF NOT EXISTS invitation_status TEXT DEFAULT 'pending';
ALTER TABLE public.authorized_users ADD COLUMN IF NOT EXISTS invitation_error TEXT;
ALTER TABLE public.authorized_users ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMP WITH TIME ZONE;

-- Add a comment for documentation
COMMENT ON COLUMN public.authorized_users.invitation_status IS 'Status do convite: pending, sent, failed';
COMMENT ON COLUMN public.authorized_users.invitation_error IS 'Mensagem de erro caso o envio falhe';
COMMENT ON COLUMN public.authorized_users.invitation_sent_at IS 'Data e hora do último envio bem-sucedido';

-- Update existing data: if invited_at is set, assume status was 'sent'
UPDATE public.authorized_users SET invitation_status = 'sent', invitation_sent_at = invited_at WHERE invited_at IS NOT NULL AND invitation_status = 'pending';