# NFR Requirements — U2: Tareas del Hogar

## Hereda de U1

Todos los NFRs de U1 aplican completamente (seguridad, rendimiento, resiliencia, observabilidad, mantenibilidad, accesibilidad, i18n).

## Extensiones Específicas de U2

### Performance
- Lista de tareas: render < 100ms para hasta 200 tareas (PowerSync local query)
- Completar tarea: optimistic update instantáneo, sync en background
- Cron check-overdue: debe completarse en < 10 segundos para 1000 tareas

### Security (RLS extensión)
- Nuevas policies RLS para tasks, task_assignments, task_completions
- Guest solo puede ver tareas y completar las asignadas a él

### PBT (Property-Based Testing)
- Invariantes: next_due_date calculation es idempotente por frecuencia
- Round-trip: frequency_config serialization
- Invariantes: rotation_index siempre en rango [0, rotation_members.length - 1]

### Tech Stack Additions
- Ninguna nueva dependencia — usa las mismas de U1
