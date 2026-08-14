import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday, addMonths, subMonths,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CalendarEvent {
  id: string
  title: string
  date: string
  type: 'task' | 'payment' | 'maintenance'
  color: string
}

export function GlobalCalendar({ homeId }: { homeId: string }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  const { data: events } = useQuery({
    queryKey: ['global-calendar', homeId, format(currentMonth, 'yyyy-MM')],
    queryFn: async (): Promise<CalendarEvent[]> => {
      const start = monthStart.toISOString()
      const end = monthEnd.toISOString()
      const results: CalendarEvent[] = []

      // Tasks with due dates
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, next_due_date')
        .eq('home_id', homeId)
        .eq('is_active', true)
        .not('next_due_date', 'is', null)
        .gte('next_due_date', start)
        .lte('next_due_date', end)

      for (const t of tasks ?? []) {
        results.push({ id: t.id, title: t.title, date: t.next_due_date!, type: 'task', color: 'bg-blue-500' })
      }

      // Recurring payments — generate dates for this month based on due_day
      const { data: payments } = await supabase
        .from('recurring_payments')
        .select('id, title, due_day, amount')
        .eq('home_id', homeId)
        .eq('is_active', true)

      for (const p of payments ?? []) {
        const paymentDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), Math.min(p.due_day, new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()))
        results.push({ id: p.id, title: `${p.title} ($${Number(p.amount).toLocaleString()})`, date: paymentDate.toISOString(), type: 'payment', color: 'bg-green-500' })
      }

      // Maintenance with estimated date
      const { data: maintenances } = await supabase
        .from('maintenances')
        .select('id, title, estimated_date')
        .eq('home_id', homeId)
        .not('estimated_date', 'is', null)
        .gte('estimated_date', start)
        .lte('estimated_date', end)

      for (const m of maintenances ?? []) {
        results.push({ id: m.id, title: m.title, date: m.estimated_date!, type: 'maintenance', color: 'bg-orange-500' })
      }

      return results
    },
  })

  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getEventsForDay = (day: Date) =>
    events?.filter((e) => isSameDay(new Date(e.date), day)) ?? []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50 transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="text-lg font-semibold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h3>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50 transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Tareas</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Pagos</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /> Mantenimiento</span>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px rounded-t-lg overflow-hidden border border-gray-200">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
          <div key={day} className="bg-gray-100 py-2 text-center text-xs font-medium text-gray-600">
            {day}
          </div>
        ))}

        {/* Calendar grid */}
        {days.map((day) => {
          const dayEvents = getEventsForDay(day)
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isCurrentDay = isToday(day)

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[90px] border-t border-gray-200 p-1.5 ${!isCurrentMonth ? 'bg-gray-50' : 'bg-white'}`}
            >
              <div className={`text-xs font-medium mb-1 ${
                isCurrentDay
                  ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-white'
                  : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={`${event.type}-${event.id}`}
                    className="flex items-center gap-1 rounded px-1 py-0.5"
                    title={event.title}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${event.color}`} />
                    <span className="truncate text-[10px] text-gray-700 leading-tight">{event.title}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-[10px] text-gray-400 px-1">+{dayEvents.length - 3} más</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
