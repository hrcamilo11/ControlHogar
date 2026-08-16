import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'default'
}

interface PromptOptions {
  title?: string
  message: string
  placeholder?: string
  confirmText?: string
  cancelText?: string
}

interface SelectOption {
  key: string
  label: string
  description?: string
}

interface SelectOptions {
  title?: string
  message?: string
  options: SelectOption[]
  cancelText?: string
}

interface DialogContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  prompt: (options: PromptOptions) => Promise<string | null>
  select: (options: SelectOptions) => Promise<string | null>
}

const DialogContext = createContext<DialogContextType | null>(null)

export function useConfirm() {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useConfirm must be used within DialogProvider')
  return ctx.confirm
}

export function usePrompt() {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('usePrompt must be used within DialogProvider')
  return ctx.prompt
}

export function useSelect() {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useSelect must be used within DialogProvider')
  return ctx.select
}

export function useDialog() {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialog must be used within DialogProvider')
  return ctx
}

type DialogState =
  | { type: 'confirm'; options: ConfirmOptions }
  | { type: 'prompt'; options: PromptOptions }
  | { type: 'select'; options: SelectOptions }
  | null

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>(null)
  const [promptValue, setPromptValue] = useState('')
  const resolveRef = useRef<((value: any) => void) | null>(null)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setDialog({ type: 'confirm', options })
    })
  }, [])

  const prompt = useCallback((options: PromptOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setPromptValue('')
      setDialog({ type: 'prompt', options })
    })
  }, [])

  const select = useCallback((options: SelectOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setDialog({ type: 'select', options })
    })
  }, [])

  const handleConfirm = () => {
    if (dialog?.type === 'prompt') {
      resolveRef.current?.(promptValue || null)
    } else {
      resolveRef.current?.(true)
    }
    setDialog(null)
  }

  const handleCancel = () => {
    resolveRef.current?.(dialog?.type === 'confirm' ? false : null)
    setDialog(null)
  }

  const handleSelectOption = (key: string) => {
    resolveRef.current?.(key)
    setDialog(null)
  }

  const variant = dialog?.type === 'confirm' ? (dialog.options.variant ?? 'default') : 'default'
  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    default: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
  }

  return (
    <DialogContext.Provider value={{ confirm, prompt, select }}>
      {children}

      {dialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={handleCancel}>
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {variant === 'danger' && (
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                )}
                <div>
                  {dialog.options.title && (
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{dialog.options.title}</h3>
                  )}
                  {'message' in dialog.options && dialog.options.message && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">{dialog.options.message}</p>
                  )}
                </div>
              </div>
              <button onClick={handleCancel} className="ml-2 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Prompt input */}
            {dialog.type === 'prompt' && (
              <div className="mt-4">
                <input
                  type="text"
                  autoFocus
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm() }}
                  placeholder={(dialog.options as PromptOptions).placeholder}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            )}

            {/* Select options as buttons */}
            {dialog.type === 'select' && (
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {dialog.options.options.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => handleSelectOption(option.key)}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-left transition-colors hover:border-primary-400 hover:bg-primary-50 dark:border-gray-600 dark:hover:border-primary-500 dark:hover:bg-primary-900/20"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{option.label}</p>
                    {option.description && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{option.description}</p>}
                  </button>
                ))}
              </div>
            )}

            {/* Actions (confirm and prompt only) */}
            {dialog.type !== 'select' && (
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={handleCancel}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {dialog.options.cancelText ?? 'Cancelar'}
                </button>
                <button
                  autoFocus={dialog.type === 'confirm'}
                  onClick={handleConfirm}
                  className={`rounded-lg px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${variantStyles[variant]}`}
                >
                  {'confirmText' in dialog.options ? (dialog.options as any).confirmText ?? 'Confirmar' : 'Confirmar'}
                </button>
              </div>
            )}

            {/* Cancel button for select */}
            {dialog.type === 'select' && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleCancel}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {dialog.options.cancelText ?? 'Cancelar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </DialogContext.Provider>
  )
}
