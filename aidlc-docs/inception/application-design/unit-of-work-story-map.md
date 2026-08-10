# Mapeo de User Stories a Unidades de Trabajo — ControlHogar

## Resumen de Cobertura

| Unidad | Stories Asignadas | Total |
|--------|------------------|-------|
| U1: Fundación | US-01 a US-05, US-19, US-20, US-21, US-22, US-24 | 10 |
| U2: Tareas | US-06 a US-10 | 5 |
| U3: Finanzas | US-11 a US-15, US-23 | 6 |
| U4: Mantenimientos | US-16 a US-18 | 3 |
| **Total** | | **24** |

---

## Unidad 1: Fundación — Stories Asignadas

| Story | Título | Justificación |
|-------|--------|---------------|
| US-01 | Registro de Usuario | Core auth — fundación del sistema |
| US-02 | Inicio de Sesión | Core auth — fundación del sistema |
| US-03 | Crear un Hogar | Core homes — base para todo el contenido |
| US-04 | Invitar Miembros al Hogar | Core homes — habilita colaboración |
| US-05 | Gestionar Miembros y Roles | Core homes — RBAC del sistema |
| US-19 | Sincronización en Tiempo Real | Infraestructura transversal (Supabase Realtime + PowerSync base) |
| US-20 | Trabajar Sin Conexión | Infraestructura transversal (PowerSync config base) |
| US-21 | Resolución de Conflictos | Infraestructura transversal (mecanismo base de resolución) |
| US-22 | Recibir Notificaciones Push | Infraestructura de notificaciones (registro device, permisos) |
| US-24 | Feed de Actividad In-App | Infraestructura de notificaciones (feed base + badge) |

**Nota sobre US-19, US-20, US-21**: La Unidad 1 implementa la infraestructura base (PowerSync setup, connection management, conflict detection UI). Cada unidad posterior (U2, U3, U4) extiende la sync con sus propias tablas y reglas específicas.

---

## Unidad 2: Tareas del Hogar — Stories Asignadas

| Story | Título | Justificación |
|-------|--------|---------------|
| US-06 | Crear Tarea | Core del módulo de tareas |
| US-07 | Asignar Responsable a Tarea | Asignación y roles en tareas |
| US-08 | Completar Tarea | Flujo principal de uso diario |
| US-09 | Ver Historial de Tareas | Seguimiento y accountability |
| US-10 | Recibir Recordatorio de Tarea | Notificaciones específicas de tareas |

**Incluye implícitamente**:
- Sync offline de tareas (extensión de US-19/20/21 para tabla `tasks`)
- Eventos para NotificationOrchestrator (`task.created`, `task.completed`, `task.overdue`)
- Edge Function `check-overdue-tasks`

---

## Unidad 3: Finanzas del Hogar — Stories Asignadas

| Story | Título | Justificación |
|-------|--------|---------------|
| US-11 | Registrar Gasto | Core del módulo financiero |
| US-12 | Gestionar Pagos Recurrentes | Pagos periódicos con alertas |
| US-13 | Ver Balance entre Miembros | Cálculo de deudas/créditos |
| US-14 | Definir Presupuesto Mensual | Control de gastos por categoría |
| US-15 | Lista de Compras | Lista colaborativa de compras |
| US-23 | Recibir Notificaciones por Email | Las notificaciones email son principalmente para finanzas (pagos próximos, presupuesto excedido) |

**Incluye implícitamente**:
- Sync offline de datos financieros (extensión de US-19/20/21 para tablas de finance)
- Eventos para NotificationOrchestrator (`expense.created`, `budget.exceeded`, `payment.upcoming`)
- Edge Functions `check-upcoming-payments`, `send-email-notification`
- Storage bucket para recibos

---

## Unidad 4: Mantenimientos del Hogar — Stories Asignadas

| Story | Título | Justificación |
|-------|--------|---------------|
| US-16 | Registrar Mantenimiento Pendiente | Core del módulo de mantenimientos |
| US-17 | Gestionar Estado de Mantenimiento | Flujo de estados (pendiente→progreso→completado) |
| US-18 | Priorizar Mantenimientos | Priorización y recordatorios |

**Incluye implícitamente**:
- Sync offline de mantenimientos (extensión de US-19/20/21 para tabla `maintenances`)
- Eventos para NotificationOrchestrator (`maintenance.statusChanged`)
- Storage bucket para fotos de mantenimientos

---

## Validación de Cobertura

- ✅ **24/24 stories asignadas** — cobertura completa
- ✅ **Ninguna story sin unidad** — todas tienen hogar
- ✅ **Stories transversales (US-19 a US-24) distribuidas coherentemente** — infraestructura en U1, extensiones en cada unidad
- ✅ **Cada unidad es demostrable** — produce un incremento funcional visible
- ✅ **El orden respeta dependencias** — U1 primero, luego U2/U3/U4 en cualquier orden
