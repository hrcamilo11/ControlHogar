import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Task,
  TaskCompletion,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilters,
  HistoryFilters,
} from './tasks.types'
import { calculateInitialDueDate, calculateNextDueDate } from './task-recurrence'
import { eventBus } from '../../events'

export class TasksService {
  constructor(private readonly supabase: SupabaseClient) {}

  async createTask(homeId: string, data: CreateTaskInput): Promise<Task> {
    const { data: session } = await this.supabase.auth.getSession()
    if (!session.session) throw new Error('No autenticado')

    const nextDueDate = calculateInitialDueDate(
      data.frequencyType,
      data.frequencyConfig ?? null,
      data.dueDate,
    )

    const { data: task, error } = await this.supabase
      .from('tasks')
      .insert({
        home_id: homeId,
        title: data.title,
        description: data.description ?? null,
        created_by: session.session.user.id,
        frequency_type: data.frequencyType,
        frequency_config: data.frequencyConfig ?? null,
        next_due_date: nextDueDate,
        rotation_enabled: data.rotationEnabled ?? false,
        rotation_members: data.rotationMembers ?? [],
        rotation_index: 0,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    // Create assignments
    const assigneeIds = data.rotationEnabled && data.rotationMembers?.length
      ? [data.rotationMembers[0]]
      : data.assigneeIds ?? []

    if (assigneeIds.length > 0) {
      const assignments = assigneeIds.map((userId) => ({
        task_id: task.id,
        user_id: userId,
      }))

      await this.supabase.from('task_assignments').insert(assignments)
    }

    const result = mapTaskFromDb(task)
    eventBus.emit('task.created' as never, { task: result } as never)
    return result
  }

  async getTasks(homeId: string, filters?: Omit<TaskFilters, 'homeId'>): Promise<Task[]> {
    let query = this.supabase
      .from('tasks')
      .select('*, task_assignments(*)')
      .eq('home_id', homeId)
      .order('next_due_date', { ascending: true, nullsFirst: false })

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive)
    } else {
      query = query.eq('is_active', true)
    }

    if (filters?.assignedTo) {
      query = query.contains('task_assignments.user_id', [filters.assignedTo])
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)

    let tasks = (data ?? []).map(mapTaskFromDb)

    if (filters?.overdue) {
      const now = new Date().toISOString()
      tasks = tasks.filter((t) => t.nextDueDate && t.nextDueDate < now)
    }

    return tasks
  }

  async getMyTasks(homeId: string, userId: string): Promise<Task[]> {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*, task_assignments!inner(*)')
      .eq('home_id', homeId)
      .eq('is_active', true)
      .eq('task_assignments.user_id', userId)
      .order('next_due_date', { ascending: true, nullsFirst: false })

    if (error) throw new Error(error.message)
    return (data ?? []).map(mapTaskFromDb)
  }

  async completeTask(taskId: string): Promise<TaskCompletion> {
    const { data: session } = await this.supabase.auth.getSession()
    if (!session.session) throw new Error('No autenticado')

    // Get current task
    const { data: task, error: taskError } = await this.supabase
      .from('tasks')
      .select()
      .eq('id', taskId)
      .single()

    if (taskError || !task) throw new Error('Tarea no encontrada')

    const now = new Date()
    const wasOverdue = task.next_due_date ? new Date(task.next_due_date) < now : false

    // Create completion record
    const { data: completion, error: completionError } = await this.supabase
      .from('task_completions')
      .insert({
        task_id: taskId,
        completed_by: session.session.user.id,
        due_date: task.next_due_date,
        was_overdue: wasOverdue,
      })
      .select()
      .single()

    if (completionError) throw new Error(completionError.message)

    // Handle recurrence
    if (task.frequency_type !== 'once') {
      const nextDueDate = calculateNextDueDate(task.frequency_type, task.frequency_config, now)

      const updateData: Record<string, unknown> = { next_due_date: nextDueDate }

      // Handle rotation
      if (task.rotation_enabled && task.rotation_members.length >= 2) {
        const newIndex = (task.rotation_index + 1) % task.rotation_members.length
        updateData.rotation_index = newIndex

        // Update assignment to next person in rotation
        await this.supabase.from('task_assignments').delete().eq('task_id', taskId)
        await this.supabase.from('task_assignments').insert({
          task_id: taskId,
          user_id: task.rotation_members[newIndex],
        })
      }

      await this.supabase.from('tasks').update(updateData).eq('id', taskId)
    } else {
      // One-time task: archive
      await this.supabase.from('tasks').update({ is_active: false }).eq('id', taskId)
    }

    return mapCompletionFromDb(completion)
  }

  async updateTask(taskId: string, data: UpdateTaskInput): Promise<Task> {
    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.rotationEnabled !== undefined) updateData.rotation_enabled = data.rotationEnabled
    if (data.rotationMembers !== undefined) updateData.rotation_members = data.rotationMembers

    const { data: task, error } = await this.supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single()

    if (error) throw new Error(error.message)

    // Update assignments if provided
    if (data.assigneeIds !== undefined) {
      await this.supabase.from('task_assignments').delete().eq('task_id', taskId)
      if (data.assigneeIds.length > 0) {
        const assignments = data.assigneeIds.map((userId) => ({
          task_id: taskId,
          user_id: userId,
        }))
        await this.supabase.from('task_assignments').insert(assignments)
      }
    }

    return mapTaskFromDb(task)
  }

  async deleteTask(taskId: string): Promise<void> {
    const { error } = await this.supabase
      .from('tasks')
      .update({ is_active: false })
      .eq('id', taskId)

    if (error) throw new Error(error.message)
  }

  async getTaskHistory(filters: HistoryFilters): Promise<TaskCompletion[]> {
    let query = this.supabase
      .from('task_completions')
      .select('*, tasks!inner(home_id, title)')
      .eq('tasks.home_id', filters.homeId)
      .order('completed_at', { ascending: false })
      .limit(filters.limit ?? 50)

    if (filters.taskId) query = query.eq('task_id', filters.taskId)
    if (filters.userId) query = query.eq('completed_by', filters.userId)
    if (filters.fromDate) query = query.gte('completed_at', filters.fromDate)
    if (filters.toDate) query = query.lte('completed_at', filters.toDate)
    if (filters.cursor) query = query.lt('completed_at', filters.cursor)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapCompletionFromDb)
  }
}

function mapTaskFromDb(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    homeId: row.home_id as string,
    title: row.title as string,
    description: row.description as string | null,
    createdBy: row.created_by as string,
    frequencyType: row.frequency_type as Task['frequencyType'],
    frequencyConfig: row.frequency_config as Task['frequencyConfig'],
    nextDueDate: row.next_due_date as string | null,
    rotationEnabled: row.rotation_enabled as boolean,
    rotationMembers: (row.rotation_members as string[]) ?? [],
    rotationIndex: row.rotation_index as number,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    assignments: Array.isArray(row.task_assignments)
      ? (row.task_assignments as Record<string, unknown>[]).map((a) => ({
          id: a.id as string,
          taskId: a.task_id as string,
          userId: a.user_id as string,
          assignedAt: a.assigned_at as string,
        }))
      : undefined,
  }
}

function mapCompletionFromDb(row: Record<string, unknown>): TaskCompletion {
  return {
    id: row.id as string,
    taskId: row.task_id as string,
    completedBy: row.completed_by as string,
    dueDate: row.due_date as string | null,
    completedAt: row.completed_at as string,
    wasOverdue: row.was_overdue as boolean,
  }
}
