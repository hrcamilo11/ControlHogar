# Unidades de Trabajo — ControlHogar

## Estrategia de Descomposición

- **Enfoque**: Por épica/prioridad MVP
- **Total de unidades**: 4
- **Plataformas**: Web + Mobile simultáneamente en cada unidad
- **Offline**: Infraestructura base en Unidad 1, sync específica en cada unidad funcional
- **Entregables**: Cada unidad produce un incremento funcional demostrable

---

## Unidad 1: Fundación (Auth + Homes + Infraestructura)

### Alcance
Setup completo del proyecto + autenticación + gestión de hogares + infraestructura transversal.

### Componentes Incluidos
- Estructura del monorepo (packages/web, mobile, shared, supabase)
- Configuración de Turborepo
- Configuración de Supabase (proyecto, migraciones iniciales)
- Módulo Auth completo (registro, login, OAuth, MFA, sesiones)
- Módulo Homes completo (CRUD hogares, miembros, invitaciones, roles)
- PowerSync configuración base (setup, esquema inicial, connection)
- Notificaciones infraestructura (push registration, in-app feed base)
- CI/CD pipeline (GitHub Actions: lint, test, build, deploy)
- RLS policies base (aislamiento por hogar)
- UI: Layout principal, navegación, pantallas auth, pantallas hogar

### Entregable Demostrable
Un usuario puede registrarse, crear un hogar, invitar miembros, asignar roles y ver la interfaz base tanto en web como en mobile.

### Tecnologías Setup
- Monorepo: pnpm workspaces + Turborepo
- Web: Vite + React + TailwindCSS + React Router
- Mobile: Expo + React Native + Expo Router
- Shared: TypeScript puro
- Backend: Supabase CLI + migraciones SQL
- Testing: Vitest + fast-check + React Testing Library
- CI/CD: GitHub Actions

---

## Unidad 2: Tareas del Hogar

### Alcance
Módulo completo de gestión de tareas domésticas con recurrencia, asignación y offline sync.

### Componentes Incluidos
- Módulo Tasks completo (CRUD, asignación, frecuencia, completar, historial)
- TaskOrchestrator (completar con efectos: recurrencia + notificaciones)
- PowerSync sync rules para tareas (offline read/write + sync)
- Resolución de conflictos para tareas (merge automático + manual)
- DB triggers (generar próxima ocurrencia al completar)
- Edge Function: check-overdue-tasks (cron diario)
- Notificaciones de tareas (push + in-app: asignación, recordatorio, atrasada)
- UI: Pantallas de tareas (lista, crear, detalle, historial) — web + mobile

### Entregable Demostrable
Los miembros del hogar pueden crear tareas recurrentes, asignarlas, completarlas, ver historial, recibir recordatorios y trabajar offline con sync automática.

### Dependencias
- **Requiere**: Unidad 1 completada (Auth, Homes, PowerSync base, Notifications infra)

---

## Unidad 3: Finanzas del Hogar

### Alcance
Módulo completo de planificación financiera con gastos, pagos recurrentes, balances, presupuestos y lista de compras.

### Componentes Incluidos
- Módulo Finance completo (gastos, pagos recurrentes, balance, presupuesto, compras)
- FinanceOrchestrator (gasto + recálculo balance + alerta presupuesto)
- PowerSync sync rules para finanzas
- Resolución de conflictos para datos financieros
- DB triggers (recalcular balance on insert/delete expense, settlement)
- Edge Functions: check-upcoming-payments (cron), send email vencimiento
- Supabase Storage (fotos de recibos)
- Notificaciones de finanzas (push + email + in-app: pagos próximos, presupuesto)
- UI: Pantallas de finanzas (gastos, recurrentes, balance, presupuesto, compras) — web + mobile

### Entregable Demostrable
Los miembros pueden registrar gastos compartidos, ver quién debe a quién, definir presupuestos con alertas, gestionar pagos recurrentes con recordatorios, y mantener una lista de compras colaborativa.

### Dependencias
- **Requiere**: Unidad 1 completada (Auth, Homes, PowerSync base, Notifications infra)
- **Independiente de**: Unidad 2 (no hay dependencia entre Tasks y Finance)

---

## Unidad 4: Mantenimientos del Hogar

### Alcance
Módulo completo de gestión de mantenimientos y arreglos con prioridades, estados y adjuntos.

### Componentes Incluidos
- Módulo Maintenance completo (CRUD, estados, prioridades, notas, fotos)
- PowerSync sync rules para mantenimientos
- Resolución de conflictos para mantenimientos
- Supabase Storage (fotos de mantenimientos)
- Notificaciones de mantenimientos (push + in-app: alta prioridad sin atender)
- UI: Pantallas de mantenimientos (lista, crear, detalle, historial) — web + mobile

### Entregable Demostrable
Los miembros pueden registrar arreglos pendientes con fotos, priorizarlos, hacer seguimiento de estados y recibir recordatorios de items de alta prioridad.

### Dependencias
- **Requiere**: Unidad 1 completada (Auth, Homes, PowerSync base, Notifications infra)
- **Independiente de**: Unidades 2 y 3 (no hay dependencia entre módulos funcionales)

---

## Orden de Implementación

```
Unidad 1: Fundación
    |
    +---> Unidad 2: Tareas (puede iniciar tras Unidad 1)
    |
    +---> Unidad 3: Finanzas (puede iniciar tras Unidad 1, paralelo a U2)
    |
    +---> Unidad 4: Mantenimientos (puede iniciar tras Unidad 1, paralelo a U2/U3)
```

**Secuencia recomendada**: U1 → U2 → U3 → U4 (secuencial, una persona/equipo)
**Alternativa paralela**: U1 → [U2 | U3 | U4] en paralelo (si hay múltiples desarrolladores)

---

## Organización del Código (Greenfield)

```
ControlHogar/
+-- packages/
|   +-- web/
|   |   +-- src/
|   |   |   +-- app/              # Routes y layouts
|   |   |   +-- features/
|   |   |   |   +-- auth/         # Pantallas auth (U1)
|   |   |   |   +-- homes/        # Pantallas hogares (U1)
|   |   |   |   +-- tasks/        # Pantallas tareas (U2)
|   |   |   |   +-- finance/      # Pantallas finanzas (U3)
|   |   |   |   +-- maintenance/  # Pantallas mantenimiento (U4)
|   |   |   |   +-- notifications/# Feed + preferencias (U1)
|   |   |   +-- components/       # Componentes UI reutilizables
|   |   |   +-- lib/              # Utilidades web-specific
|   +-- mobile/
|   |   +-- src/
|   |   |   +-- app/              # Expo Router (file-based routing)
|   |   |   +-- features/         # (misma estructura que web)
|   |   |   +-- components/       # Componentes nativos reutilizables
|   +-- shared/
|   |   +-- src/
|   |   |   +-- modules/
|   |   |   |   +-- auth/         # Services + hooks + types (U1)
|   |   |   |   +-- homes/        # Services + hooks + types (U1)
|   |   |   |   +-- tasks/        # Services + hooks + types (U2)
|   |   |   |   +-- finance/      # Services + hooks + types (U3)
|   |   |   |   +-- maintenance/  # Services + hooks + types (U4)
|   |   |   |   +-- sync/         # PowerSync config + hooks (U1 base)
|   |   |   |   +-- notifications/# Service + hooks + types (U1)
|   |   |   +-- types/            # Tipos globales compartidos
|   |   |   +-- utils/            # Utilidades puras
|   |   |   +-- events/           # Event bus
|   +-- supabase/
|   |   +-- migrations/           # SQL migrations (incrementales por unidad)
|   |   +-- functions/            # Edge Functions (Deno/TypeScript)
|   |   +-- seeds/                # Datos de prueba
|   |   +-- tests/                # Tests de integración DB
+-- .github/workflows/            # CI/CD (U1)
+-- package.json                  # Workspace root
+-- turbo.json                    # Turborepo config
+-- tsconfig.base.json            # TypeScript base config
