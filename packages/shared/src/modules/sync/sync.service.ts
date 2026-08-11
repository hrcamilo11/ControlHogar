import type { ConnectionStatus } from '../../types/enums'
import { eventBus } from '../../events'

type Unsubscribe = () => void

export interface SyncResult {
  uploaded: number
  downloaded: number
  conflicts: number
}

export interface Conflict {
  id: string
  table: string
  localData: Record<string, unknown>
  remoteData: Record<string, unknown>
}

export type ConflictResolution = 'local' | 'remote'

/**
 * SyncService manages PowerSync connection and offline sync.
 * This is a facade over PowerSync SDK — platform-specific implementations
 * (web vs mobile) extend this base with actual PowerSync instance.
 */
export class SyncService {
  private status: ConnectionStatus = 'disconnected'
  private listeners: Set<(status: ConnectionStatus) => void> = new Set()

  getConnectionStatus(): ConnectionStatus {
    return this.status
  }

  onConnectionChange(callback: (status: ConnectionStatus) => void): Unsubscribe {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  protected setStatus(newStatus: ConnectionStatus): void {
    this.status = newStatus
    this.listeners.forEach((cb) => cb(newStatus))

    if (newStatus === 'connected') {
      eventBus.emit('sync.connected', {})
    } else if (newStatus === 'disconnected') {
      eventBus.emit('sync.disconnected', {})
    }
  }

  /**
   * Initialize sync — to be overridden by platform-specific implementation.
   * Web: PowerSyncDatabase with WASQLite
   * Mobile: PowerSyncDatabase with react-native-quick-sqlite
   */
  async initialize(_userId: string): Promise<void> {
    // Platform-specific override
    this.setStatus('connecting')
  }

  async forceSync(): Promise<SyncResult> {
    // Platform-specific override
    return { uploaded: 0, downloaded: 0, conflicts: 0 }
  }

  async resolveConflict(_conflictId: string, _resolution: ConflictResolution): Promise<void> {
    // Platform-specific override
    eventBus.emit('sync.conflictResolved', { conflictId: _conflictId })
  }

  async getPendingConflicts(): Promise<Conflict[]> {
    // Platform-specific override
    return []
  }

  getPendingChangesCount(): number {
    // Platform-specific override
    return 0
  }
}
