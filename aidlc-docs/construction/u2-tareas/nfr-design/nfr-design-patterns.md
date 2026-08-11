# NFR Design — U2: Tareas del Hogar

## Hereda de U1

Todos los patrones de U1 aplican: offline-first (PowerSync), retry, graceful degradation, circuit breaker, defense in depth, RLS, optimistic updates, query caching, code splitting.

## Extensiones Específicas

### Patrón: Optimistic Task Completion
- Al tocar "completar", la tarea se marca localmente como completada inmediatamente
- PowerSync sincroniza en background
- Si sync falla: se revierte el estado local y se muestra toast de error
- El trigger de DB genera la siguiente ocurrencia server-side

### Patrón: Cron Edge Function (check-overdue-tasks)
- Ejecuta diariamente via pg_cron o Supabase scheduled function
- Query: tareas activas con next_due_date < now() sin completion reciente
- Crea app_notifications para cada asignado
- Invoca Edge Function de push si hay tokens activos

### RLS Policies para U2
```sql
-- Tasks: miembros del hogar pueden ver, owner/admin/member pueden crear/editar
CREATE POLICY "Members view tasks" ON tasks FOR SELECT
  USING (is_home_member(home_id, auth.uid()));

CREATE POLICY "Members create tasks" ON tasks FOR INSERT
  WITH CHECK (is_home_member(home_id, auth.uid()) AND get_home_role(home_id, auth.uid()) IN ('owner','admin','member'));

CREATE POLICY "Authorized edit tasks" ON tasks FOR UPDATE
  USING (created_by = auth.uid() OR get_home_role(home_id, auth.uid()) IN ('owner','admin'));

-- TaskAssignments: miembros ven, owner/admin/member gestionan
CREATE POLICY "Members view assignments" ON task_assignments FOR SELECT
  USING (is_home_member((SELECT home_id FROM tasks WHERE id = task_id), auth.uid()));

-- TaskCompletions: miembros ven, cualquier miembro puede insertar (guest solo si asignado)
CREATE POLICY "Members view completions" ON task_completions FOR SELECT
  USING (is_home_member((SELECT home_id FROM tasks WHERE id = task_id), auth.uid()));

CREATE POLICY "Members insert completions" ON task_completions FOR INSERT
  WITH CHECK (completed_by = auth.uid());
```

### PowerSync Sync Rules Extension
Se agregan las tablas tasks, task_assignments, task_completions al bucket `home_tasks` en la configuración de PowerSync.
