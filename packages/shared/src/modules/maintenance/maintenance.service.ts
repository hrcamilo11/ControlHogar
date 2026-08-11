import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Maintenance,
  MaintenanceNote,
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
  MaintenanceStatus,
  MaintenanceFilters,
} from './maintenance.types'

export class MaintenanceService {
  constructor(private readonly supabase: SupabaseClient) {}

  async createMaintenance(homeId: string, data: CreateMaintenanceInput): Promise<Maintenance> {
    const { data: session } = await this.supabase.auth.getSession()
    if (!session.session) throw new Error('No autenticado')

    const { data: maintenance, error } = await this.supabase
      .from('maintenances')
      .insert({
        home_id: homeId,
        title: data.title,
        description: data.description ?? null,
        priority: data.priority ?? 'medium',
        created_by: session.session.user.id,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return mapMaintenanceFromDb(maintenance)
  }

  async getMaintenanceList(filters: MaintenanceFilters): Promise<Maintenance[]> {
    let query = this.supabase
      .from('maintenances')
      .select('*, maintenance_notes(*), maintenance_photos(*)')
      .eq('home_id', filters.homeId)
      .order('priority', { ascending: true }) // high first
      .order('created_at', { ascending: false })
      .limit(filters.limit ?? 50)

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.priority) query = query.eq('priority', filters.priority)
    if (filters.cursor) query = query.lt('created_at', filters.cursor)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapMaintenanceFromDb)
  }

  async updateMaintenance(maintenanceId: string, data: UpdateMaintenanceInput): Promise<Maintenance> {
    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.priority !== undefined) updateData.priority = data.priority

    const { data: maintenance, error } = await this.supabase
      .from('maintenances')
      .update(updateData)
      .eq('id', maintenanceId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return mapMaintenanceFromDb(maintenance)
  }

  async updateStatus(maintenanceId: string, status: MaintenanceStatus): Promise<Maintenance> {
    const { data: session } = await this.supabase.auth.getSession()
    if (!session.session) throw new Error('No autenticado')

    const updateData: Record<string, unknown> = { status }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
      updateData.completed_by = session.session.user.id
    }

    const { data: maintenance, error } = await this.supabase
      .from('maintenances')
      .update(updateData)
      .eq('id', maintenanceId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return mapMaintenanceFromDb(maintenance)
  }

  async deleteMaintenance(maintenanceId: string): Promise<void> {
    const { error } = await this.supabase.from('maintenances').delete().eq('id', maintenanceId)
    if (error) throw new Error(error.message)
  }

  async addNote(maintenanceId: string, content: string): Promise<MaintenanceNote> {
    const { data: session } = await this.supabase.auth.getSession()
    if (!session.session) throw new Error('No autenticado')

    const { data: note, error } = await this.supabase
      .from('maintenance_notes')
      .insert({
        maintenance_id: maintenanceId,
        user_id: session.session.user.id,
        content,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return {
      id: note.id,
      maintenanceId: note.maintenance_id,
      userId: note.user_id,
      content: note.content,
      createdAt: note.created_at,
    }
  }

  async addPhoto(maintenanceId: string, file: File): Promise<string> {
    const { data: session } = await this.supabase.auth.getSession()
    if (!session.session) throw new Error('No autenticado')

    const filePath = `${maintenanceId}/${Date.now()}.${file.name.split('.').pop()}`
    const { error: uploadError } = await this.supabase.storage
      .from('maintenance-photos')
      .upload(filePath, file)

    if (uploadError) throw new Error(uploadError.message)

    const { data: urlData } = this.supabase.storage
      .from('maintenance-photos')
      .getPublicUrl(filePath)

    await this.supabase.from('maintenance_photos').insert({
      maintenance_id: maintenanceId,
      user_id: session.session.user.id,
      url: urlData.publicUrl,
    })

    return urlData.publicUrl
  }
}

function mapMaintenanceFromDb(row: Record<string, unknown>): Maintenance {
  return {
    id: row.id as string,
    homeId: row.home_id as string,
    title: row.title as string,
    description: row.description as string | null,
    status: row.status as Maintenance['status'],
    priority: row.priority as Maintenance['priority'],
    createdBy: row.created_by as string,
    completedAt: row.completed_at as string | null,
    completedBy: row.completed_by as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    notes: Array.isArray(row.maintenance_notes)
      ? (row.maintenance_notes as Record<string, unknown>[]).map((n) => ({
          id: n.id as string,
          maintenanceId: n.maintenance_id as string,
          userId: n.user_id as string,
          content: n.content as string,
          createdAt: n.created_at as string,
        }))
      : undefined,
    photos: Array.isArray(row.maintenance_photos)
      ? (row.maintenance_photos as Record<string, unknown>[]).map((p) => ({
          id: p.id as string,
          maintenanceId: p.maintenance_id as string,
          userId: p.user_id as string,
          url: p.url as string,
          caption: p.caption as string | null,
          createdAt: p.created_at as string,
        }))
      : undefined,
  }
}
