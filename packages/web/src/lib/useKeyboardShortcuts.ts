import { useEffect } from 'react'

interface ShortcutHandlers {
  onNewTask?: () => void
}

export function useKeyboardShortcuts({ onNewTask }: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when typing in inputs
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
        return
      }

      // Ctrl+N: New task
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        onNewTask?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onNewTask])
}
