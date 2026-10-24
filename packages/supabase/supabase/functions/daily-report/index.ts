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

    // Tomorrow's date (Colombia timezone UTC-5)
    const now = new Date()
    const colombiaOffset = -5 * 60 * 60 * 1000
    const colombiaNow = new Date(now.getTime() + colombiaOffset)
    const tomorrow = new Date(colombiaNow)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    const tomorrowEnd = new Date(tomorrow)
    tomorrowEnd.setHours(23, 59, 59, 999)

    const tomorrowISO = tomorrow.toISOString()
    const tomorrowEndISO = tomorrowEnd.toISOString()
    const tomorrowDOW = tomorrow.getDay() // 0=Sunday

    let notificationsCreated = 0
    let reassignments = 0

    // ─── Step 1: Reassign rotatable tasks due tomorrow ───
    const { data: rotatableTasks } = await supabase
      .from('tasks')
      .select('id, title, home_id, rotation_pool, rotation_strategy, next_due_date')
      .eq('is_active', true)
      .neq('rotation_strategy', 'none')
      .not('next_due_date', 'is', null)
      .gte('next_due_date', tomorrowISO)
      .lte('next_due_date', tomorrowEndISO)

    for (const task of rotatableTasks ?? []) {
      const pool = task.rotation_pool as { user_id: string; excluded_days: number[] }[]
      if (!pool || pool.length === 0) continue

      // Find best assignee using fair algorithm
      let bestUserId: string | null = null

      if (task.rotation_strategy === 'round_robin') {
        // Simple: pick from pool excluding today's restricted users
        const available = pool.filter((p) => !p.excluded_days.includes(tomorrowDOW))
        if (available.length === 0) continue

        // Get current assignee to rotate away from them
        const { data: currentAssignments } = await supabase
          .from('task_assignments')
          .select('user_id')
          .eq('task_id', task.id)

        const currentIds = currentAssignments?.map((a) => a.user_id) ?? []
        // Pick someone not currently assigned, or first available
        const notCurrent = available.filter((p) => !currentIds.includes(p.user_id))
        bestUserId = (notCurrent.length > 0 ? notCurrent[0] : available[0])?.user_id ?? null

      } else if (task.rotation_strategy === 'fair') {
        // Use DB function for fair assignment
        const { data } = await supabase.rpc('pick_fair_assignee', {
          p_task_id: task.id,
          p_home_id: task.home_id,
          p_target_date: tomorrow.toISOString().split('T')[0],
        })
        bestUserId = data
      }

      if (bestUserId) {
        // Reassign task
        await supabase.from('task_assignments').delete().eq('task_id', task.id)
        await supabase.from('task_assignments').insert({ task_id: task.id, user_id: bestUserId })
        reassignments++
      }
    }

    // ─── Step 2: Send "Tomorrow's activities" report per user ───
    // Get all homes
    const { data: homes } = await supabase.from('homes').select('id').eq('is_active', true)

    for (const home of homes ?? []) {
      // Get members
      const { data: members } = await supabase
        .from('home_members')
        .select('user_id, profiles(display_name)')
        .eq('home_id', home.id)

      for (const member of members ?? []) {
        // Get tasks assigned to this user due tomorrow
        const { data: userTasks } = await supabase
          .from('task_assignments')
          .select('tasks!inner(id, title, next_due_date, task_type, frequency_type)')
          .eq('user_id', member.user_id)
          .gte('tasks.next_due_date', tomorrowISO)
          .lte('tasks.next_due_date', tomorrowEndISO)

        const taskList = userTasks?.map((t: any) => t.tasks).filter(Boolean) ?? []

        if (taskList.length === 0) continue

        // Build notification
        const taskNames = taskList.map((t: any) => t.title).slice(0, 5)
        const body = taskNames.length <= 3
          ? taskNames.join(', ')
          : `${taskNames.slice(0, 3).join(', ')} y ${taskList.length - 3} más`

        // Check we haven't sent this report today already
        const todayStart = new Date(colombiaNow)
        todayStart.setHours(0, 0, 0, 0)

        const { data: existing } = await supabase
          .from('app_notifications')
          .select('id')
          .eq('user_id', member.user_id)
          .eq('type', 'daily.report')
          .gte('created_at', todayStart.toISOString())
          .limit(1)

        if (existing && existing.length > 0) continue

        await supabase.from('app_notifications').insert({
          user_id: member.user_id,
          home_id: home.id,
          type: 'daily.report',
          title: `${taskList.length} actividad${taskList.length > 1 ? 'es' : ''} para mañana`,
          body,
          data: { task_ids: taskList.map((t: any) => t.id), date: tomorrow.toISOString().split('T')[0] },
        })
        notificationsCreated++
      }
    }

    console.log(`Daily report: ${reassignments} reassignments, ${notificationsCreated} notifications`)

    return new Response(
      JSON.stringify({ success: true, reassignments, notificationsCreated }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Daily report error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
