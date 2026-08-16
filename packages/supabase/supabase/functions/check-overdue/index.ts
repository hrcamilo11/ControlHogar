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
    // Window to avoid duplicates: don't re-notify if we already notified in the last 2 hours
    const dedupeWindow = new Date(Date.now() - 2 * 3600000).toISOString()
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

      // Skip if just barely overdue (less than 5 min)
      if (hoursOverdue < 0) continue
      const minsOverdue = Math.floor((Date.now() - new Date(task.next_due_date!).getTime()) / 60000)
      if (minsOverdue < 5) continue

      for (const assignment of task.task_assignments ?? []) {
        // Check if we already notified this user about this task recently
        const { data: existing } = await supabase
          .from('app_notifications')
          .select('id')
          .eq('user_id', assignment.user_id)
          .eq('type', 'task.overdue')
          .gte('created_at', dedupeWindow)
          .contains('data', { task_id: task.id })
          .limit(1)

        if (existing && existing.length > 0) continue // Already notified recently

        const timeLabel = hoursOverdue >= 1 ? `${hoursOverdue}h` : `${minsOverdue} min`

        await supabase.from('app_notifications').insert({
          user_id: assignment.user_id,
          home_id: task.home_id,
          type: 'task.overdue',
          title: 'Tarea atrasada',
          body: `"${task.title}" está atrasada por ${timeLabel}`,
          data: { task_id: task.id, hours_overdue: hoursOverdue },
        })
        tasksNotified++
      }
    }

    // ─── Check upcoming payments (due in 3 days or less) ───
    const currentDay = new Date().getDate()

    const { data: upcomingPayments } = await supabase
      .from('recurring_payments')
      .select('id, title, amount, due_day, home_id')
      .eq('is_active', true)
      .gte('due_day', currentDay)
      .lte('due_day', currentDay + 3)

    for (const payment of upcomingPayments ?? []) {
      const { data: members } = await supabase
        .from('home_members')
        .select('user_id')
        .eq('home_id', payment.home_id)

      for (const member of members ?? []) {
        // Dedupe: only notify once per day about this payment
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)

        const { data: existing } = await supabase
          .from('app_notifications')
          .select('id')
          .eq('user_id', member.user_id)
          .eq('type', 'payment.upcoming')
          .gte('created_at', todayStart.toISOString())
          .contains('data', { payment_id: payment.id })
          .limit(1)

        if (existing && existing.length > 0) continue

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

    // ─── Send emails for tasks overdue > 24h (once per day) ───
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

          // Only send email once per day per task
          const todayStart = new Date()
          todayStart.setHours(0, 0, 0, 0)
          const { data: emailSent } = await supabase
            .from('app_notifications')
            .select('id')
            .eq('user_id', assignment.user_id)
            .eq('type', 'task.overdue.email')
            .gte('created_at', todayStart.toISOString())
            .contains('data', { task_id: task.id })
            .limit(1)

          if (emailSent && emailSent.length > 0) continue

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

          // Mark email as sent
          await supabase.from('app_notifications').insert({
            user_id: assignment.user_id,
            home_id: task.home_id,
            type: 'task.overdue.email',
            title: 'Email enviado',
            body: `Email de recordatorio enviado para "${task.title}"`,
            data: { task_id: task.id },
          })
        }
      }
    }

    console.log(`Check complete: ${tasksNotified} task, ${paymentsNotified} payment notifications`)

    return new Response(
      JSON.stringify({ success: true, tasksNotified, paymentsNotified }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Cron error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
