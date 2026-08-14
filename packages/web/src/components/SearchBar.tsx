import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface SearchResult {
  id: string
  type: 'task' | 'expense' | 'maintenance' | 'member'
  title: string
  subtitle: string
  icon: string
}

export function SearchBar({ homeId, onNavigate }: { homeId: string; onNavigate: (tab: string) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    const timeout = setTimeout(async () => {
      const searchResults: SearchResult[] = []

      // Search tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, frequency_type')
        .eq('home_id', homeId)
        .eq('is_active', true)
        .ilike('title', `%${query}%`)
        .limit(5)

      tasks?.forEach((t) => {
        searchResults.push({
          id: t.id,
          type: 'task',
          title: t.title,
          subtitle: t.frequency_type,
          icon: 'tasks',
        })
      })

      // Search expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('id, title, amount')
        .eq('home_id', homeId)
        .ilike('title', `%${query}%`)
        .limit(5)

      expenses?.forEach((e) => {
        searchResults.push({
          id: e.id,
          type: 'expense',
          title: e.title,
          subtitle: `$${Number(e.amount).toLocaleString('es-CO')}`,
          icon: 'expense',
        })
      })

      // Search maintenance
      const { data: maintenances } = await supabase
        .from('maintenances')
        .select('id, title, status')
        .eq('home_id', homeId)
        .ilike('title', `%${query}%`)
        .limit(5)

      maintenances?.forEach((m) => {
        searchResults.push({
          id: m.id,
          type: 'maintenance',
          title: m.title,
          subtitle: m.status,
          icon: 'maintenance',
        })
      })

      setResults(searchResults)
    }, 300)

    return () => clearTimeout(timeout)
  }, [query, homeId])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (result: SearchResult) => {
    const tabMap: Record<string, string> = {
      task: 'tasks',
      expense: 'finance',
      maintenance: 'maintenance',
      member: 'members',
    }
    onNavigate(tabMap[result.type] ?? 'tasks')
    setQuery('')
    setIsOpen(false)
  }

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setIsOpen(true) }}
        onFocus={() => setIsOpen(true)}
        placeholder="🔍 Buscar tareas, gastos, mantenimientos..."
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        data-testid="global-search"
      />

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg">
          {results.map((result) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => handleSelect(result)}
              className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
            >
              <div className={`h-3 w-3 rounded-full flex-shrink-0 ${result.icon === 'tasks' ? 'bg-blue-500' : result.icon === 'expense' ? 'bg-green-500' : 'bg-orange-500'}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{result.title}</p>
                <p className="text-xs text-gray-500">{result.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
          <p className="text-center text-sm text-gray-500">Sin resultados para "{query}"</p>
        </div>
      )}
    </div>
  )
}
