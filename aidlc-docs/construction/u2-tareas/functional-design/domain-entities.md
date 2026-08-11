# Entidades de Dominio — U2: Tareas del Hogar

## Entidades

### Task
Representa una tarea del hogar (una sola fila, recalcula próxima ocurrencia al completar).

| Atributo | Tipo | Nullable | Descripción |
|----------|------|----------|-------------|
| id | UUID | No | Identificador único |
| home_id | UUID (FK→Home) | No | Hogar al que pertenece |
| title | string(200) | No | Título de la tarea |
| description | string(1000) | Sí | Descripción detallada |
| created_by | UUID (FK→User) | No | Usuario que creó la tarea |
| frequency_type | enum | No | 'once', 'daily', 'weekly', 'biweekly', 'monthly', 'custom' |
| frequency_config | JSONB | Sí | Config adicional: { dayOfWeek, dayOfMonth, intervalDays } |
| next_due_date | timestamptz | Sí | Próxima fecha límite (null si one-time sin fecha) |
| rotation_enabled | boolean | No | Si la asignación rota entre miembros |
| rotation_members | UUID[] | Sí | Lista ordenada de miembros en rotación |
| rotation_index | integer | No | Índice actual en la lista de rotación |
| is_active | boolean | No | Si la tarea está activa (false = archivada) |
| created_at | timestamptz | No | Fecha de creación |
| updated_at | timestamptz | No | Última modificación |

### TaskAssignment
Relación M:N entre Task y User (asignaciones actuales).

| Atributo | Tipo | Nullable | Descripción |
|----------|------|----------|-------------|
| id | UUID | No | Identificador único |
| task_id | UUID (FK→Task) | No | Tarea asignada |
| user_id | UUID (FK→User) | No | Usuario asignado |
| assigned_at | timestamptz | No | Fecha de asignación |

**Constraint**: UNIQUE(task_id, user_id)

### TaskCompletion
Historial de completaciones (cada vez que alguien completa la tarea).

| Atributo | Tipo | Nullable | Descripción |
|----------|------|----------|-------------|
| id | UUID | No | Identificador único |
| task_id | UUID (FK→Task) | No | Tarea completada |
| completed_by | UUID (FK→User) | No | Quién la completó |
| due_date | timestamptz | Sí | Fecha límite que tenía cuando se completó |
| completed_at | timestamptz | No | Fecha/hora de completación |
| was_overdue | boolean | No | Si estaba atrasada al completar |

---

## Relaciones

| Relación | Cardinalidad | Descripción |
|----------|-------------|-------------|
| Home → Task | 1:N | Un hogar tiene múltiples tareas |
| Task → TaskAssignment | 1:N | Una tarea puede tener múltiples asignados |
| Task → TaskCompletion | 1:N | Una tarea acumula historial de completaciones |
| User → TaskAssignment | 1:N | Un usuario puede tener múltiples tareas asignadas |
| User → TaskCompletion | 1:N | Un usuario puede completar múltiples tareas |

---

## Cálculo de next_due_date

| frequency_type | Cálculo al completar |
|---------------|---------------------|
| once | next_due_date = null (no se regenera) |
| daily | next_due_date = hoy + 1 día |
| weekly | next_due_date = próximo `dayOfWeek` desde hoy |
| biweekly | next_due_date = próximo `dayOfWeek` + 14 días |
| monthly | next_due_date = próximo mes, día `dayOfMonth` |
| custom | next_due_date = hoy + `intervalDays` días |
