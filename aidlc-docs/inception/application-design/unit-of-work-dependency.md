# Dependencias entre Unidades de Trabajo — ControlHogar

## Matriz de Dependencias

| Unidad | Depende de | Es dependencia de |
|--------|-----------|-------------------|
| U1: Fundación | — (ninguna) | U2, U3, U4 |
| U2: Tareas | U1 | — |
| U3: Finanzas | U1 | — |
| U4: Mantenimientos | U1 | — |

---

## Diagrama de Dependencias

```
+--------------------+
|  U1: Fundación     |
| (Auth + Homes +    |
|  Infraestructura)  |
+---------+----------+
          |
          +------------------+------------------+
          |                  |                  |
          v                  v                  v
+---------+------+  +--------+-------+  +------+-----------+
| U2: Tareas    |  | U3: Finanzas   |  | U4: Mantenim.    |
| del Hogar     |  | del Hogar      |  | del Hogar        |
+---------------+  +----------------+  +------------------+
```

---

## Interfaces/Contratos entre Unidades

### U1 provee a todas las unidades:

| Servicio/Interface | Consumido por | Contrato |
|-------------------|---------------|----------|
| `AuthService.getSession()` | U2, U3, U4 | Retorna sesión actual o null |
| `AuthService.getCurrentUser()` | U2, U3, U4 | Retorna usuario autenticado |
| `HomesService.getActiveHome()` | U2, U3, U4 | Retorna hogar activo seleccionado |
| `HomesService.getMembers()` | U2, U3, U4 | Lista de miembros del hogar activo |
| `SyncService.initialize()` | U2, U3, U4 | PowerSync listo para read/write |
| `SyncService.getConnectionStatus()` | U2, U3, U4 | Estado online/offline |
| `NotificationService.dispatchNotification()` | U2, U3, U4 | Envía notificación por canal apropiado |
| `EventBus.emit() / on()` | U2, U3, U4 | Publicar/suscribir eventos |
| RLS Policies base | U2, U3, U4 | Aislamiento de datos por home_id |
| PowerSync schema base | U2, U3, U4 | Extensible por cada unidad |

### Lo que cada unidad extiende:

| Unidad | Extiende de U1 |
|--------|----------------|
| U2 | PowerSync schema (+tasks, +task_completions), RLS (+tasks policies), Edge Functions (+check-overdue), Notificaciones (+task events) |
| U3 | PowerSync schema (+expenses, +recurring_payments, +settlements, +budgets, +shopping_items), RLS (+finance policies), Edge Functions (+check-payments), Storage (+receipts bucket), Notificaciones (+finance events) |
| U4 | PowerSync schema (+maintenances, +maintenance_notes), RLS (+maintenance policies), Storage (+maintenance_photos bucket), Notificaciones (+maintenance events) |

---

## Puntos de Integración Críticos

### 1. PowerSync Schema Extension
- **Mecanismo**: Cada unidad agrega tablas al esquema de PowerSync definido en U1
- **Contrato**: Las nuevas tablas deben seguir la convención de `home_id` como FK para RLS
- **Validación**: Migraciones SQL secuenciales (U1 crea base, U2/U3/U4 agregan tablas)

### 2. Event Bus Registration
- **Mecanismo**: Cada unidad registra sus eventos y listeners en el event bus de U1
- **Contrato**: Eventos siguen formato `module.action` (ej: `task.completed`, `expense.created`)
- **Validación**: Los tipos de eventos están definidos en shared/events/

### 3. Notification Integration
- **Mecanismo**: Cada unidad usa `NotificationOrchestrator` de U1 para enviar notificaciones
- **Contrato**: Proporcionar payload con `type`, `recipientId`, `title`, `body`, `data`
- **Validación**: Las preferencias del usuario se respetan automáticamente

### 4. Navegación y UI Shell
- **Mecanismo**: U1 define el layout/shell (tabs, drawer), U2/U3/U4 agregan sus pantallas
- **Contrato**: Cada unidad exporta sus rutas/screens siguiendo la convención del router
- **Validación**: Lazy loading de features (code splitting por módulo)

---

## Reglas de Integración

1. **Las unidades NO se comunican entre sí directamente** — solo a través de servicios de U1
2. **Las migraciones de DB son incrementales** — nunca modificar migraciones de otra unidad
3. **Los tipos compartidos viven en shared/types/** — accesibles por todas las unidades
4. **Cada unidad tiene sus propios tests** — no dependen de tests de otras unidades
5. **El CI/CD corre tests de todas las unidades** — falla si cualquier unidad rompe
