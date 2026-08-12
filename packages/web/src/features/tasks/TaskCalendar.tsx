import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday, addMonths, subMonths,
} from 'date-fns'
import { es } from 'date-fns/locale'

interface CalendarTask {
  id: string
  title: string
  next_due_date: string
  frequency_type: string
}

export function TaskCalendar({ homeId }: { homeId: string }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  const { data: tasks } = useQuery({
    queryKey: ['tasks-calendar', homeId, format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, next_due_date, frequency_type')
        .eq('home_id', homeId)
        .eq('is_active', true)
        .not('next_due_date', 'is', null)
        .gte('next_due_date', monthStart.toISOString())
        .lte('next_due_date', monthEnd.toISOString())

      if (error) throw error
      return data as CalendarTask[]
    },
  })

  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getTasksForDay = (day: Date) =>
    tasks?.filter((t) => isSameDay(new Date(t.next_due_date), day)) ?? []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          ‹
        </button>
        <h3 className="text-lg font-semibold text-gray-900 capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          ›
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-t-lg overflow-hidden">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
          <div key={day} className="bg-gray-50 py-2 text-center text-xs font-medium text-gray-600">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-b-lg overflow-hidden">
        {days.map((day) => {
          const dayTasks = getTasksForDay(day)
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isCurrentDay = isToday(day)

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[80px] bg-white p-1 ${!isCurrentMonth ? 'bg-gray-50' : ''}`}
            >
              <div className={`text-xs font-medium mb-0.5 ${
                isCurrentDay
                  ? 'bg-primary-500 text-white w-5 h-5 rounded-full flex items-center justify-center'
                  : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="truncate rounded px-1 py-0.5 text-[10px] bg-primary-100 text-primary-800 leading-tight"
                    title={task.title}
                  >
                    {task.title}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-[10px] text-gray-500 px-1">+{dayTasks.length - 3} más</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
