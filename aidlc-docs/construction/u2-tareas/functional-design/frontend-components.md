# Componentes Frontend — U2: Tareas del Hogar

## Pantallas

### Pantalla: Lista de Tareas (`/tasks`)
**Componentes:**
- `TasksScreen`
  - `TaskFilters` — Filtros: Todas | Mis tareas | Atrasadas | Sin asignar
  - `TaskList` — Lista virtualizada de tareas
    - `TaskCard` — Tarjeta individual de tarea
      - Indicador de prioridad/atraso (rojo si atrasada)
      - Título de la tarea
      - Asignado(s) (avatares)
      - Próxima fecha (o "Sin fecha")
      - Badge de frecuencia (diaria, semanal, etc.)
      - Botón "Completar" (check)
  - `FAB` — Floating Action Button "Nueva tarea"
  - `EmptyState` — "No hay tareas, crea la primera"

**Estado:**
- `filter`: 'all' | 'mine' | 'overdue' | 'unassigned'
- `tasks`: Task[] (desde PowerSync local query)

---

### Pantalla: Crear/Editar Tarea (`/tasks/new`, `/tasks/:id/edit`)
**Componentes:**
- `TaskForm`
  - Input título (obligatorio, 1-200 chars)
  - Textarea descripción (opcional, 0-1000 chars)
  - `FrequencySelector` — Selector de frecuencia
    - Radio: Una vez | Diaria | Semanal | Quincenal | Mensual | Personalizada
    - Si Semanal/Quincenal: selector de día de la semana
    - Si Mensual: selector de día del mes (1-28)
    - Si Personalizada: input "cada X días"
    - Si Una vez: DatePicker opcional para due_date
  - `AssigneeSelector` — Selector de asignados
    - Lista de miembros del hogar con checkboxes
    - "Sin asignar" como opción
  - `RotationToggle` (visible solo si ≥2 asignados)
    - Switch "Rotar responsables"
    - Si habilitado: lista reordenable de miembros para definir orden de rotación
  - Botón "Crear Tarea" / "Guardar Cambios"

---

### Pantalla: Detalle de Tarea (`/tasks/:id`)
**Componentes:**
- `TaskDetail`
  - `TaskHeader` — Título, frecuencia badge, estado (activa/atrasada/archivada)
  - `TaskDescription` — Descripción si existe
  - `TaskAssignees` — Lista de asignados con avatares
  - `TaskDueDate` — Próxima fecha con countdown ("en 2 días", "atrasada 3h")
  - `TaskRotationInfo` — Si rotación: mostrar orden y quién sigue
  - `QuickCompleteButton` — Botón grande "Completar tarea" (data-testid="task-complete-button")
  - `TaskCompletionHistory` — Últimas 5 completaciones (quién, cuándo, si estaba atrasada)
  - Menú: Editar, Archivar, Eliminar (según permisos)

---

### Pantalla: Historial de Tareas (`/tasks/history`)
**Componentes:**
- `TaskHistoryScreen`
  - `HistoryFilters` — Filtrar por: miembro, tarea, rango de fechas
  - `CompletionList` — Lista de completaciones
    - `CompletionItem` — Avatar + nombre + "completó {tarea}" + fecha + badge atrasada
  - Paginación infinite scroll
  - `EmptyState` — "No hay historial aún"

---

## Componentes Específicos de Tareas

| Componente | Props | Uso |
|------------|-------|-----|
| `TaskCard` | task, onComplete, onPress | Card en la lista principal |
| `FrequencySelector` | value, onChange | Selector de recurrencia en form |
| `FrequencyBadge` | frequencyType | Badge visual (🔄 Diaria, 📅 Semanal, etc.) |
| `AssigneeSelector` | members, selected, onChange | Multi-select de miembros |
| `RotationToggle` | enabled, members, onChange | Switch + lista reordenable |
| `DueCountdown` | dueDate | "En 2 días", "Atrasada 5h", "Sin fecha" |
| `OverdueIndicator` | isOverdue | Punto rojo o texto rojo |
| `QuickCompleteButton` | taskId, onComplete | Botón check con animación |
| `CompletionItem` | completion | Item del historial |

---

## Interacciones Clave

### Completar Tarea (Quick Action)
```
1. Usuario toca botón ✓ en TaskCard o QuickCompleteButton
2. Optimistic update: tarea desaparece de "atrasadas", aparece en "completadas hoy"
3. PowerSync write local → sync → trigger en DB
4. Si recurrente: nueva due_date aparece, tarea reaparece con nueva fecha
5. Si rotación: asignado cambia visualmente
6. Toast: "¡Tarea completada!"
7. Feed de actividad se actualiza para otros miembros
```

### Crear Tarea con Rotación
```
1. Usuario llena formulario y selecciona ≥2 asignados
2. Toggle "Rotar responsables" aparece
3. Usuario activa rotación y reordena lista (drag & drop)
4. Al crear: primer miembro de la lista es el asignado inicial
5. Indicador visual muestra "Próximo: {nombre}" después de completar
```
