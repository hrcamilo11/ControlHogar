import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const now = new Date().toISOString()
    let tasksNotified = 0
    let paymentsNotified = 0

    // ─── Check overdue tasks ───
    const { data: overdueTasks } = await supabase
      .from('tasks')
      .select('id, title, home_id, next_due_date, task_assignments(user_id)')
      .eq('is_active', true)
      .not('next_due_date', 'is', null)
      .lt('next_due_date', now)

    for (const task of overdueTasks ?? []) {
      const hoursOverdue = Math.floor((Date.now() - new Date(task.next_due_date!).getTime()) / 3600000)

      // Only notify if overdue > 1 hour (avoid spamming)
      if (hoursOverdue < 1) continue

      // Notify assigned users
      for (const assignment of task.task_assignments ?? []) {
        await supabase.from('app_notifications').insert({
          user_id: assignment.user_id,
          home_id: task.home_id,
          type: 'task.overdue',
          title: 'Tarea atrasada',
          body: `"${task.title}" está atrasada por ${hoursOverdue}h`,
          data: { task_id: task.id, hours_overdue: hoursOverdue },
        })
        tasksNotified++
      }
    }

    // ─── Check upcoming payments (due in 3 days or less) ───
    const threeDaysFromNow = new Date(Date.now() + 3 * 86400000)
    const currentDay = new Date().getDate()

    const { data: upcomingPayments } = await supabase
      .from('recurring_payments')
      .select('id, title, amount, due_day, home_id')
      .eq('is_active', true)
      .gte('due_day', currentDay)
      .lte('due_day', currentDay + 3)

    for (const payment of upcomingPayments ?? []) {
      // Get home members to notify
      const { data: members } = await supabase
        .from('home_members')
        .select('user_id')
        .eq('home_id', payment.home_id)

      for (const member of members ?? []) {
        await supabase.from('app_notifications').insert({
          user_id: member.user_id,
          home_id: payment.home_id,
          type: 'payment.upcoming',
          title: 'Pago próximo',
          body: `"${payment.title}" ($${payment.amount}) vence el día ${payment.due_day}`,
          data: { payment_id: payment.id, due_day: payment.due_day },
        })
        paymentsNotified++
      }
    }

    // ─── Send emails for tasks overdue > 24h ───
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (resendApiKey) {
      const { data: severelyOverdue } = await supabase
        .from('tasks')
        .select('id, title, home_id, next_due_date, task_assignments(user_id, profiles:user_id(email, display_name))')
        .eq('is_active', true)
        .not('next_due_date', 'is', null)
        .lt('next_due_date', new Date(Date.now() - 24 * 3600000).toISOString())

      for (const task of severelyOverdue ?? []) {
        for (const assignment of task.task_assignments ?? []) {
          const profile = (assignment as any).profiles
          if (!profile?.email) continue

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendApiKey}` },
            body: JSON.stringify({
              from: 'ControlHogar <controlhogar@hrcamilo11.dpdns.org>',
              to: [profile.email],
              subject: `Tarea atrasada: ${task.title}`,
              html: `<p>Hola ${profile.display_name},</p><p>La tarea <strong>"${task.title}"</strong> está atrasada por más de 24 horas.</p><p>— ControlHogar</p>`,
            }),
          })
        }
      }
    }

    console.log(`✅ Check complete: ${tasksNotified} task notifications, ${paymentsNotified} payment notifications`)

    return new Response(
      JSON.stringify({ success: true, tasksNotified, paymentsNotified }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Cron error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
