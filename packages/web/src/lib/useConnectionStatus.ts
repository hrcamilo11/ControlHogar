import { useState, useEffect } from 'react'
import { onlineManager } from '@tanstack/react-query'

export type ConnectionStatus = 'online' | 'offline'

/**
 * Hook that tracks online/offline status and integrates with TanStack Query.
 * When offline, TanStack Query pauses mutations and queues them.
 * When online again, queued mutations execute automatically.
 */
export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>(
    navigator.onLine ? 'online' : 'offline',
  )

  useEffect(() => {
    const handleOnline = () => {
      setStatus('online')
      onlineManager.setOnline(true)
    }

    const handleOffline = () => {
      setStatus('offline')
      onlineManager.setOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Set initial state
    onlineManager.setOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return status
}
