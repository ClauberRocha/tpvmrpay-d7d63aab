import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'E-mail é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists in auth
    const { data: usersData, error: listError } = await supabaseClient.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
    }

    const existingUser = usersData?.users?.find(
      (u: any) => u.email?.toLowerCase() === normalizedEmail
    )

    let resultMessage = '';
    let status = 'sent';
    let errorDetail = null;

    if (existingUser) {
      console.log(`User ${normalizedEmail} already exists. Forcing password reset/recovery.`);
      
      // User exists — send a password reset link
      // We use resetPasswordForEmail which sends the system email for recovery
      // This is more reliable than manual links for basic flow
      const { error: resetError } = await supabaseClient.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${req.headers.get('origin')}/auth?type=recovery`
      });

      if (resetError) {
        console.error('Error sending reset email:', resetError);
        status = 'failed';
        errorDetail = resetError.message;
        
        // Update status in DB
        await supabaseClient
          .from('authorized_users')
          .update({ 
            invitation_status: 'failed',
            invitation_error: errorDetail
          })
          .eq('email', normalizedEmail);

        return new Response(
          JSON.stringify({ error: `Erro ao reenviar: ${resetError.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      resultMessage = 'E-mail autorizado! Como você já possui cadastro, enviamos um link para você criar/redefinir sua senha inicial.';
    } else {
      // Invite the user via Supabase Auth
      const { error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(normalizedEmail, {
        redirectTo: `${req.headers.get('origin')}/auth?type=invite`
      });

      if (inviteError) {
        console.error('Error sending invite:', inviteError);
        status = 'failed';
        errorDetail = inviteError.message;
        
        await supabaseClient
          .from('authorized_users')
          .update({ 
            invitation_status: 'failed',
            invitation_error: errorDetail
          })
          .eq('email', normalizedEmail);

        return new Response(
          JSON.stringify({ error: `Erro ao enviar convite: ${inviteError.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      resultMessage = 'E-mail autorizado! Enviamos um convite para o seu e-mail para que você crie sua senha inicial.';
    }

    // Success update
    await supabaseClient
      .from('authorized_users')
      .update({ 
        invited_at: new Date().toISOString(),
        invitation_sent_at: new Date().toISOString(),
        invitation_status: 'sent',
        invitation_error: null
      })
      .eq('email', normalizedEmail);

    return new Response(
      JSON.stringify({ message: resultMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
