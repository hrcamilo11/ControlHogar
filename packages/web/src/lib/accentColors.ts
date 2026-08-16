export interface AccentColorPreset {
  name: string
  key: string
  preview: string // the 600 shade for preview display
  colors: Record<string, string>
}

export const accentPresets: AccentColorPreset[] = [
  {
    name: 'Azul',
    key: 'blue',
    preview: '#2563eb',
    colors: {
      '--color-primary-50': '#eff6ff',
      '--color-primary-100': '#dbeafe',
      '--color-primary-200': '#bfdbfe',
      '--color-primary-300': '#93c5fd',
      '--color-primary-400': '#60a5fa',
      '--color-primary-500': '#3b82f6',
      '--color-primary-600': '#2563eb',
      '--color-primary-700': '#1d4ed8',
      '--color-primary-800': '#1e40af',
      '--color-primary-900': '#1e3a8a',
      '--color-primary-950': '#172554',
    },
  },
  {
    name: 'Violeta',
    key: 'violet',
    preview: '#7c3aed',
    colors: {
      '--color-primary-50': '#f5f3ff',
      '--color-primary-100': '#ede9fe',
      '--color-primary-200': '#ddd6fe',
      '--color-primary-300': '#c4b5fd',
      '--color-primary-400': '#a78bfa',
      '--color-primary-500': '#8b5cf6',
      '--color-primary-600': '#7c3aed',
      '--color-primary-700': '#6d28d9',
      '--color-primary-800': '#5b21b6',
      '--color-primary-900': '#4c1d95',
      '--color-primary-950': '#2e1065',
    },
  },
  {
    name: 'Rosa',
    key: 'pink',
    preview: '#db2777',
    colors: {
      '--color-primary-50': '#fdf2f8',
      '--color-primary-100': '#fce7f3',
      '--color-primary-200': '#fbcfe8',
      '--color-primary-300': '#f9a8d4',
      '--color-primary-400': '#f472b6',
      '--color-primary-500': '#ec4899',
      '--color-primary-600': '#db2777',
      '--color-primary-700': '#be185d',
      '--color-primary-800': '#9d174d',
      '--color-primary-900': '#831843',
      '--color-primary-950': '#500724',
    },
  },
  {
    name: 'Esmeralda',
    key: 'emerald',
    preview: '#059669',
    colors: {
      '--color-primary-50': '#ecfdf5',
      '--color-primary-100': '#d1fae5',
      '--color-primary-200': '#a7f3d0',
      '--color-primary-300': '#6ee7b7',
      '--color-primary-400': '#34d399',
      '--color-primary-500': '#10b981',
      '--color-primary-600': '#059669',
      '--color-primary-700': '#047857',
      '--color-primary-800': '#065f46',
      '--color-primary-900': '#064e3b',
      '--color-primary-950': '#022c22',
    },
  },
  {
    name: 'Naranja',
    key: 'orange',
    preview: '#ea580c',
    colors: {
      '--color-primary-50': '#fff7ed',
      '--color-primary-100': '#ffedd5',
      '--color-primary-200': '#fed7aa',
      '--color-primary-300': '#fdba74',
      '--color-primary-400': '#fb923c',
      '--color-primary-500': '#f97316',
      '--color-primary-600': '#ea580c',
      '--color-primary-700': '#c2410c',
      '--color-primary-800': '#9a3412',
      '--color-primary-900': '#7c2d12',
      '--color-primary-950': '#431407',
    },
  },
  {
    name: 'Teal',
    key: 'teal',
    preview: '#0d9488',
    colors: {
      '--color-primary-50': '#f0fdfa',
      '--color-primary-100': '#ccfbf1',
      '--color-primary-200': '#99f6e4',
      '--color-primary-300': '#5eead4',
      '--color-primary-400': '#2dd4bf',
      '--color-primary-500': '#14b8a6',
      '--color-primary-600': '#0d9488',
      '--color-primary-700': '#0f766e',
      '--color-primary-800': '#115e59',
      '--color-primary-900': '#134e4a',
      '--color-primary-950': '#042f2e',
    },
  },
]

export function applyAccentColor(key: string) {
  const preset = accentPresets.find((p) => p.key === key)
  if (!preset) return

  const root = document.documentElement
  for (const [prop, value] of Object.entries(preset.colors)) {
    root.style.setProperty(prop, value)
  }
}

export function loadSavedAccent() {
  const saved = localStorage.getItem('accent-color') ?? 'blue'
  applyAccentColor(saved)
}
