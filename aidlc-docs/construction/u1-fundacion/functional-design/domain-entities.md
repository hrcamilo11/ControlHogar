# Entidades de Dominio — U1: Fundación

## Diagrama de Entidades

```
+----------------+       +----------------+       +------------------+
|     User       |       |      Home      |       |   HomeMember     |
+----------------+       +----------------+       +------------------+
| id (PK)        |       | id (PK)        |       | id (PK)          |
| email          |  1  N | name           |  1  N | home_id (FK)     |
| display_name   |<----->| description    |<----->| user_id (FK)     |
| avatar_url     |       | created_by(FK) |       | role             |
| email_verified |       | is_active      |       | joined_at        |
| mfa_enabled    |       | deleted_at     |       +------------------+
| created_at     |       | created_at     |
| updated_at     |       | updated_at     |       +------------------+
+----------------+       +----------------+       |   Invitation     |
                                                  +------------------+
+------------------+                              | id (PK)          |
|    UserDevice    |                              | home_id (FK)     |
+------------------+                              | invited_by (FK)  |
| id (PK)          |                              | email            |
| user_id (FK)     |                              | role             |
| push_token       |                              | token            |
| platform         |                              | expires_at       |
| is_active        |                              | accepted_at      |
| created_at       |                              | revoked_at       |
| updated_at       |                              | created_at       |
+------------------+                              +------------------+

+------------------+       +------------------+
| AppNotification  |       | ActivityEntry    |
+------------------+       +------------------+
| id (PK)          |       | id (PK)          |
| user_id (FK)     |       | home_id (FK)     |
| home_id (FK)     |       | user_id (FK)     |
| type             |       | action           |
| title            |       | entity_type      |
| body             |       | entity_id        |
| data (JSON)      |       | metadata (JSON)  |
| is_read          |       | created_at       |
| created_at       |       +------------------+
+------------------+

+-------------------------+
| NotificationPreference  |
+-------------------------+
| id (PK)                 |
| user_id (FK)            |
| category                |
| push_enabled            |
| email_enabled           |
| in_app_enabled          |
+-------------------------+
```

---

## Entidades Detalladas

### User
Representa un usuario registrado en el sistema.

| Atributo | Tipo | Nullable | Descripción |
|----------|------|----------|-------------|
| id | UUID | No | Identificador único (generado por Supabase Auth) |
| email | string | No | Email del usuario (único) |
| display_name | string | No | Nombre visible en la app |
| avatar_url | string | Sí | URL de la foto de perfil |
| email_verified | boolean | No | Si el email ha sido verificado |
| mfa_enabled | boolean | No | Si tiene MFA habilitado |
| created_at | timestamp | No | Fecha de registro |
| updated_at | timestamp | No | Última actualización del perfil |

**Nota**: El usuario en Supabase Auth (`auth.users`) es la fuente primaria. Esta tabla (`public.profiles`) extiende con datos de aplicación.

---

### Home
Representa un hogar (espacio compartido).

| Atributo | Tipo | Nullable | Descripción |
|----------|------|----------|-------------|
| id | UUID | No | Identificador único |
| name | string(100) | No | Nombre del hogar |
| description | string(500) | Sí | Descripción opcional |
| created_by | UUID (FK→User) | No | Usuario que creó el hogar |
| is_active | boolean | No | false = soft deleted |
| deleted_at | timestamp | Sí | Fecha de soft delete (null si activo) |
| created_at | timestamp | No | Fecha de creación |
| updated_at | timestamp | No | Última actualización |

---

### HomeMember
Tabla de relación M:N entre User y Home con rol.

| Atributo | Tipo | Nullable | Descripción |
|----------|------|----------|-------------|
| id | UUID | No | Identificador único |
| home_id | UUID (FK→Home) | No | Hogar al que pertenece |
| user_id | UUID (FK→User) | No | Usuario miembro |
| role | enum | No | 'owner' \| 'admin' \| 'member' \| 'guest' |
| joined_at | timestamp | No | Fecha en que se unió |

**Constraint**: UNIQUE(home_id, user_id)

---

### Invitation
Invitación pendiente para unirse a un hogar.

| Atributo | Tipo | Nullable | Descripción |
|----------|------|----------|-------------|
| id | UUID | No | Identificador único |
| home_id | UUID (FK→Home) | No | Hogar al que se invita |
| invited_by | UUID (FK→User) | No | Admin que generó la invitación |
| email | string | Sí | Email del invitado (null si es enlace genérico) |
| role | enum | No | Rol asignado al aceptar: 'admin' \| 'member' \| 'guest' |
| token | string(64) | No | Token único para el enlace (crypto random) |
| expires_at | timestamp | No | created_at + 24 horas |
| accepted_at | timestamp | Sí | Fecha de aceptación (null si pendiente) |
| revoked_at | timestamp | Sí | Fecha de revocación (null si vigente) |
| created_at | timestamp | No | Fecha de creación |

---

### UserDevice
Dispositivos registrados para push notifications.

| Atributo | Tipo | Nullable | Descripción |
|----------|------|----------|-------------|
| id | UUID | No | Identificador único |
| user_id | UUID (FK→User) | No | Usuario dueño del dispositivo |
| push_token | string | No | Token FCM/APNs |
| platform | enum | No | 'ios' \| 'android' \| 'web' |
| is_active | boolean | No | Si el token sigue vigente |
| created_at | timestamp | No | Fecha de registro |
| updated_at | timestamp | No | Última actualización |

**Constraint**: UNIQUE(user_id, push_token)

---

### AppNotification
Notificación in-app para el usuario.

| Atributo | Tipo | Nullable | Descripción |
|----------|------|----------|-------------|
| id | UUID | No | Identificador único |
| user_id | UUID (FK→User) | No | Destinatario |
| home_id | UUID (FK→Home) | Sí | Hogar relacionado (null si es de sistema) |
| type | string | No | Tipo de notificación (task.assigned, payment.upcoming, etc.) |
| title | string(200) | No | Título de la notificación |
| body | string(500) | No | Cuerpo del mensaje |
| data | JSONB | Sí | Datos adicionales para navegación/contexto |
| is_read | boolean | No | Si ha sido leída |
| created_at | timestamp | No | Fecha de creación |

---

### ActivityEntry
Entrada del feed de actividad del hogar.

| Atributo | Tipo | Nullable | Descripción |
|----------|------|----------|-------------|
| id | UUID | No | Identificador único |
| home_id | UUID (FK→Home) | No | Hogar donde ocurrió la actividad |
| user_id | UUID (FK→User) | No | Usuario que realizó la acción |
| action | string | No | Acción realizada ('created', 'completed', 'joined', etc.) |
| entity_type | string | No | Tipo de entidad afectada ('task', 'expense', 'home', etc.) |
| entity_id | UUID | Sí | ID de la entidad afectada |
| metadata | JSONB | Sí | Datos extra (nombre de tarea, monto, etc.) |
| created_at | timestamp | No | Fecha del evento |

---

### NotificationPreference
Preferencias de notificación por usuario y categoría.

| Atributo | Tipo | Nullable | Descripción |
|----------|------|----------|-------------|
| id | UUID | No | Identificador único |
| user_id | UUID (FK→User) | No | Usuario dueño de las preferencias |
| category | string | No | Categoría: 'tasks', 'finance', 'maintenance', 'home' |
| push_enabled | boolean | No | Recibir push para esta categoría |
| email_enabled | boolean | No | Recibir email para esta categoría |
| in_app_enabled | boolean | No | Mostrar in-app para esta categoría |

**Constraint**: UNIQUE(user_id, category)

---

## Relaciones y Cardinalidades

| Relación | Cardinalidad | Descripción |
|----------|-------------|-------------|
| User → HomeMember | 1:N (máx 5) | Un usuario pertenece a máximo 5 hogares |
| Home → HomeMember | 1:N (máx 20) | Un hogar tiene máximo 20 miembros |
| Home → Invitation | 1:N | Un hogar puede tener múltiples invitaciones |
| User → Invitation (invited_by) | 1:N | Un admin puede crear múltiples invitaciones |
| User → UserDevice | 1:N | Un usuario puede tener múltiples dispositivos |
| User → AppNotification | 1:N | Un usuario recibe múltiples notificaciones |
| Home → ActivityEntry | 1:N | Un hogar acumula entradas de actividad |
| User → NotificationPreference | 1:N (por categoría) | Preferencias por categoría |
