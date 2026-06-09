import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()
    const phoneNumber = "5598986001270"
    const message = `🚨 *Alerta de Login - TPV*\n\nO usuário *${email}* acabou de realizar login no sistema TPV.\n\nData: ${new Date().toLocaleString('pt-BR')}`

    // Note: This is a placeholder for actual WhatsApp API integration (e.g. Twilio, Evolution API, etc.)
    // For now, we simulate the call. In a real scenario, you'd call your provider here.
    console.log(`Sending WhatsApp to ${phoneNumber}: ${message}`)
    
    // Example fetch to a webhook or WhatsApp API provider
    /*
    await fetch('https://api.whatsapp.provider/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: phoneNumber, message })
    })
    */

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
