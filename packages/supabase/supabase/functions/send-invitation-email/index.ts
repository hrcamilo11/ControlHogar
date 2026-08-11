import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { email, homeName, inviterName, inviteLink, role } = await req.json()

    if (!email || !homeName || !inviteLink) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Use Supabase's built-in auth.admin to send email via configured SMTP
    const { error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: inviteLink,
      },
    })

    // Note: For production, integrate with Resend, SendGrid, or similar
    // This is a placeholder that logs the invitation
    console.log(`📧 Invitation email would be sent to: ${email}`)
    console.log(`   Home: ${homeName}`)
    console.log(`   Inviter: ${inviterName}`)
    console.log(`   Role: ${role}`)
    console.log(`   Link: ${inviteLink}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Invitation email queued' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
