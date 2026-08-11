export type MaintenanceStatus = 'pending' | 'in_progress' | 'completed'
export type MaintenancePriority = 'high' | 'medium' | 'low'

export interface Maintenance {
  id: string
  homeId: string
  title: string
  description: string | null
  status: MaintenanceStatus
  priority: MaintenancePriority
  createdBy: string
  completedAt: string | null
  completedBy: string | null
  createdAt: string
  updatedAt: string
  notes?: MaintenanceNote[]
  photos?: MaintenancePhoto[]
}

export interface MaintenanceNote {
  id: string
  maintenanceId: string
  userId: string
  content: string
  createdAt: string
}

export interface MaintenancePhoto {
  id: string
  maintenanceId: string
  userId: string
  url: string
  caption: string | null
  createdAt: string
}

export interface CreateMaintenanceInput {
  title: string
  description?: string
  priority?: MaintenancePriority
}

export interface UpdateMaintenanceInput {
  title?: string
  description?: string | null
  priority?: MaintenancePriority
}

export interface MaintenanceFilters {
  homeId: string
  status?: MaintenanceStatus
  priority?: MaintenancePriority
  limit?: number
  cursor?: string
}
