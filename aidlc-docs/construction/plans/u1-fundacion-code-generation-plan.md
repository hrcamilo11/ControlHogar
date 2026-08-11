# Plan de Generación de Código — U1: Fundación

## Contexto de la Unidad

- **Unidad**: U1 — Fundación (Auth + Homes + Infraestructura)
- **Stories**: US-01 a US-05, US-19, US-20, US-21, US-22, US-24
- **Tipo de proyecto**: Greenfield, monorepo con workspaces
- **Workspace root**: `/home/hrcamilo/Documents/ControlHogar`
- **Dependencias**: Ninguna (es la base)

## Estructura de Código

```
ControlHogar/                          ← workspace root
├── packages/
│   ├── web/                           ← React + Vite + TailwindCSS
│   ├── mobile/                        ← React Native + Expo
│   ├── shared/                        ← TypeScript puro (services, types, hooks)
│   └── supabase/                      ← Migraciones + Edge Functions
├── .github/workflows/                 ← CI/CD
├── package.json                       ← workspace root
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

---

## Plan de Ejecución (31 pasos)

### Fase A: Setup del Monorepo y Configuración Base

- [ ] **Step 1**: Crear estructura raíz del monorepo (package.json root, pnpm-workspace.yaml, turbo.json, tsconfig.base.json, .gitignore, .prettierrc, eslint.config.js)
- [ ] **Step 2**: Crear package `packages/shared` (package.json, tsconfig.json, vitest.config.ts, estructura de directorios src/modules/)
- [ ] **Step 3**: Crear package `packages/supabase` (config base, supabase/config.toml placeholder)
- [ ] **Step 4**: Crear package `packages/web` (Vite + React + TailwindCSS + React Router setup)
- [ ] **Step 5**: Crear package `packages/mobile` (Expo init + Expo Router + configuración base)
- [ ] **Step 6**: Crear `.github/workflows/ci.yml` (lint + typecheck + test + audit + build)

### Fase B: Tipos y Modelos de Dominio (shared/types)

- [ ] **Step 7**: Definir tipos de dominio base — `shared/src/types/` (User, Home, HomeMember, Invitation, Role, enums, DTOs) — [US-01 a US-05]
- [ ] **Step 8**: Definir esquemas de validación Zod — `shared/src/types/schemas/` (validaciones de inputs para todas las entidades)

### Fase C: Migraciones de Base de Datos (supabase)

- [ ] **Step 9**: Crear migración inicial — tablas profiles, homes, home_members, invitations — `supabase/migrations/`
- [ ] **Step 10**: Crear migración de notificaciones — tablas user_devices, app_notifications, activity_entries, notification_preferences
- [ ] **Step 11**: Crear migración de RLS policies — políticas para todas las tablas
- [ ] **Step 12**: Crear migración de triggers y funciones — create_profile_on_signup, create_default_prefs, log_member_activity, cleanup jobs
- [ ] **Step 13**: Crear seed data — `supabase/seeds/seed.sql` (datos de prueba para desarrollo)

### Fase D: Services Layer (shared/modules)

- [ ] **Step 14**: Implementar `shared/src/modules/auth/` — auth.service.ts (signUp, signIn, signOut, OAuth, MFA, session management) — [US-01, US-02]
- [ ] **Step 15**: Implementar `shared/src/modules/homes/` — homes.service.ts, members.service.ts, invitations.service.ts — [US-03, US-04, US-05]
- [ ] **Step 16**: Implementar `shared/src/modules/sync/` — sync.service.ts, schema.ts, PowerSync configuration — [US-19, US-20, US-21]
- [ ] **Step 17**: Implementar `shared/src/modules/notifications/` — notifications.service.ts, push.service.ts, preferences.service.ts — [US-22, US-24]
- [ ] **Step 18**: Implementar `shared/src/events/` — event-bus.ts, event-types.ts (typed event system)

### Fase E: Unit Tests — Services (shared)

- [ ] **Step 19**: Tests unitarios para auth.service — `shared/src/modules/auth/__tests__/` (incluye PBT para token round-trip)
- [ ] **Step 20**: Tests unitarios para homes/members/invitations — `shared/src/modules/homes/__tests__/` (incluye PBT para invariantes: max 5 homes, max 20 members, expiry)
- [ ] **Step 21**: Tests unitarios para sync.service — `shared/src/modules/sync/__tests__/`
- [ ] **Step 22**: Tests unitarios para notifications — `shared/src/modules/notifications/__tests__/`

### Fase F: Edge Functions (supabase/functions)

- [ ] **Step 23**: Implementar Edge Functions — send-invitation-email, send-push-notification, health check — `supabase/functions/`

### Fase G: Frontend Web (packages/web)

- [ ] **Step 24**: Implementar layout, guards y navegación — AuthGuard, EmailVerifiedGuard, HomeGuard, MainLayout, Navigation
- [ ] **Step 25**: Implementar pantallas de Auth — Login, Register, VerifyEmail, ResetPassword, OAuth callback — [US-01, US-02]
- [ ] **Step 26**: Implementar pantallas de Homes — CreateHome, HomeSettings, Members, InviteModal, AcceptInvitation — [US-03, US-04, US-05]
- [ ] **Step 27**: Implementar Dashboard + Notifications Feed + Profile — [US-24]
- [ ] **Step 28**: Implementar componentes UI compartidos (Button, Input, Modal, Toast, Avatar, etc.)

### Fase H: Frontend Mobile (packages/mobile)

- [ ] **Step 29**: Implementar navegación y guards mobile (Expo Router, tabs, stack navigators)
- [ ] **Step 30**: Implementar pantallas mobile (Auth, Homes, Dashboard, Notifications, Profile) — mirrors de web adaptados a mobile UX

### Fase I: Documentación y Configuración Final

- [ ] **Step 31**: Crear README.md del proyecto, documentación de setup, vercel.json, y resumen de código generado en `aidlc-docs/construction/u1-fundacion/code/code-summary.md`

---

## Trazabilidad de Stories

| Story | Steps que la implementan |
|-------|------------------------|
| US-01 (Registro) | 7, 8, 9, 11, 12, 14, 19, 25, 30 |
| US-02 (Login) | 7, 14, 19, 25, 30 |
| US-03 (Crear Hogar) | 7, 8, 9, 11, 15, 20, 26, 30 |
| US-04 (Invitar) | 7, 8, 9, 11, 12, 15, 20, 23, 26, 30 |
| US-05 (Gestionar Miembros) | 7, 9, 11, 15, 20, 26, 30 |
| US-19 (Sync Realtime) | 16, 21 |
| US-20 (Modo Offline) | 16, 21 |
| US-21 (Conflictos) | 16, 21 |
| US-22 (Push Notifications) | 10, 17, 22, 23 |
| US-24 (Feed Actividad) | 10, 12, 17, 22, 27, 30 |

---

## Notas Importantes

- Todo el código se genera en el **workspace root** (`/home/hrcamilo/Documents/ControlHogar`), NUNCA en `aidlc-docs/`
- Los tests se escriben junto al código (co-located `__tests__/` directories)
- Se incluyen `data-testid` en todos los elementos interactivos del frontend
- Los esquemas Zod se reutilizan entre cliente y servidor
- PowerSync schema se define en shared/ y se usa en web y mobile
