# Servicios y Orquestación — ControlHogar

## Patrón de Servicios

La aplicación usa un patrón híbrido de comunicación:
- **Llamadas directas** para operaciones CRUD y consultas síncronas
- **Eventos reactivos** para actualizaciones en tiempo real y notificaciones cruzadas

---

## Capa de Servicios del Cliente

### Service Layer Architecture

```
+------------------------------------------------------------------+
|                        UI Layer                                    |
|  (React Components / React Native Screens)                        |
+---------------------------+--------------------------------------+
                            |
                            v
+------------------------------------------------------------------+
|                     Hooks Layer                                    |
|  useAuth, useTasks, useExpenses, useSync, useNotifications        |
|  (TanStack Query + Custom Hooks)                                  |
+---------------------------+--------------------------------------+
                            |
                            v
+------------------------------------------------------------------+
|                   Service Layer                                    |
|  auth.service, tasks.service, finance.service, etc.               |
|  (Lógica de negocio + acceso a datos)                            |
+----------+------------------+--------------------+---------------+
           |                  |                    |
           v                  v                    v
+----------------+  +------------------+  +-------------------+
| PowerSync      |  | Supabase Client  |  | Event Bus         |
| (Offline DB)   |  | (Auth, Storage,  |  | (Notificaciones   |
|                |  |  Edge Functions) |  |  cruzadas)        |
+----------------+  +------------------+  +-------------------+
```

---

## Servicios de Orquestación

### 1. HomeOrchestrator
**Propósito**: Coordinar operaciones que involucran múltiples módulos al gestionar hogares.

**Operaciones orquestadas**:
- `createHomeWithOwner()` — Crea hogar + asigna usuario como admin + inicializa configuración default
- `deleteHomeComplete()` — Elimina hogar + todas las tareas/gastos/mantenimientos + notifica a miembros
- `processInvitation()` — Valida token + agrega miembro + notifica al hogar + registra en actividad

---

### 2. TaskOrchestrator
**Propósito**: Coordinar tareas con notificaciones y recurrencia.

**Operaciones orquestadas**:
- `completeTaskWithEffects()` — Marca tarea completa + genera próxima ocurrencia (si recurrente) + notifica al hogar + actualiza feed de actividad
- `assignTaskWithNotification()` — Asigna responsable + envía push/in-app al asignado
- `checkOverdueTasks()` — (Cron) Revisa tareas vencidas + marca como atrasadas + notifica admin por email

---

### 3. FinanceOrchestrator
**Propósito**: Coordinar finanzas con balances y alertas.

**Operaciones orquestadas**:
- `createExpenseWithBalance()` — Crea gasto + recalcula balance entre miembros + verifica presupuesto
- `checkBudgetAlert()` — Evalúa si gasto excede 80% del presupuesto de categoría + alerta si necesario
- `markRecurringAsPaid()` — Marca pago como realizado + crea gasto asociado + actualiza balance
- `checkUpcomingPayments()` — (Cron) Revisa pagos próximos a vencer + envía email/push

---

### 4. SyncOrchestrator
**Propósito**: Coordinar el ciclo de sincronización offline/online.

**Operaciones orquestadas**:
- `handleReconnection()` — Detecta reconexión + sincroniza cola de cambios + detecta conflictos + presenta resolución si necesario
- `resolveConflict()` — Aplica resolución elegida + sincroniza resultado + notifica al otro usuario
- `initializeSync()` — Configura PowerSync + descarga datos iniciales del hogar + establece suscripciones

---

### 5. NotificationOrchestrator
**Propósito**: Determinar qué, cuándo y a quién notificar.

**Operaciones orquestadas**:
- `dispatchNotification()` — Evalúa preferencias del usuario + determina canal (push/email/in-app) + envía por el canal apropiado
- `createActivityEntry()` — Registra evento en feed de actividad + actualiza badge de no-leídos + emite evento realtime

---

## Event Bus (Comunicación Reactiva)

### Eventos del Sistema

| Evento | Emisor | Consumidores |
|--------|--------|--------------|
| `task.created` | TaskService | NotificationOrchestrator, ActivityFeed |
| `task.completed` | TaskOrchestrator | NotificationOrchestrator, ActivityFeed |
| `task.overdue` | Cron Job | NotificationOrchestrator |
| `expense.created` | FinanceOrchestrator | NotificationOrchestrator, ActivityFeed |
| `budget.exceeded` | FinanceOrchestrator | NotificationOrchestrator |
| `payment.upcoming` | Cron Job | NotificationOrchestrator |
| `member.joined` | HomeOrchestrator | NotificationOrchestrator, ActivityFeed |
| `member.removed` | HomeOrchestrator | NotificationOrchestrator |
| `maintenance.statusChanged` | MaintenanceService | NotificationOrchestrator, ActivityFeed |
| `sync.conflictDetected` | SyncOrchestrator | UI (modal de resolución) |
| `sync.statusChanged` | SyncOrchestrator | UI (indicador de conexión) |

### Implementación del Event Bus
- **En el cliente**: Zustand-compatible event emitter o React Context con pub/sub
- **En el servidor**: Supabase Realtime channels por hogar + PostgreSQL NOTIFY/LISTEN para triggers

---

## Servicios del Backend (Supabase)

### Edge Functions

| Función | Trigger | Responsabilidad |
|---------|---------|-----------------|
| `send-invitation-email` | HTTP (desde cliente) | Enviar email de invitación con enlace |
| `send-push-notification` | Webhook (desde DB trigger) | Enviar push via FCM/APNs |
| `send-email-notification` | Webhook (desde DB trigger) | Enviar email transaccional |
| `check-overdue-tasks` | Cron (diario) | Identificar tareas vencidas, crear notificaciones |
| `check-upcoming-payments` | Cron (diario) | Identificar pagos próximos, crear notificaciones |
| `process-invitation` | HTTP (desde cliente) | Validar token, agregar miembro |

### Database Triggers

| Trigger | Tabla | Acción | Resultado |
|---------|-------|--------|-----------|
| `on_expense_insert` | expenses | AFTER INSERT | Recalcula balance del hogar |
| `on_expense_delete` | expenses | AFTER DELETE | Recalcula balance del hogar |
| `on_task_complete` | task_completions | AFTER INSERT | Genera próxima ocurrencia si recurrente |
| `on_member_insert` | home_members | AFTER INSERT | Notifica al hogar |
| `on_settlement_insert` | settlements | AFTER INSERT | Ajusta balance entre miembros |
