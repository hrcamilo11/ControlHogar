import type { SupabaseClient } from '@supabase/supabase-js'
import type { HomeMember } from '../../types'
import type { Role } from '../../types/enums'
import { eventBus } from '../../events'

export class MembersService {
  constructor(private readonly supabase: SupabaseClient) {}

  async getMembers(homeId: string): Promise<HomeMember[]> {
    const { data, error } = await this.supabase
      .from('home_members')
      .select('*, profiles(*)')
      .eq('home_id', homeId)
      .order('joined_at', { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []).map(mapMemberFromDb)
  }

  async updateMemberRole(homeId: string, userId: string, role: Role): Promise<HomeMember> {
    const { data: currentMember } = await this.supabase
      .from('home_members')
      .select('role')
      .eq('home_id', homeId)
      .eq('user_id', userId)
      .single()

    const previousRole = currentMember?.role ?? 'member'

    const { data, error } = await this.supabase
      .from('home_members')
      .update({ role })
      .eq('home_id', homeId)
      .eq('user_id', userId)
      .select('*, profiles(*)')
      .single()

    if (error) throw new Error(error.message)

    const member = mapMemberFromDb(data)
    eventBus.emit('member.roleChanged', { member, previousRole })
    return member
  }

  async removeMember(homeId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('home_members')
      .delete()
      .eq('home_id', homeId)
      .eq('user_id', userId)

    if (error) throw new Error(error.message)
    eventBus.emit('member.removed', { userId, homeId })
  }

  async transferOwnership(homeId: string, newOwnerId: string): Promise<void> {
    const { data: session } = await this.supabase.auth.getSession()
    if (!session.session) throw new Error('No autenticado')

    const currentUserId = session.session.user.id

    // Demote current owner to admin
    await this.supabase
      .from('home_members')
      .update({ role: 'admin' })
      .eq('home_id', homeId)
      .eq('user_id', currentUserId)

    // Promote new owner
    await this.supabase
      .from('home_members')
      .update({ role: 'owner' })
      .eq('home_id', homeId)
      .eq('user_id', newOwnerId)
  }
}

function mapMemberFromDb(row: Record<string, unknown>): HomeMember {
  const profile = row.profiles as Record<string, unknown> | null
  return {
    id: row.id as string,
    homeId: row.home_id as string,
    userId: row.user_id as string,
    role: row.role as Role,
    joinedAt: row.joined_at as string,
    user: profile
      ? {
          id: profile.id as string,
          email: profile.email as string,
          displayName: profile.display_name as string,
          avatarUrl: profile.avatar_url as string | null,
          emailVerified: profile.email_verified as boolean,
          mfaEnabled: profile.mfa_enabled as boolean,
          createdAt: profile.created_at as string,
          updatedAt: profile.updated_at as string,
        }
      : undefined,
  }
}
