import { useSelect } from './ConfirmDialog'
import { ChevronDown } from 'lucide-react'

interface SelectButtonOption {
  key: string
  label: string
  description?: string
}

interface SelectButtonProps {
  value: string
  options: SelectButtonOption[]
  onChange: (key: string) => void
  title?: string
  message?: string
  placeholder?: string
  className?: string
  size?: 'sm' | 'md'
}

/**
 * A button that opens a dialog selector instead of a native dropdown.
 * Replaces <select> elements with a more accessible and consistent UI.
 */
export function SelectButton({ value, options, onChange, title, message, placeholder, className, size = 'md' }: SelectButtonProps) {
  const select = useSelect()

  const currentOption = options.find((o) => o.key === value)
  const displayLabel = currentOption?.label ?? placeholder ?? 'Seleccionar'

  const handleClick = async () => {
    const selected = await select({
      title: title ?? 'Seleccionar',
      message,
      options,
    })
    if (selected !== null) {
      onChange(selected)
    }
  }

  const sizeStyles = size === 'sm'
    ? 'px-2.5 py-1 text-xs'
    : 'px-3 py-2 text-sm'

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600 ${sizeStyles} ${className ?? ''}`}
    >
      <span className="truncate">{displayLabel}</span>
      <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
    </button>
  )
}
