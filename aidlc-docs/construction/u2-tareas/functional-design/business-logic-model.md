# Modelo de Lógica de Negocio — U2: Tareas del Hogar

## Flujo 1: Crear Tarea

```
1. Validar permisos (owner/admin/member)
2. Validar input (Zod: título, frecuencia, asignados)
3. Calcular next_due_date:
   - once: usar fecha proporcionada (o null si no se proporciona)
   - daily: mañana
   - weekly: próximo dayOfWeek
   - biweekly: próximo dayOfWeek + 14 días
   - monthly: día dayOfMonth del próximo mes
   - custom: hoy + intervalDays
4. Si rotation_enabled:
   - Validar rotation_members tiene ≥2 miembros
   - Establecer rotation_index = 0
   - Crear assignment para rotation_members[0]
5. Si NO rotation:
   - Crear assignments para cada assigneeId proporcionado
6. Insertar task en DB
7. Insertar task_assignments
8. Emitir evento 'task.created'
9. Crear activity_entry
10. Notificar a asignados (push + in-app)
```

## Flujo 2: Completar Tarea

```
1. Validar permisos:
   - Si user es guest: verificar que la tarea le está asignada
   - Si user no es guest: cualquier tarea del hogar
2. Verificar tarea existe y is_active == true
3. Determinar was_overdue: next_due_date < now()
4. Crear registro en task_completions
5. SI tarea es recurrente (frequency_type != 'once'):
   a. Calcular nueva next_due_date desde hoy (no desde la anterior)
   b. Actualizar task.next_due_date
   c. SI rotation_enabled:
      - rotation_index = (rotation_index + 1) % rotation_members.length
      - Eliminar assignments actuales
      - Crear nuevo assignment para rotation_members[rotation_index]
   d. Actualizar task.updated_at
6. SI tarea es one-time:
   a. Marcar task.is_active = false
7. Emitir evento 'task.completed' con payload: { task, completedBy, wasOverdue }
8. Crear activity_entry: { action: 'completed', entity_type: 'task', metadata: { title } }
9. Notificar al hogar (in-app) excepto al que completó
```

## Flujo 3: Check Overdue Tasks (Cron Diario)

```
1. Consultar tareas WHERE:
   - is_active = true
   - next_due_date IS NOT NULL
   - next_due_date < now()
   - No tiene completion con completed_at > last_due_date
2. Para cada tarea atrasada:
   a. Emitir evento 'task.overdue' con payload: { task, overdueHours }
   b. Notificar al(los) asignado(s):
      - Push notification: "Tarea atrasada: {title}"
      - In-app notification
   c. Si overdueHours > 24:
      - Notificar al owner/admin del hogar por email
3. Loguear resumen: { totalOverdue, notified }
```

## Flujo 4: Ver Mis Tareas

```
1. Obtener user_id actual
2. Consultar tasks WHERE:
   - home_id = activeHomeId
   - is_active = true
   - EXISTS (task_assignment WHERE user_id = currentUser)
   OR
   - task_assignments está vacío (sin asignar = visible para todos)
3. Ordenar por:
   - Atrasadas primero (next_due_date < now)
   - Luego por next_due_date ASC (más próximas primero)
   - One-time sin fecha al final
4. Retornar con datos de asignación incluidos
```

## Flujo 5: Ver Historial

```
1. Validar permisos (guest NO puede ver historial)
2. Consultar task_completions WHERE home_id (via task.home_id):
   - Filtros opcionales: por usuario, por tarea, por rango de fechas
3. Ordenar por completed_at DESC
4. Incluir datos: nombre de tarea, quién completó, si estaba atrasada
5. Paginación cursor-based (50 items por página)
```

## Integración PowerSync — Sync Rules

```yaml
# Extensión de sync rules para U2
bucket_definitions:
  home_tasks:
    parameters: SELECT home_id FROM home_members WHERE user_id = token_parameters.user_id
    data:
      - SELECT * FROM tasks WHERE home_id = bucket.home_id AND is_active = TRUE
      - SELECT * FROM task_assignments WHERE task_id IN (SELECT id FROM tasks WHERE home_id = bucket.home_id AND is_active = TRUE)
      - SELECT * FROM task_completions WHERE task_id IN (SELECT id FROM tasks WHERE home_id = bucket.home_id) ORDER BY completed_at DESC LIMIT 100
```

## Diagrama de Estados de una Tarea

```
                 +---[Crear]---+
                 |             |
                 v             |
            +---------+        |
            | ACTIVA  |        |
            | (pending)|       |
            +----+----+        |
                 |             |
    [next_due_date < now()]    |
                 |             |
                 v             |
            +---------+        |
            | ATRASADA|        |
            | (overdue)|       |
            +----+----+        |
                 |             |
         [Completar]           |
                 |             |
                 v             |
    +------------------------+ |
    | SI recurrente:         | |
    | → Recalcular due_date  +-+  (vuelve a ACTIVA)
    | → Rotar si aplica      |
    +------------------------+
    | SI one-time:           |
    | → is_active = false    |
    +------------------------+
                 |
                 v
            +---------+
            | ARCHIVADA|
            +---------+
```
