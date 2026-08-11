# Reglas de Negocio — U2: Tareas del Hogar

## BR-TASK: Reglas de Tareas

### BR-TASK-01: Creación de Tareas
- Solo owner, admin y member pueden crear tareas (guest NO)
- Título obligatorio (1-200 caracteres)
- Descripción opcional (máximo 1000 caracteres)
- frequency_type obligatorio
- Si frequency_type != 'once': next_due_date se calcula automáticamente a partir de hoy
- Si frequency_type == 'once': next_due_date es opcional (el usuario decide si pone fecha)

### BR-TASK-02: Asignación
- Se puede asignar a uno o múltiples miembros (incluyendo guests)
- Solo owner, admin y member pueden asignar (guest NO puede asignar a otros)
- Un miembro puede auto-asignarse tareas
- Si no se asigna a nadie, la tarea aparece como "sin asignar" (cualquiera puede completarla)

### BR-TASK-03: Rotación
- Si rotation_enabled == true, se requiere rotation_members (array con ≥2 miembros)
- Al completar una tarea con rotación, el rotation_index avanza al siguiente miembro
- La asignación actual (task_assignments) se actualiza al nuevo miembro de la rotación
- Si un miembro en la lista de rotación es eliminado del hogar, se remueve de rotation_members
- Si rotation_members queda con < 2 miembros, rotation_enabled se desactiva automáticamente

### BR-TASK-04: Completación
- Cualquier miembro del hogar puede completar una tarea (no solo el asignado)
- Guests solo pueden completar tareas que les están asignadas
- Al completar se crea un registro en task_completions
- Si tarea es recurrente: se recalcula next_due_date según frecuencia
- Si tarea es recurrente con rotación: se rota la asignación al siguiente miembro
- Si tarea es one-time: se marca is_active = false (archivada)
- Se emite evento 'task.completed' para notificaciones y feed de actividad

### BR-TASK-05: Tareas Atrasadas
- Una tarea está "atrasada" si next_due_date < now() y no ha sido completada
- Un cron diario revisa tareas atrasadas y emite evento 'task.overdue'
- Se notifica al asignado (push + in-app) y al admin (email si > 24h de atraso)
- Las tareas atrasadas se muestran con indicador visual en la UI

### BR-TASK-06: Edición y Eliminación
- Owner, admin y member pueden editar tareas que crearon
- Owner y admin pueden editar cualquier tarea del hogar
- Guest NO puede editar ni eliminar tareas
- Al eliminar una tarea (soft delete: is_active=false), se conserva el historial de completaciones
- No se puede eliminar un task_completion (historial es inmutable)

### BR-TASK-07: Permisos por Rol

| Acción | owner | admin | member | guest |
|--------|-------|-------|--------|-------|
| Crear tarea | ✅ | ✅ | ✅ | ❌ |
| Editar cualquier tarea | ✅ | ✅ | ❌ | ❌ |
| Editar tarea propia | ✅ | ✅ | ✅ | ❌ |
| Eliminar tarea | ✅ | ✅ | solo propias | ❌ |
| Asignar otros | ✅ | ✅ | ✅ | ❌ |
| Completar cualquier tarea | ✅ | ✅ | ✅ | ❌ |
| Completar tarea asignada | ✅ | ✅ | ✅ | ✅ |
| Ver tareas | ✅ | ✅ | ✅ | ✅ |
| Ver historial | ✅ | ✅ | ✅ | ❌ |

## Propiedades Testables (PBT-01)

### Invariantes
- Una tarea recurrente activa siempre tiene next_due_date != null
- rotation_index nunca excede rotation_members.length - 1
- Un task_completion siempre referencia una tarea existente
- El conteo de task_completions para una tarea solo puede incrementar (nunca decrementar)

### Idempotencia
- Completar una tarea ya completada en el mismo período no crea duplicado (dedup por task_id + completed_by + periodo)

### Round-trip
- Serializar/deserializar frequency_config mantiene la configuración intacta
