import type { SupabaseClient } from '@supabase/supabase-js'
import type { Home } from '../../types'
import type { CreateHomeInput, UpdateHomeInput } from '../../types/dto'
import { createHomeSchema, updateHomeSchema } from '../../types/schemas'
import { eventBus } from '../../events'

export class HomesService {
  constructor(private readonly supabase: SupabaseClient) {}

  async createHome(data: CreateHomeInput): Promise<Home> {
    const validated = createHomeSchema.parse(data)

    const { data: session } = await this.supabase.auth.getSession()
    if (!session.session) throw new Error('No autenticado')

    const { data: home, error } = await this.supabase
      .from('homes')
      .insert({
        name: validated.name,
        description: validated.description ?? null,
        created_by: session.session.user.id,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    const result = mapHomeFromDb(home)
    eventBus.emit('home.created', { home: result })
    return result
  }

  async getHome(homeId: string): Promise<Home> {
    const { data, error } = await this.supabase
      .from('homes')
      .select()
      .eq('id', homeId)
      .single()

    if (error) throw new Error(error.message)
    return mapHomeFromDb(data)
  }

  async getUserHomes(): Promise<Home[]> {
    const { data, error } = await this.supabase
      .from('homes')
      .select('*, home_members!inner(user_id)')
      .eq('is_active', true)

    if (error) throw new Error(error.message)
    return (data ?? []).map(mapHomeFromDb)
  }

  async updateHome(homeId: string, data: UpdateHomeInput): Promise<Home> {
    const validated = updateHomeSchema.parse(data)

    const { data: home, error } = await this.supabase
      .from('homes')
      .update(validated)
      .eq('id', homeId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return mapHomeFromDb(home)
  }

  async deleteHome(homeId: string): Promise<void> {
    const { error } = await this.supabase
      .from('homes')
      .update({ is_active: false, deleted_at: new Date().toISOString() })
      .eq('id', homeId)

    if (error) throw new Error(error.message)
    eventBus.emit('home.deleted', { homeId })
  }

  async restoreHome(homeId: string): Promise<Home> {
    const { data: home, error } = await this.supabase
      .from('homes')
      .update({ is_active: true, deleted_at: null })
      .eq('id', homeId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    const result = mapHomeFromDb(home)
    eventBus.emit('home.restored', { home: result })
    return result
  }
}

function mapHomeFromDb(row: Record<string, unknown>): Home {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    createdBy: row.created_by as string,
    isActive: row.is_active as boolean,
    deletedAt: row.deleted_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}
