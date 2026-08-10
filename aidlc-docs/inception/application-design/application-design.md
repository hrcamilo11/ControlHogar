# Diseño de Aplicación Consolidado — ControlHogar

## Resumen Ejecutivo

ControlHogar es una aplicación multiplataforma construida como **monorepo con workspaces** usando TypeScript. La arquitectura sigue un patrón **offline-first** con PowerSync como motor de sincronización contra un backend Supabase (PostgreSQL).

---

## Decisiones Arquitectónicas

| Decisión | Elección | Justificación |
|----------|----------|---------------|
| Estructura del proyecto | Monorepo con workspaces | Compartir tipos, hooks y servicios entre web y mobile |
| Framework móvil | React Native + Expo | Código nativo real, gran ecosistema, excelente DX |
| Gestión de estado | TanStack Query + Context | Server-state con cache automático, ideal para datos de Supabase |
| Sync offline | PowerSync | Integración nativa con Supabase, resolución de conflictos |
| Comunicación interna | Híbrido (directa + eventos) | Directa para CRUD, eventos para notificaciones/realtime |
| Backend | RLS + Triggers + Edge Functions | Seguridad en DB, lógica reactiva, serverless para lo complejo |

---

## Estructura del Monorepo

```
ControlHogar/
+-- packages/
|   +-- web/                  # App React (Vite + TailwindCSS)
|   +-- mobile/               # App React Native (Expo)
|   +-- shared/               # Código compartido (TypeScript puro)
|   |   +-- modules/
|   |   |   +-- auth/         # Autenticación y sesiones
|   |   |   +-- homes/        # Hogares y membresías
|   |   |   +-- tasks/        # Tareas domésticas
|   |   |   +-- finance/      # Finanzas del hogar
|   |   |   +-- maintenance/  # Mantenimientos
|   |   |   +-- sync/         # Sincronización offline
|   |   |   +-- notifications/# Notificaciones multi-canal
|   |   +-- types/            # Tipos/interfaces TypeScript
|   |   +-- utils/            # Utilidades compartidas
|   |   +-- hooks/            # Hooks compartidos
|   +-- supabase/             # Backend (migraciones, Edge Functions, seeds)
+-- package.json              # Workspace root
+-- turbo.json                # Build system (Turborepo)
```

---

## Componentes del Sistema (14 totales)

### Cliente (4 packages)
1. **App Web** — React + Vite + TailwindCSS
2. **App Mobile** — React Native + Expo
3. **Shared Package** — Tipos, hooks, servicios (TypeScript puro)
4. **Supabase Package** — Migraciones, Edge Functions, seeds

### Módulos Funcionales (7, dentro de Shared)
5. **Auth** — Identidad, sesiones, RBAC
6. **Homes** — Hogares, membresías, invitaciones
7. **Tasks** — Tareas domésticas, recurrencia, historial
8. **Finance** — Gastos, pagos recurrentes, balances, presupuestos, lista de compras
9. **Maintenance** — Mantenimientos, prioridades, estados, adjuntos
10. **Sync** — PowerSync, offline queue, resolución de conflictos
11. **Notifications** — Push, email, in-app, preferencias

### Backend (3 capas en Supabase)
12. **Base de Datos** — PostgreSQL + RLS + Triggers
13. **Edge Functions** — Emails, push, cron jobs
14. **Realtime** — Broadcast de cambios por hogar

---

## Servicios de Orquestación (5)

| Orquestador | Responsabilidad |
|-------------|-----------------|
| HomeOrchestrator | Crear/eliminar hogares con efectos secundarios |
| TaskOrchestrator | Completar tareas + recurrencia + notificaciones |
| FinanceOrchestrator | Gastos + recálculo de balances + alertas de presupuesto |
| SyncOrchestrator | Reconexión + sync + resolución de conflictos |
| NotificationOrchestrator | Determinar canal + enviar notificación correcta |

---

## Flujo de Datos Principal

```
[Usuario] → [UI] → [Hook TanStack Query] → [Service]
    → [PowerSync local write] → [Sync to Supabase]
    → [DB Trigger si aplica] → [Realtime broadcast]
    → [Otros clientes reciben update]
```

---

## Jerarquía de Dependencias

```
Auth (base)
  └── Homes (segundo nivel)
       ├── Tasks
       ├── Finance
       └── Maintenance
            └── Sync (transversal a todos los de datos)
                 └── Notifications (consumidor de eventos)
```

**Regla clave**: No hay dependencias circulares. Los módulos funcionales (Tasks, Finance, Maintenance) son hermanos independientes entre sí.

---

## Documentos Detallados

- [components.md](./components.md) — Definición y responsabilidades de cada componente
- [component-methods.md](./component-methods.md) — Firmas de métodos e interfaces
- [services.md](./services.md) — Servicios de orquestación y event bus
- [component-dependency.md](./component-dependency.md) — Dependencias y flujos de datos
