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
    
    // Gera uma senha temporária compatível com requisitos de força (letras maiúsculas/minúsculas, número, caractere especial)
    const tempPassword = `MRPay@${Math.floor(100000 + Math.random() * 900000)}`;

    if (existingUser) {
      invitationType = 'recovery';
      // Usuário existente: redefinimos a senha dele na tabela auth.users para a temporária
      const { error: resetError } = await supabaseClient.auth.admin.updateUserById(existingUser.id, {
        password: tempPassword,
        user_metadata: { must_change_password: true }
      });

      if (resetError) {
        await supabaseClient
          .from('authorized_users')
          .update({ invitation_status: 'failed', invitation_error: resetError.message })
          .eq('email', normalizedEmail);
        return new Response(
          JSON.stringify({ error: `Erro ao resetar senha: ${resetError.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      resultMessage = 'Senha temporária de redefinição criada e registrada.';
    } else {
      // Novo usuário: criamos no auth.users com a senha temporária
      const { error: inviteError } = await supabaseClient.auth.admin.createUser({
        email: normalizedEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { must_change_password: true }
      });

      if (inviteError) {
        await supabaseClient
          .from('authorized_users')
          .update({ invitation_status: 'failed', invitation_error: inviteError.message })
          .eq('email', normalizedEmail);
        return new Response(
          JSON.stringify({ error: `Erro ao criar usuário temporário: ${inviteError.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      resultMessage = 'Usuário criado com senha temporária.';
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITE_VALIDITY_HOURS * 3600 * 1000);

    // Salva a senha temporária e o sinalizador de alteração obrigatória
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
        temp_password: tempPassword,
        must_change_password: true
      })
      .eq('email', normalizedEmail);

    // Se houver uma chave do Resend configurada, envia o e-mail real
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      try {
        const mailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'MRPay Auth <no-reply@mrpay.com.br>',
            to: normalizedEmail,
            subject: invitationType === 'recovery' ? 'MRPay TPV - Nova Senha Temporária' : 'MRPay TPV - Seu Acesso Temporário',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #0a0a0a; color: #ffffff;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <h2 style="color: #fbbf24; margin: 0;">Acesso ao MRPay TPV</h2>
                  <p style="color: #a0a0a0; font-size: 14px; margin-top: 5px;">Sistema de Terminal de Pagamento Virtual</p>
                </div>
                <div style="background-color: #1a1a1a; border: 1px solid #2a2a2a; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0 0 10px 0; font-size: 16px;">Olá,</p>
                  <p style="margin: 0 0 20px 0; font-size: 14px; color: #d0d0d0; line-height: 1.5;">
                    Seu acesso temporário ao sistema MRPay TPV foi configurado ou redefinido. Use as credenciais abaixo para entrar no painel:
                  </p>
                  <div style="background-color: #262626; border: 1px solid #333333; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
                    <p style="margin: 0 0 5px 0; font-size: 12px; color: #a0a0a0; text-transform: uppercase;">Senha Temporária</p>
                    <code style="font-size: 22px; font-weight: bold; color: #fbbf24; letter-spacing: 1px;">${tempPassword}</code>
                  </div>
                  <p style="margin: 0; font-size: 12px; color: #fbbf24; font-weight: bold;">
                    ⚠️ Por motivos de segurança, você será solicitado a alterar esta senha imediatamente no primeiro acesso.
                  </p>
                </div>
                <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #666;">
                  <p style="margin: 0;">Este é um e-mail automático do sistema de segurança. Não responda.</p>
                  <p style="margin: 5px 0 0 0; font-weight: bold; letter-spacing: 1px;">GERTEC/CONSULTI</p>
                </div>
              </div>
            `
          })
        });
        if (!mailResponse.ok) {
          console.error('Falha ao enviar e-mail via Resend:', await mailResponse.text());
        }
      } catch (mailError) {
        console.error('Erro de envio de e-mail:', mailError);
      }
    } else {
      console.log(`[SEM RESEND_API_KEY] Senha temporária para ${normalizedEmail}: ${tempPassword}`);
    }

    return new Response(
      JSON.stringify({
        message: resultMessage,
        invitation_type: invitationType,
        expires_at: expiresAt.toISOString(),
        cooldown_seconds: RESEND_COOLDOWN_SECONDS,
        // Retorna a senha temporária para exibição segura se não houver envio real de e-mail configurado
        temp_password: tempPassword
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
