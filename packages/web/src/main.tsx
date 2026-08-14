import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { App } from './App'
import { AuthProvider } from './features/auth/AuthProvider'
import { ConnectionIndicator } from './components/ConnectionIndicator'
import './index.css'

// Apply saved theme on load
const savedTheme = localStorage.getItem('theme') ?? 'system'
if (savedTheme === 'amoled') {
  document.documentElement.classList.add('dark', 'amoled')
} else if (savedTheme === 'dark' || (savedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark')
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
      gcTime: 1000 * 60 * 60, // Keep cache for 1 hour
      networkMode: 'offlineFirst', // Use cache first, fetch in background
    },
    mutations: {
      networkMode: 'offlineFirst', // Queue mutations when offline
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <ConnectionIndicator />
          <Toaster position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
