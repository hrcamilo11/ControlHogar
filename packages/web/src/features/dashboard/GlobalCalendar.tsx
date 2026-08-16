import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import toast from 'react-hot-toast'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday, addMonths, subMonths,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, ClipboardList, CreditCard, Wrench, X, Plus } from 'lucide-react'

interface CalendarEvent {
  id: string
  title: string
  date: string
  type: 'task' | 'payment' | 'maintenance'
  color: string
  detail?: string
}

export function GlobalCalendar({ homeId }: { homeId: string }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const queryClient = useQueryClient()

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  const { data: events } = useQuery({
    queryKey: ['global-calendar', homeId, format(currentMonth, 'yyyy-MM')],
    queryFn: async (): Promise<CalendarEvent[]> => {
      const start = monthStart.toISOString()
      const end = monthEnd.toISOString()
      const results: CalendarEvent[] = []

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, next_due_date, frequency_type, frequency_config')
        .eq('home_id', homeId)
        .eq('is_active', true)
        .not('next_due_date', 'is', null)
        .gte('next_due_date', start)
        .lte('next_due_date', end)

      for (const t of tasks ?? []) {
        const config = t.frequency_config as Record<string, unknown> | null
        const time = config?.hour !== undefined ? `${String(config.hour).padStart(2, '0')}:${String(config?.minute ?? 0).padStart(2, '0')}` : ''
        results.push({ id: t.id, title: t.title, date: t.next_due_date!, type: 'task', color: 'bg-blue-500', detail: time ? `A las ${time}` : t.frequency_type })
      }

      const { data: payments } = await supabase
        .from('recurring_payments')
        .select('id, title, due_day, amount')
        .eq('home_id', homeId)
        .eq('is_active', true)

      for (const p of payments ?? []) {
        const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
        const day = Math.min(p.due_day, lastDay)
        const paymentDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
        results.push({ id: p.id, title: p.title, date: paymentDate.toISOString(), type: 'payment', color: 'bg-green-500', detail: `$${Number(p.amount).toLocaleString('es-CO')}` })
      }

      const { data: maintenances } = await supabase
        .from('maintenances')
        .select('id, title, estimated_date, priority')
        .eq('home_id', homeId)
        .in('status', ['pending', 'in_progress'])
        .not('estimated_date', 'is', null)
        .gte('estimated_date', start)
        .lte('estimated_date', end)

      for (const m of maintenances ?? []) {
        results.push({ id: m.id, title: m.title, date: m.estimated_date!, type: 'maintenance', color: 'bg-orange-500', detail: `Prioridad: ${m.priority}` })
      }

      return results
    },
  })

  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getEventsForDay = (day: Date) =>
    events?.filter((e) => isSameDay(new Date(e.date), day)) ?? []

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : []

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

      <div className="flex gap-4">
        {/* Calendar grid */}
        <div className="flex-1">
          <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden border border-gray-200">
            {/* Day headers */}
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
              <div key={day} className="bg-gray-100 py-2 text-center text-xs font-medium text-gray-600">{day}</div>
            ))}

            {/* Days */}
            {days.map((day) => {
              const dayEvents = getEventsForDay(day)
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isCurrentDay = isToday(day)
              const isSelected = selectedDay && isSameDay(day, selectedDay)

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(isSameDay(day, selectedDay ?? new Date(0)) ? null : day)}
                  className={`min-h-[80px] border-t border-gray-200 p-1.5 text-left transition-colors ${
                    !isCurrentMonth ? 'bg-gray-50' : isSelected ? 'bg-primary-50 dark:bg-primary-950' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className={`text-xs font-medium mb-1 ${
                    isCurrentDay
                      ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-white'
                      : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 flex-wrap">
                      {dayEvents.slice(0, 4).map((event) => (
                        <span key={`${event.type}-${event.id}`} className={`h-1.5 w-1.5 rounded-full ${event.color}`} />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Day detail panel */}
        {selectedDay && (
          <div className="w-72 flex-shrink-0 rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold capitalize">
                {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
              </h4>
              <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {selectedDayEvents.length === 0 ? (
              <p className="text-xs text-gray-500 mb-3">No hay eventos este día</p>
            ) : (
              <div className="space-y-2 mb-3">
                {selectedDayEvents.map((event) => (
                  <div key={`${event.type}-${event.id}`} className="flex items-start gap-2 rounded-lg border border-gray-100 p-2">
                    <div className="mt-0.5">
                      {event.type === 'task' && <ClipboardList className="h-4 w-4 text-blue-500" />}
                      {event.type === 'payment' && <CreditCard className="h-4 w-4 text-green-500" />}
                      {event.type === 'maintenance' && <Wrench className="h-4 w-4 text-orange-500" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-900 truncate">{event.title}</p>
                      {event.detail && <p className="text-xs text-gray-500">{event.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick create actions */}
            <div className="border-t border-gray-200 pt-3 space-y-1.5">
              <p className="text-[10px] text-gray-400 uppercase font-medium mb-1">Crear para este día</p>
              <QuickCreateButton
                label="Tarea"
                homeId={homeId}
                selectedDay={selectedDay}
                type="task"
                onCreated={() => queryClient.invalidateQueries({ queryKey: ['global-calendar', homeId] })}
              />
              <QuickCreateButton
                label="Mantenimiento"
                homeId={homeId}
                selectedDay={selectedDay}
                type="maintenance"
                onCreated={() => queryClient.invalidateQueries({ queryKey: ['global-calendar', homeId] })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


function QuickCreateButton({ label, homeId, selectedDay, type, onCreated }: {
  label: string; homeId: string; selectedDay: Date; type: 'task' | 'maintenance'; onCreated: () => void
}) {
  const { session } = useAuth()
  const [isCreating, setIsCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [showInput, setShowInput] = useState(false)

  const handleCreate = async () => {
    if (!title.trim() || !session) return
    setIsCreating(true)

    if (type === 'task') {
      await supabase.from('tasks').insert({
        home_id: homeId,
        title: title.trim(),
        created_by: session.user.id,
        frequency_type: 'once',
        next_due_date: selectedDay.toISOString(),
      })
    } else {
      await supabase.from('maintenances').insert({
        home_id: homeId,
        title: title.trim(),
        created_by: session.user.id,
        estimated_date: selectedDay.toISOString(),
      })
    }

    toast.success(`${label} creado`)
    setTitle('')
    setShowInput(false)
    setIsCreating(false)
    onCreated()
  }

  if (showInput) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`Nombre del ${label.toLowerCase()}...`}
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:border-primary-500 focus:outline-none"
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowInput(false) }}
          autoFocus
        />
        <button onClick={handleCreate} disabled={!title.trim() || isCreating} className="rounded bg-primary-600 px-2 py-1 text-xs text-white disabled:opacity-50">
          <Plus className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowInput(true)}
      className="flex w-full items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
    >
      <Plus className="h-3 w-3" /> {label}
    </button>
  )
}
