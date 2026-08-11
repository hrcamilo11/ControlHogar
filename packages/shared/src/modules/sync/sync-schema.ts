/**
 * PowerSync schema definition for U1: Fundación
 * Defines which tables and columns are synced to client devices.
 * Extended by U2/U3/U4 with additional tables.
 */
export const syncSchema = {
  tables: [
    {
      name: 'profiles',
      columns: [
        { name: 'email', type: 'text' },
        { name: 'display_name', type: 'text' },
        { name: 'avatar_url', type: 'text' },
        { name: 'email_verified', type: 'integer' },
        { name: 'mfa_enabled', type: 'integer' },
        { name: 'created_at', type: 'text' },
        { name: 'updated_at', type: 'text' },
      ],
    },
    {
      name: 'homes',
      columns: [
        { name: 'name', type: 'text' },
        { name: 'description', type: 'text' },
        { name: 'created_by', type: 'text' },
        { name: 'is_active', type: 'integer' },
        { name: 'deleted_at', type: 'text' },
        { name: 'created_at', type: 'text' },
        { name: 'updated_at', type: 'text' },
      ],
    },
    {
      name: 'home_members',
      columns: [
        { name: 'home_id', type: 'text' },
        { name: 'user_id', type: 'text' },
        { name: 'role', type: 'text' },
        { name: 'joined_at', type: 'text' },
      ],
    },
    {
      name: 'invitations',
      columns: [
        { name: 'home_id', type: 'text' },
        { name: 'invited_by', type: 'text' },
        { name: 'email', type: 'text' },
        { name: 'role', type: 'text' },
        { name: 'token', type: 'text' },
        { name: 'expires_at', type: 'text' },
        { name: 'accepted_at', type: 'text' },
        { name: 'revoked_at', type: 'text' },
        { name: 'created_at', type: 'text' },
      ],
    },
    {
      name: 'app_notifications',
      columns: [
        { name: 'user_id', type: 'text' },
        { name: 'home_id', type: 'text' },
        { name: 'type', type: 'text' },
        { name: 'title', type: 'text' },
        { name: 'body', type: 'text' },
        { name: 'data', type: 'text' },
        { name: 'is_read', type: 'integer' },
        { name: 'created_at', type: 'text' },
      ],
    },
    {
      name: 'activity_entries',
      columns: [
        { name: 'home_id', type: 'text' },
        { name: 'user_id', type: 'text' },
        { name: 'action', type: 'text' },
        { name: 'entity_type', type: 'text' },
        { name: 'entity_id', type: 'text' },
        { name: 'metadata', type: 'text' },
        { name: 'created_at', type: 'text' },
      ],
    },
  ],
} as const
