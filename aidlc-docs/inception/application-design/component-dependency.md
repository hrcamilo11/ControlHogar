# Dependencias entre Componentes — ControlHogar

## Matriz de Dependencias

| Componente | Depende de |
|------------|-----------|
| App Web | Shared, PowerSync |
| App Mobile | Shared, PowerSync, Expo APIs |
| Shared/Auth | Supabase Client |
| Shared/Homes | Supabase Client, Auth |
| Shared/Tasks | Supabase Client, Auth, Homes, Sync |
| Shared/Finance | Supabase Client, Auth, Homes, Sync |
| Shared/Maintenance | Supabase Client, Auth, Homes, Sync |
| Shared/Sync | PowerSync, Supabase Client, Auth |
| Shared/Notifications | Supabase Client, Auth, Homes |
| Edge Functions | Supabase Admin, FCM/APNs SDK, Email SDK |
| DB Triggers | PostgreSQL internal |

---

## Diagrama de Dependencias

```
+------------------+     +------------------+
|     App Web      |     |   App Mobile     |
|    (React)       |     | (React Native)   |
+--------+---------+     +--------+---------+
         |                         |
         +------------+------------+
                      |
                      v
         +------------+------------+
         |     Shared Package      |
         |  +--------------------+ |
         |  |       Auth         | |
         |  +--------+-----------+ |
         |           |             |
         |           v             |
         |  +--------+-----------+ |
         |  |       Homes        | |
         |  +--------+-----------+ |
         |           |             |
         |     +-----+-----+      |
         |     |     |     |      |
         |     v     v     v      |
         |  +-----+-----+-----+  |
         |  |Tasks|Fin. |Mant.| |
         |  +--+--+--+--+--+--+  |
         |     |     |     |      |
         |     v     v     v      |
         |  +--------+---------+  |
         |  |   Sync Module    |  |
         |  +--------+---------+  |
         |           |            |
         |  +--------+---------+  |
         |  |  Notifications   |  |
         |  +------------------+  |
         +------------------------+
                      |
         +------------+------------+
         |                         |
         v                         v
+--------+---------+    +----------+--------+
|    PowerSync     |    |  Supabase Client  |
|  (Local DB +     |    |  (Auth, Storage,  |
|   Sync Engine)   |    |   Realtime)       |
+--------+---------+    +----------+--------+
         |                         |
         +------------+------------+
                      |
                      v
         +------------+------------+
         |   Supabase Backend      |
         |  +------------------+   |
         |  |   PostgreSQL     |   |
         |  |  + RLS + Triggers|   |
         |  +------------------+   |
         |  +------------------+   |
         |  | Edge Functions   |   |
         |  +------------------+   |
         |  +------------------+   |
         |  |    Realtime      |   |
         |  +------------------+   |
         +-------------------------+
```

---

## Flujos de Datos Principales

### Flujo 1: Operación CRUD Normal (Online)

```
Usuario → UI Component → Hook (TanStack Query)
  → Service → PowerSync (local write)
  → PowerSync sync → Supabase PostgreSQL
  → DB Trigger (si aplica) → Recalcular/Notificar
  → Realtime → Otros clientes conectados
```

### Flujo 2: Operación Offline

```
Usuario → UI Component → Hook (TanStack Query)
  → Service → PowerSync (local write, queued)
  → [Sin conexión - cambio almacenado localmente]
  → [Reconexión detectada]
  → PowerSync sync → Supabase PostgreSQL
  → Conflicto? → SyncOrchestrator → Resolución
  → DB Trigger → Efectos secundarios
```

### Flujo 3: Notificación Cross-Module

```
Evento (ej: tarea completada)
  → TaskOrchestrator emite 'task.completed'
  → NotificationOrchestrator escucha evento
  → Evalúa preferencias del usuario destino
  → Crea notificación in-app (local)
  → Si push habilitado: llama Edge Function
  → Edge Function envía push via FCM/APNs
  → Si email requerido: llama Edge Function de email
```

### Flujo 4: Sincronización Realtime (Multi-usuario online)

```
Usuario A hace cambio → PowerSync write local + sync
  → Supabase PostgreSQL actualizado
  → Supabase Realtime detecta cambio en tabla
  → Broadcast a canal del hogar
  → PowerSync de Usuario B recibe cambio
  → TanStack Query invalida query afectada
  → UI de Usuario B se re-renderiza con dato nuevo
```

---

## Patrones de Comunicación

| Patrón | Uso | Ejemplo |
|--------|-----|---------|
| Llamada directa (síncrona) | Operaciones CRUD, queries | `tasksService.createTask(data)` |
| Event Bus (asíncrono local) | Notificaciones cross-module | `eventBus.emit('task.completed', task)` |
| Realtime subscription | Updates multi-usuario | `supabase.channel('home:123').on(...)` |
| PowerSync sync | Offline ↔ Online | Automático por PowerSync engine |
| Webhook/HTTP | Cliente → Edge Function | `supabase.functions.invoke('send-push')` |
| DB Trigger | Reacción a datos | `AFTER INSERT ON expenses` |
| Cron | Tareas programadas | Edge Function con schedule |

---

## Reglas de Dependencia

1. **Auth es la base**: Todo módulo depende de Auth para obtener el usuario actual
2. **Homes es segundo nivel**: Tasks, Finance y Maintenance dependen de Homes para scope de datos
3. **Sync es transversal**: Todos los módulos de datos usan Sync para persistencia offline
4. **Notifications es consumidor**: Solo escucha eventos, no es dependencia de otros módulos
5. **No dependencias circulares**: Tasks no depende de Finance, Finance no depende de Tasks
6. **Shared no depende de plataforma**: Nunca importa código de web o mobile
