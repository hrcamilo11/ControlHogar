# Plan de Functional Design — U2: Tareas del Hogar

## Plan de Ejecución

### Fase 1: Modelo de Dominio
- [x] Definir entidades (Task, TaskCompletion, TaskAssignment)
- [x] Definir relaciones y cardinalidades
- [x] Especificar atributos y tipos de frecuencia

### Fase 2: Reglas de Negocio
- [x] Reglas de creación y edición de tareas
- [x] Reglas de recurrencia y generación de ocurrencias
- [x] Reglas de asignación y completación
- [x] Reglas de permisos por rol

### Fase 3: Lógica de Negocio
- [x] Flujo de crear tarea con frecuencia
- [x] Flujo de completar tarea (con generación de siguiente ocurrencia)
- [x] Flujo de tareas atrasadas (cron + notificaciones)
- [x] Integración con PowerSync (sync rules para tasks)

### Fase 4: Componentes Frontend
- [x] Pantallas de tareas (lista, crear, detalle, historial)
- [x] Componentes específicos de tareas

---

## Preguntas de Diseño Funcional

### Pregunta 1: Modelo de Recurrencia
¿Cómo deben manejarse las tareas recurrentes internamente?

A) Una sola fila por tarea — la "próxima ocurrencia" se calcula dinámicamente. Al completar, se actualiza la fecha de la siguiente ocurrencia. Historial en tabla separada (task_completions).

B) Múltiples filas — se pre-generan las próximas N ocurrencias como filas individuales (ej: las próximas 4 semanas). Al completar una, se marca esa fila. Se generan más filas periódicamente.

C) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: A

### Pregunta 2: Rotación de Asignaciones
¿Debe soportarse rotación automática de responsables en tareas recurrentes?

A) Sí — al completar una tarea recurrente, la siguiente ocurrencia se asigna automáticamente al siguiente miembro en una lista de rotación definida

B) No — las tareas recurrentes mantienen siempre el mismo responsable (o se reasignan manualmente)

C) Opcional — el creador de la tarea elige si quiere rotación o asignación fija

D) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: C

### Pregunta 3: Tiempo Límite por Defecto
¿Las tareas deben tener siempre un tiempo límite (due date)?

A) Obligatorio — toda tarea debe tener una fecha/hora límite

B) Opcional — el usuario decide si pone fecha límite o no. Sin fecha = sin recordatorios ni atraso

C) Según frecuencia — las recurrentes tienen límite automático (fin del período), las one-time son opcionales

D) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: C

---

## Artefactos a Generar
- `aidlc-docs/construction/u2-tareas/functional-design/domain-entities.md`
- `aidlc-docs/construction/u2-tareas/functional-design/business-rules.md`
- `aidlc-docs/construction/u2-tareas/functional-design/business-logic-model.md`
- `aidlc-docs/construction/u2-tareas/functional-design/frontend-components.md`
