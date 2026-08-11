import type { SupabaseClient } from '@supabase/supabase-js'
import type { Invitation } from '../../types'
import type { CreateInvitationInput } from '../../types/dto'
import { createInvitationSchema } from '../../types/schemas'
import { nanoid } from 'nanoid'
import { eventBus } from '../../events'

const INVITATION_EXPIRY_HOURS = 24
const TOKEN_LENGTH = 64

export class InvitationsService {
  constructor(private readonly supabase: SupabaseClient) {}

  async createInvitation(homeId: string, data: CreateInvitationInput): Promise<Invitation> {
    const validated = createInvitationSchema.parse(data)

    const { data: session } = await this.supabase.auth.getSession()
    if (!session.session) throw new Error('No autenticado')

    const token = nanoid(TOKEN_LENGTH)
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()

    const { data: invitation, error } = await this.supabase
      .from('invitations')
      .insert({
        home_id: homeId,
        invited_by: session.session.user.id,
        email: validated.email ?? null,
        role: validated.role,
        token,
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    const result = mapInvitationFromDb(invitation)
    eventBus.emit('invitation.created', {
      homeId,
      email: validated.email ?? null,
      role: validated.role,
    })
    return result
  }

  async getInvitations(homeId: string): Promise<Invitation[]> {
    const { data, error } = await this.supabase
      .from('invitations')
      .select()
      .eq('home_id', homeId)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data ?? []).map(mapInvitationFromDb)
  }

  async acceptInvitation(token: string): Promise<{ homeId: string }> {
    const { data: session } = await this.supabase.auth.getSession()
    if (!session.session) throw new Error('No autenticado')

    // Find invitation
    const { data: invitation, error: findError } = await this.supabase
      .from('invitations')
      .select()
      .eq('token', token)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .single()

    if (findError || !invitation) throw new Error('Invitación no encontrada o inválida')

    // Check expiry
    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error('La invitación ha expirado')
    }

    // Accept: add member + mark invitation
    const userId = session.session.user.id

    const { error: memberError } = await this.supabase
      .from('home_members')
      .insert({
        home_id: invitation.home_id,
        user_id: userId,
        role: invitation.role,
      })

    if (memberError) throw new Error(memberError.message)

    await this.supabase
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    eventBus.emit('invitation.accepted', { homeId: invitation.home_id, userId })
    return { homeId: invitation.home_id }
  }

  async revokeInvitation(invitationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('invitations')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', invitationId)

    if (error) throw new Error(error.message)
  }
}

function mapInvitationFromDb(row: Record<string, unknown>): Invitation {
  return {
    id: row.id as string,
    homeId: row.home_id as string,
    invitedBy: row.invited_by as string,
    email: row.email as string | null,
    role: row.role as Invitation['role'],
    token: row.token as string,
    expiresAt: row.expires_at as string,
    acceptedAt: row.accepted_at as string | null,
    revokedAt: row.revoked_at as string | null,
    createdAt: row.created_at as string,
  }
}
