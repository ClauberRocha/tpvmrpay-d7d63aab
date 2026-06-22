import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Cooldown entre reenvios (segundos)
const RESEND_COOLDOWN_SECONDS = 60;
// Validade de um convite Supabase (24h por padrão)
const INVITE_VALIDITY_HOURS = 24;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, force } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'E-mail é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verifica cooldown
    const { data: existingRow } = await supabaseClient
      .from('authorized_users')
      .select('invitation_sent_at, invitation_count, invitation_expires_at')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingRow?.invitation_sent_at && !force) {
      const lastSent = new Date(existingRow.invitation_sent_at).getTime();
      const elapsed = (Date.now() - lastSent) / 1000;
      if (elapsed < RESEND_COOLDOWN_SECONDS) {
        const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
        return new Response(
          JSON.stringify({
            error: `Aguarde ${wait}s antes de reenviar o convite. O último envio foi há poucos segundos.`,
            cooldown_seconds: wait,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }
    }

    // Check if user already exists in auth
    const { data: usersData, error: listError } = await supabaseClient.auth.admin.listUsers()
    if (listError) console.error('Error listing users:', listError)

    const existingUser = usersData?.users?.find(
      (u: any) => u.email?.toLowerCase() === normalizedEmail
    )

    let resultMessage = '';
    let invitationType: 'invite' | 'recovery' = 'invite';

    const siteUrl = req.headers.get('origin') || 'https://tpvmrpay.lovable.app';
    const redirectTo = `${siteUrl}/auth?type=${existingUser ? 'recovery' : 'invite'}`;

    if (existingUser) {
      invitationType = 'recovery';
      const { error: resetError } = await supabaseClient.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      });

      if (resetError) {
        await supabaseClient
          .from('authorized_users')
          .update({ invitation_status: 'failed', invitation_error: resetError.message })
          .eq('email', normalizedEmail);
        return new Response(
          JSON.stringify({ error: `Erro ao reenviar: ${resetError.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      resultMessage = 'E-mail de redefinição de senha enviado (usuário já cadastrado).';
    } else {
      const { error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(normalizedEmail, {
        redirectTo,
      });

      if (inviteError) {
        await supabaseClient
          .from('authorized_users')
          .update({ invitation_status: 'failed', invitation_error: inviteError.message })
          .eq('email', normalizedEmail);
        return new Response(
          JSON.stringify({ error: `Erro ao enviar convite: ${inviteError.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      resultMessage = 'Convite enviado. O usuário receberá um e-mail para criar a senha.';
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITE_VALIDITY_HOURS * 3600 * 1000);

    await supabaseClient
      .from('authorized_users')
      .update({
        invited_at: now.toISOString(),
        invitation_sent_at: now.toISOString(),
        invitation_status: 'sent',
        invitation_error: null,
        invitation_type: invitationType,
        invitation_expires_at: expiresAt.toISOString(),
        invitation_count: (existingRow?.invitation_count ?? 0) + 1,
      })
      .eq('email', normalizedEmail);

    return new Response(
      JSON.stringify({
        message: resultMessage,
        invitation_type: invitationType,
        expires_at: expiresAt.toISOString(),
        cooldown_seconds: RESEND_COOLDOWN_SECONDS,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
