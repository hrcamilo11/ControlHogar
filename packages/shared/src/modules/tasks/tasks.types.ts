export type FrequencyType = 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom'

export interface FrequencyConfig {
  dayOfWeek?: number // 0=Sun, 1=Mon, ..., 6=Sat
  dayOfMonth?: number // 1-28
  intervalDays?: number // for custom
}

export type TaskFrequency = {
  type: FrequencyType
  config?: FrequencyConfig
}

export interface Task {
  id: string
  homeId: string
  title: string
  description: string | null
  createdBy: string
  frequencyType: FrequencyType
  frequencyConfig: FrequencyConfig | null
  nextDueDate: string | null
  rotationEnabled: boolean
  rotationMembers: string[]
  rotationIndex: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  assignments?: TaskAssignment[]
}

export interface TaskAssignment {
  id: string
  taskId: string
  userId: string
  assignedAt: string
}

export interface TaskCompletion {
  id: string
  taskId: string
  completedBy: string
  dueDate: string | null
  completedAt: string
  wasOverdue: boolean
}

export interface CreateTaskInput {
  title: string
  description?: string
  frequencyType: FrequencyType
  frequencyConfig?: FrequencyConfig
  dueDate?: string // for one-time tasks
  assigneeIds?: string[]
  rotationEnabled?: boolean
  rotationMembers?: string[]
}

export interface UpdateTaskInput {
  title?: string
  description?: string | null
  assigneeIds?: string[]
  rotationEnabled?: boolean
  rotationMembers?: string[]
}

export interface TaskFilters {
  isActive?: boolean
  assignedTo?: string
  overdue?: boolean
  homeId: string
}

export interface HistoryFilters {
  homeId: string
  taskId?: string
  userId?: string
  fromDate?: string
  toDate?: string
  limit?: number
  cursor?: string
}
