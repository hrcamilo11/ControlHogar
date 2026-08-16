import toast from 'react-hot-toast'

/**
 * Shows a toast with an "Deshacer" button for 5 seconds.
 * If not undone, confirms the action.
 * Returns a promise that resolves when the action is confirmed or undone.
 */
export function undoableDelete({
  message,
  onConfirm,
  onUndo,
  duration = 5000,
}: {
  message: string
  onConfirm: () => void | Promise<void>
  onUndo?: () => void | Promise<void>
  duration?: number
}) {
  let undone = false

  const toastId = toast(
    (t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-800 dark:text-gray-200">{message}</span>
        <button
          onClick={() => {
            undone = true
            toast.dismiss(t.id)
            onUndo?.()
            toast.success('Acción deshecha', { duration: 2000 })
          }}
          className="rounded-md bg-gray-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-700 whitespace-nowrap dark:bg-gray-200 dark:text-gray-800 dark:hover:bg-gray-300"
        >
          Deshacer
        </button>
      </div>
    ),
    {
      duration,
      position: 'bottom-center',
      style: { padding: '12px 16px' },
    }
  )

  // After duration, if not undone, run the confirm action
  setTimeout(async () => {
    if (!undone) {
      await onConfirm()
    }
  }, duration)

  return toastId
}
