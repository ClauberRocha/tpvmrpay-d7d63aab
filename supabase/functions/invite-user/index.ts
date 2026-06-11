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
        JSON.stringify({ error: 'Email is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check if user already exists in auth
    const { data: usersData, error: listError } = await supabaseClient.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
    }

    const existingUser = usersData?.users?.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    )

    if (existingUser) {
      console.log(`User ${email} already exists. Sending password reset/recovery.`)
      // User exists — send a password reset link instead of invite
      // We use redirectTo to ensure they go to the password update page
      const { error: resetError } = await supabaseClient.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: `${req.headers.get('origin')}/auth?type=recovery`
        }
      })

      if (resetError) {
        console.error('Error generating reset link:', resetError)
        return new Response(
          JSON.stringify({ error: resetError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      
      // Since generateLink just returns the link, we still need to send the email.
      // Supabase resetPasswordForEmail is easier as it sends the email automatically.
      const { error: sendError } = await supabaseClient.auth.resetPasswordForEmail(email)
      
      if (sendError) {
        return new Response(
          JSON.stringify({ error: sendError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      return new Response(
        JSON.stringify({ message: 'E-mail autorizado! Como você já possui cadastro, enviamos um link para você criar/redefinir sua senha inicial.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Invite the user via Supabase Auth
    const { data, error } = await supabaseClient.auth.admin.inviteUserByEmail(email)

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    await supabaseClient
      .from('authorized_users')
      .update({ invited_at: new Date().toISOString() })
      .eq('email', email)

    return new Response(
      JSON.stringify({ message: 'E-mail autorizado! Enviamos um convite para o seu e-mail para que você crie sua senha inicial.', data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
