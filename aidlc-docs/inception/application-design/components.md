# Componentes del Sistema — ControlHogar

## Visión General de la Arquitectura

```
+----------------------------------------------------------+
|                    CLIENTE (Frontend)                      |
|  +------------+  +------------+  +--------------------+  |
|  |  App Web   |  | App Mobile |  |   Shared Package   |  |
|  |  (React)   |  |(React Nat.)|  | (types, hooks,     |  |
|  |            |  |  (Expo)    |  |  services, utils)  |  |
|  +------+-----+  +------+-----+  +---------+----------+  |
|         |               |                   |             |
|         +-------+-------+-------------------+             |
|                 |                                         |
|         +-------v-----------+                            |
|         |    PowerSync      |                            |
|         | (Offline Sync     |                            |
|         |  Engine)          |                            |
|         +-------+-----------+                            |
+-----------------|----------------------------------------+
                  |
                  v
+----------------------------------------------------------+
|                   BACKEND (Supabase)                       |
|  +-------------+  +--------------+  +----------------+  |
|  | PostgreSQL  |  | Edge         |  | Auth / Storage |  |
|  | + RLS       |  | Functions    |  | / Realtime     |  |
|  | + Triggers  |  | (Deno)       |  |                |  |
|  +-------------+  +--------------+  +----------------+  |
+----------------------------------------------------------+
```

---

## Componentes del Cliente

### 1. App Web (`packages/web`)
- **Propósito**: Interfaz web responsive para navegadores
- **Tecnología**: React + Vite + TailwindCSS
- **Responsabilidades**:
  - Renderizar la interfaz de usuario para escritorio/tablet
  - Gestionar rutas y navegación web
  - Integrar service workers para push notifications web
  - Manejar PWA capabilities (installable)

### 2. App Mobile (`packages/mobile`)
- **Propósito**: Aplicación nativa para iOS y Android
- **Tecnología**: React Native + Expo
- **Responsabilidades**:
  - Renderizar interfaz nativa optimizada para móvil
  - Gestionar navegación nativa (stack, tabs)
  - Integrar push notifications nativas (FCM/APNs)
  - Acceso a APIs nativas (cámara para fotos de recibos/mantenimientos)

### 3. Shared Package (`packages/shared`)
- **Propósito**: Código compartido entre web y mobile
- **Tecnología**: TypeScript puro (sin dependencias de plataforma)
- **Responsabilidades**:
  - Tipos/interfaces TypeScript (DTOs, modelos de dominio)
  - Hooks compartidos de lógica de negocio
  - Servicios de acceso a datos (CRUD, queries)
  - Utilidades compartidas (formateo, validación, cálculos)
  - Configuración de PowerSync (esquema, reglas de sync)
  - Constantes y enums del dominio

### 4. Supabase Package (`packages/supabase`)
- **Propósito**: Código del backend (migraciones, funciones, seeds)
- **Tecnología**: SQL (migraciones) + TypeScript/Deno (Edge Functions)
- **Responsabilidades**:
  - Migraciones de base de datos (esquema)
  - Políticas RLS (Row Level Security)
  - Funciones y triggers de PostgreSQL
  - Edge Functions (lógica de negocio servidor)
  - Seeds de datos de prueba

---

## Componentes Funcionales (dentro de Shared)

### 5. Módulo de Autenticación (`shared/modules/auth`)
- **Propósito**: Gestión de identidad, sesiones y permisos
- **Responsabilidades**:
  - Login/registro (email, social)
  - Gestión de sesión y tokens
  - Verificación de roles y permisos (RBAC)
  - Lógica de invitaciones

### 6. Módulo de Hogares (`shared/modules/homes`)
- **Propósito**: Gestión de hogares y membresías
- **Responsabilidades**:
  - CRUD de hogares
  - Gestión de miembros (agregar, eliminar, cambiar rol)
  - Generación y validación de invitaciones
  - Selector de hogar activo

### 7. Módulo de Tareas (`shared/modules/tasks`)
- **Propósito**: Gestión de tareas domésticas
- **Responsabilidades**:
  - CRUD de tareas
  - Asignación de responsables
  - Gestión de recurrencia/frecuencia
  - Completar y registrar historial
  - Cálculo de próximas ocurrencias

### 8. Módulo de Finanzas (`shared/modules/finance`)
- **Propósito**: Gestión financiera del hogar
- **Responsabilidades**:
  - CRUD de gastos
  - Gestión de pagos recurrentes
  - Cálculo de balances entre miembros
  - Gestión de presupuestos por categoría
  - Lista de compras

### 9. Módulo de Mantenimientos (`shared/modules/maintenance`)
- **Propósito**: Gestión de arreglos y mantenimientos del hogar
- **Responsabilidades**:
  - CRUD de mantenimientos
  - Gestión de estados (pendiente/progreso/completado)
  - Priorización
  - Adjuntos (fotos, notas)

### 10. Módulo de Sincronización (`shared/modules/sync`)
- **Propósito**: Capa de sincronización offline-first
- **Responsabilidades**:
  - Configuración y gestión de PowerSync
  - Detección de estado de conexión
  - Cola de cambios pendientes
  - Resolución de conflictos (merge + manual)
  - Indicadores de estado de sincronización

### 11. Módulo de Notificaciones (`shared/modules/notifications`)
- **Propósito**: Gestión de notificaciones multi-canal
- **Responsabilidades**:
  - Notificaciones push (web + mobile)
  - Notificaciones in-app (feed de actividad, badges)
  - Preferencias de notificación por usuario
  - Lógica de cuándo y a quién notificar

---

## Componentes del Backend (Supabase)

### 12. Capa de Base de Datos
- **Propósito**: Persistencia, integridad y seguridad de datos
- **Responsabilidades**:
  - Esquema relacional (tablas, relaciones, constraints)
  - Row Level Security (RLS) — aislamiento por hogar
  - Triggers para lógica reactiva (calcular balances, generar ocurrencias)
  - Funciones PostgreSQL para cálculos complejos

### 13. Edge Functions
- **Propósito**: Lógica de negocio del servidor que no encaja en DB
- **Responsabilidades**:
  - Envío de emails (invitaciones, notificaciones)
  - Push notifications (FCM/APNs)
  - Webhooks y integraciones externas
  - Operaciones complejas multi-tabla
  - Cron jobs (verificar pagos vencidos, tareas atrasadas)

### 14. Supabase Realtime
- **Propósito**: Comunicación en tiempo real entre clientes
- **Responsabilidades**:
  - Broadcast de cambios a clientes conectados
  - Presence (quién está activo)
  - Suscripciones por hogar/tabla
