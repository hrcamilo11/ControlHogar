import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useAuth } from '../auth/AuthProvider'
import { X, Check, Lock, Users } from 'lucide-react'

interface ShoppingItem {
  id: string
  name: string
  quantity: string | null
  is_bought: boolean
  is_personal: boolean
  bought_by: string | null
  added_by: string
  created_at: string
}

type ListFilter = 'home' | 'personal'

export function ShoppingList({ homeId }: { homeId: string }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [newItem, setNewItem] = useState('')
  const [listFilter, setListFilter] = useState<ListFilter>('home')

  const { data: items, isLoading } = useQuery({
    queryKey: ['shopping', homeId, listFilter],
    queryFn: async () => {
      let query = supabase
        .from('shopping_items')
        .select('*')
        .eq('home_id', homeId)
        .order('is_bought', { ascending: true })
        .order('created_at', { ascending: false })

      if (listFilter === 'personal') {
        query = query.eq('is_personal', true).eq('added_by', session!.user.id)
      } else {
        query = query.eq('is_personal', false)
      }

      const { data, error } = await query
      if (error) throw error
      return data as ShoppingItem[]
    },
  })

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('shopping_items').insert({
        home_id: homeId,
        name,
        added_by: session!.user.id,
        is_personal: listFilter === 'personal',
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping', homeId] })
      queryClient.invalidateQueries({ queryKey: ['shopping-quick', homeId] })
      setNewItem('')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const toggleBoughtMutation = useMutation({
    mutationFn: async ({ id, isBought }: { id: string; isBought: boolean }) => {
      const updateData: Record<string, unknown> = {
        is_bought: !isBought,
        bought_by: !isBought ? session!.user.id : null,
        bought_at: !isBought ? new Date().toISOString() : null,
      }
      const { error } = await supabase.from('shopping_items').update(updateData).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping', homeId] })
      queryClient.invalidateQueries({ queryKey: ['shopping-quick', homeId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shopping_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping', homeId] })
      queryClient.invalidateQueries({ queryKey: ['shopping-quick', homeId] })
    },
  })

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItem.trim()) return
    addMutation.mutate(newItem.trim())
  }

  const pending = items?.filter((i) => !i.is_bought) ?? []
  const bought = items?.filter((i) => i.is_bought) ?? []

  if (isLoading) return <p className="text-gray-500">Cargando lista...</p>

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Lista de Compras</h3>

      {/* List type filter */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setListFilter('home')}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${listFilter === 'home' ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`}
        >
          <Users className="h-3.5 w-3.5" /> Hogar
        </button>
        <button
          onClick={() => setListFilter('personal')}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${listFilter === 'personal' ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`}
        >
          <Lock className="h-3.5 w-3.5" /> Personal
        </button>
      </div>

      {listFilter === 'personal' && (
        <p className="text-xs text-gray-500">Solo tú puedes ver esta lista.</p>
      )}

      {/* Add item form */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={listFilter === 'personal' ? 'Agregar item personal...' : 'Agregar item...'}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          data-testid="shopping-add-input"
        />
        <button
          type="submit"
          disabled={addMutation.isPending}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          data-testid="shopping-add-button"
        >
          +
        </button>
      </form>

      {/* Pending items */}
      {pending.length > 0 && (
        <div className="space-y-1">
          {pending.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
              <button
                onClick={() => toggleBoughtMutation.mutate({ id: item.id, isBought: false })}
                className="flex items-center gap-2 text-sm text-gray-900 hover:text-green-600"
                data-testid={`shopping-toggle-${item.id}`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded border border-gray-300">
                </span>
                {item.name}
                {item.quantity && <span className="text-xs text-gray-500">({item.quantity})</span>}
              </button>
              <button
                onClick={() => deleteMutation.mutate(item.id)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {pending.length === 0 && (
        <p className="text-sm text-gray-500">
          {listFilter === 'personal' ? 'No tienes items personales pendientes' : 'No hay items pendientes'}
        </p>
      )}

      {/* Bought items */}
      {bought.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500 uppercase">Comprados</p>
          {bought.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <button
                onClick={() => toggleBoughtMutation.mutate({ id: item.id, isBought: true })}
                className="flex items-center gap-2 text-sm text-gray-400 line-through hover:text-gray-600"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded border border-green-400 bg-green-100 text-green-600">
                  <Check className="h-3 w-3" />
                </span>
                {item.name}
              </button>
              <button
                onClick={() => deleteMutation.mutate(item.id)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
