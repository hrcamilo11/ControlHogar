import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = 'ControlHogar <controlhogar@hrcamilo11.dpdns.org>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string
  subject: string
  template: 'invitation' | 'task_overdue' | 'payment_upcoming'
  data: Record<string, string>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured')
    }

    const { to, subject, template, data }: EmailRequest = await req.json()

    if (!to || !subject || !template) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, template' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const html = generateEmailHtml(template, data)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const errorData = await res.json()
      console.error('Resend API error:', errorData)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const result = await res.json()
    console.log(`✅ Email sent to ${to}: ${subject} (id: ${result.id})`)

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Email function error:', err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

function generateEmailHtml(template: string, data: Record<string, string>): string {
  const baseStyle = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 600px; margin: 0 auto; padding: 40px 20px;
  `

  const buttonStyle = `
    display: inline-block; background: #2563eb; color: white;
    padding: 12px 24px; border-radius: 8px; text-decoration: none;
    font-weight: 600; font-size: 14px;
  `

  switch (template) {
    case 'invitation':
      return `
        <div style="${baseStyle}">
          <h1 style="color: #1f2937; font-size: 24px;">🏠 Te invitaron a un hogar</h1>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            <strong>${data.inviterName}</strong> te invitó a unirte al hogar <strong>"${data.homeName}"</strong> como <strong>${data.role}</strong>.
          </p>
          <p style="margin: 30px 0;">
            <a href="${data.inviteLink}" style="${buttonStyle}">Aceptar Invitación</a>
          </p>
          <p style="color: #9ca3af; font-size: 12px;">
            Este enlace expira en 24 horas. Si no solicitaste esta invitación, puedes ignorar este email.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">ControlHogar — Gestión doméstica colaborativa</p>
        </div>
      `

    case 'task_overdue':
      return `
        <div style="${baseStyle}">
          <h1 style="color: #dc2626; font-size: 24px;">⚠️ Tarea atrasada</h1>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            La tarea <strong>"${data.taskTitle}"</strong> en el hogar <strong>"${data.homeName}"</strong> está atrasada desde hace más de 24 horas.
          </p>
          <p style="color: #4b5563; font-size: 14px;">
            Asignada a: ${data.assigneeName}<br/>
            Fecha límite: ${data.dueDate}
          </p>
          <p style="margin: 30px 0;">
            <a href="${data.appLink}" style="${buttonStyle}">Ver en ControlHogar</a>
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">ControlHogar — Gestión doméstica colaborativa</p>
        </div>
      `

    case 'payment_upcoming':
      return `
        <div style="${baseStyle}">
          <h1 style="color: #d97706; font-size: 24px;">💳 Pago próximo a vencer</h1>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            El pago <strong>"${data.paymentTitle}"</strong> por <strong>$${data.amount}</strong> vence el día <strong>${data.dueDay}</strong> de este mes.
          </p>
          <p style="color: #4b5563; font-size: 14px;">
            Hogar: ${data.homeName}
          </p>
          <p style="margin: 30px 0;">
            <a href="${data.appLink}" style="${buttonStyle}">Marcar como pagado</a>
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">ControlHogar — Gestión doméstica colaborativa</p>
        </div>
      `

    default:
      return `<p>${JSON.stringify(data)}</p>`
  }
}
