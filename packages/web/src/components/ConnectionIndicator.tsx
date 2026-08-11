import { useConnectionStatus } from '@/lib/useConnectionStatus'

export function ConnectionIndicator() {
  const status = useConnectionStatus()

  if (status === 'online') return null

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-yellow-100 border border-yellow-300 px-4 py-2 shadow-lg">
      <div className="h-2.5 w-2.5 rounded-full bg-yellow-500 animate-pulse" />
      <span className="text-sm font-medium text-yellow-800">
        Sin conexión — los cambios se guardarán al reconectar
      </span>
    </div>
  )
}
