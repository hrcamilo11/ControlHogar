import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { FileText, Download } from 'lucide-react'
import toast from 'react-hot-toast'

export function MonthlyReport({ homeId }: { homeId: string }) {
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    const [year, monthNum] = month.split('-').map(Number)
    const startDate = new Date(year!, monthNum! - 1, 1).toISOString()
    const endDate = new Date(year!, monthNum!, 0, 23, 59, 59).toISOString()

    try {
      // Fetch all data for the month
      const [tasks, completions, expenses, maintenances, members] = await Promise.all([
        supabase.from('tasks').select('title, frequency_type').eq('home_id', homeId).eq('is_active', true),
        supabase.from('task_completions').select('*, tasks!inner(title, home_id), profiles:completed_by(display_name)').eq('tasks.home_id', homeId).gte('completed_at', startDate).lte('completed_at', endDate),
        supabase.from('expenses').select('title, amount, created_at, profiles:paid_by(display_name), expense_categories(name)').eq('home_id', homeId).gte('created_at', startDate).lte('created_at', endDate),
        supabase.from('maintenances').select('title, status, priority, created_at').eq('home_id', homeId).gte('created_at', startDate).lte('created_at', endDate),
        supabase.from('home_members').select('profiles(display_name)').eq('home_id', homeId),
      ])

      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
      const monthName = monthNames[monthNum! - 1]

      // Calculate stats
      const totalExpenses = (expenses.data ?? []).reduce((sum, e) => sum + Number(e.amount), 0)
      const totalCompletions = completions.data?.length ?? 0
      const totalMaintenance = maintenances.data?.length ?? 0

      // Group expenses by category
      const expByCategory: Record<string, number> = {}
      for (const e of expenses.data ?? []) {
        const cat = (e.expense_categories as any)?.name ?? 'Sin categoría'
        expByCategory[cat] = (expByCategory[cat] ?? 0) + Number(e.amount)
      }

      // Completions by member
      const compByMember: Record<string, number> = {}
      for (const c of completions.data ?? []) {
        const name = (c.profiles as any)?.display_name ?? '?'
        compByMember[name] = (compByMember[name] ?? 0) + 1
      }

      // Generate report text
      const report = `
═══════════════════════════════════════════
  REPORTE MENSUAL — ${monthName} ${year}
  ControlHogar
═══════════════════════════════════════════

📊 RESUMEN
─────────────────────────────────────────
• Tareas completadas: ${totalCompletions}
• Gastos registrados: $${totalExpenses.toLocaleString('es-CO')}
• Mantenimientos creados: ${totalMaintenance}
• Miembros activos: ${members.data?.length ?? 0}

💰 GASTOS POR CATEGORÍA
─────────────────────────────────────────
${Object.entries(expByCategory).sort(([,a],[,b]) => b - a).map(([cat, amount]) => `• ${cat}: $${amount.toLocaleString('es-CO')}`).join('\n') || '• Sin gastos este mes'}

Total: $${totalExpenses.toLocaleString('es-CO')}

✓ TAREAS COMPLETADAS POR MIEMBRO
─────────────────────────────────────────
${Object.entries(compByMember).sort(([,a],[,b]) => b - a).map(([name, count]) => `• ${name}: ${count} tareas`).join('\n') || '• Sin completaciones este mes'}

📋 DETALLE DE GASTOS
─────────────────────────────────────────
${(expenses.data ?? []).map(e => `• ${new Date(e.created_at).toLocaleDateString('es-CO')} — ${e.title}: $${Number(e.amount).toLocaleString('es-CO')} (${(e.profiles as any)?.display_name ?? '?'})`).join('\n') || '• Sin gastos'}

🔧 MANTENIMIENTOS
─────────────────────────────────────────
${(maintenances.data ?? []).map(m => `• [${m.priority.toUpperCase()}] ${m.title} — ${m.status}`).join('\n') || '• Sin mantenimientos'}

═══════════════════════════════════════════
  Generado el ${new Date().toLocaleString('es-CO')}
═══════════════════════════════════════════
`.trim()

      // Download
      const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte-${month}.txt`
      a.click()
      URL.revokeObjectURL(url)

      toast.success('Reporte generado')
    } catch (err) {
      toast.error('Error generando reporte')
    }

    setIsGenerating(false)
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-gray-600" />
        <h3 className="text-sm font-semibold">Reporte Mensual</h3>
      </div>
      <p className="text-xs text-gray-500">Genera un resumen con gastos, tareas y mantenimientos del mes.</p>
      <div className="flex items-center gap-2">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {isGenerating ? 'Generando...' : 'Descargar'}
        </button>
      </div>
    </div>
  )
}
