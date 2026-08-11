# Componentes Lógicos de Infraestructura — U1: Fundación

## Diagrama de Componentes Lógicos

```
+------------------------------------------------------------------+
|                         CLIENTE                                    |
|                                                                    |
|  +-------------------+  +-------------------+  +---------------+  |
|  | Error Boundary    |  | Connection        |  | Auth Guard    |  |
|  | (crash recovery)  |  | Monitor           |  | (route        |  |
|  |                   |  | (online/offline)  |  |  protection)  |  |
|  +-------------------+  +-------------------+  +---------------+  |
|                                                                    |
|  +-------------------+  +-------------------+  +---------------+  |
|  | TanStack Query    |  | PowerSync         |  | Event Bus     |  |
|  | Cache             |  | Engine            |  | (pub/sub      |  |
|  | (server state)    |  | (offline sync)    |  |  local)       |  |
|  +-------------------+  +-------------------+  +---------------+  |
|                                                                    |
|  +-------------------+  +-------------------+                     |
|  | Secure Storage    |  | Circuit Breaker   |                     |
|  | (tokens, secrets) |  | (edge fn calls)   |                     |
|  +-------------------+  +-------------------+                     |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
|                       SUPABASE PLATFORM                            |
|                                                                    |
|  +-------------------+  +-------------------+  +---------------+  |
|  | Auth Service      |  | PostgreSQL        |  | Realtime      |  |
|  | (JWT, OAuth,      |  | + RLS Policies    |  | (WebSocket    |  |
|  |  MFA, sessions)   |  | + Triggers        |  |  channels)    |  |
|  +-------------------+  | + Functions       |  +---------------+  |
|                          +-------------------+                     |
|  +-------------------+  +-------------------+  +---------------+  |
|  | Edge Functions    |  | Storage           |  | Cron Jobs     |  |
|  | (Deno serverless) |  | (S3-compatible)   |  | (pg_cron)     |  |
|  +-------------------+  +-------------------+  +---------------+  |
|                                                                    |
|  +-------------------+  +-------------------+                     |
|  | Rate Limiter      |  | Logging           |                     |
|  | (built-in)        |  | (platform logs)   |                     |
|  +-------------------+  +-------------------+                     |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
|                    SERVICIOS EXTERNOS                              |
|                                                                    |
|  +-------------------+  +-------------------+  +---------------+  |
|  | Google OAuth      |  | Apple OAuth       |  | FCM / APNs   |  |
|  | (login social)    |  | (login social)    |  | (push notif)  |  |
|  +-------------------+  +-------------------+  +---------------+  |
|                                                                    |
|  +-------------------+  +-------------------+                     |
|  | Email Service     |  | PowerSync         |                     |
|  | (Supabase SMTP /  |  | Service           |                     |
|  |  Resend)          |  | (sync backend)    |                     |
|  +-------------------+  +-------------------+                     |
+------------------------------------------------------------------+
```

---

## Detalle de Componentes Lógicos

### 1. PowerSync Engine (Cliente)
**Tipo**: Sync Engine / Local Database
**Responsabilidad**: Mantener réplica local de datos del hogar, sincronizar bidireccionalmente con Supabase.

| Aspecto | Configuración |
|---------|--------------|
| Storage local | SQLite (mobile via expo-sqlite), IndexedDB (web) |
| Sync protocol | PowerSync HTTP stream protocol |
| Conflict strategy | Merge automático + manual para conflictos |
| Initial sync | Download completo de datos del hogar activo |
| Incremental sync | Solo deltas desde último checkpoint |
| Schema | Definido en shared/modules/sync/schema.ts |

---

### 2. TanStack Query Cache (Cliente)
**Tipo**: Server State Cache
**Responsabilidad**: Cachear resultados de queries, deduplicar requests, invalidar datos stale.

| Aspecto | Configuración |
|---------|--------------|
| Default staleTime | 30 segundos |
| Default cacheTime | 5 minutos |
| Retry | 3 intentos, exponential backoff |
| Refetch on focus | true (web), false (mobile) |
| Refetch on reconnect | true |
| Persistence | No (PowerSync es la fuente local) |

**Nota**: TanStack Query se usa como capa sobre PowerSync para queries reactivas y mutations con optimistic updates. PowerSync es la fuente de verdad local.

---

### 3. Connection Monitor (Cliente)
**Tipo**: Utility / Observer
**Responsabilidad**: Detectar estado de conexión, notificar a componentes, trigger sync on reconnect.

| Aspecto | Implementación |
|---------|---------------|
| Detección | `navigator.onLine` (web) + NetInfo (mobile) |
| Polling fallback | Ping a health endpoint cada 30s si estado ambiguo |
| Eventos emitidos | `connection.online`, `connection.offline` |
| Consumers | PowerSync, UI (badge), NotificationService |

---

### 4. Secure Storage (Cliente)
**Tipo**: Encrypted Key-Value Store
**Responsabilidad**: Almacenar tokens y secrets de forma segura.

| Plataforma | Implementación |
|-----------|---------------|
| iOS | expo-secure-store (Keychain) |
| Android | expo-secure-store (Keystore) |
| Web | httpOnly cookies (session), localStorage (non-sensitive prefs) |

**Datos almacenados**:
- Access token (JWT)
- Refresh token
- Device push token
- Active home ID
- User preferences (non-sensitive)

---

### 5. Event Bus (Cliente)
**Tipo**: Pub/Sub local
**Responsabilidad**: Comunicación desacoplada entre módulos del cliente.

| Aspecto | Implementación |
|---------|---------------|
| Librería | mitt (1KB, TypeScript) o custom EventEmitter |
| Tipado | Eventos tipados con TypeScript discriminated unions |
| Scope | Singleton por app instance |
| Persistencia | No (eventos son efímeros) |
| Cleanup | Auto-unsubscribe via hook useEffect cleanup |

---

### 6. Circuit Breaker (Cliente)
**Tipo**: Resilience Pattern
**Responsabilidad**: Proteger contra Edge Functions que fallan repetidamente.

| Aspecto | Configuración |
|---------|--------------|
| Threshold | 3 fallos consecutivos → OPEN |
| Recovery timeout | 60 segundos → HALF-OPEN |
| Half-open behavior | 1 intento de prueba, si éxito → CLOSED |
| Aplica a | Edge Functions no-críticas (email, push) |
| NO aplica a | Auth, PowerSync sync, queries de datos |

---

### 7. Auth Guard (Cliente)
**Tipo**: Route Protection Middleware
**Responsabilidad**: Proteger rutas que requieren autenticación y/o verificación de email.

| Guard | Condición | Redirect |
|-------|-----------|----------|
| AuthGuard | Sesión válida | → /auth/login |
| EmailVerifiedGuard | email_verified == true | → /auth/verify-email |
| HomeGuard | Pertenece a al menos 1 hogar | → /home/create |
| AdminGuard | Rol admin u owner en hogar activo | → /dashboard (con toast error) |

---

### 8. Error Boundary (Cliente)
**Tipo**: Error Recovery Pattern
**Responsabilidad**: Capturar errores no manejados, loguear, mostrar UI de fallback.

| Nivel | Scope | Fallback UI |
|-------|-------|-------------|
| App | Toda la app | "Algo salió mal. Recargar aplicación" + botón reload |
| Route | Por ruta/feature | "Error en esta sección. Volver al inicio" |
| Component | Widget individual | Placeholder con "No se pudo cargar" |

---

### 9. RLS Policies (Servidor)
**Tipo**: Database-level Access Control
**Responsabilidad**: Aislar datos por hogar, no permitir acceso cross-tenant.

**Policies base para U1**:

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | Propios datos | Trigger automático | Solo propios | No permitido |
| homes | Miembro del hogar | Email verificado + < 5 hogares | Owner/Admin | Owner only (soft) |
| home_members | Miembro del hogar | Via invitación (trigger) | Owner/Admin | Owner/Admin |
| invitations | Admin/Owner del hogar | Admin/Owner | No (inmutables) | Admin/Owner (revoke) |
| user_devices | Propios dispositivos | Propios | Propios | Propios |
| app_notifications | Propias notificaciones | Sistema (trigger) | Propias (mark read) | No permitido |
| activity_entries | Miembro del hogar | Sistema (trigger) | No | No |
| notification_prefs | Propias | Propias | Propias | No |

---

### 10. Database Triggers (Servidor)
**Tipo**: Reactive Logic
**Responsabilidad**: Ejecutar lógica automática en respuesta a cambios en datos.

| Trigger | Tabla | Evento | Acción |
|---------|-------|--------|--------|
| `create_profile_on_signup` | auth.users | AFTER INSERT | Crear registro en profiles |
| `create_default_prefs` | home_members | AFTER INSERT | Crear preferencias de notificación default |
| `log_member_activity` | home_members | AFTER INSERT/DELETE | Crear entry en activity_entries |
| `cascade_home_soft_delete` | homes | AFTER UPDATE (is_active→false) | Notificar miembros |
| `cleanup_expired_invitations` | invitations | CRON (diario) | Marcar expiradas |
| `hard_delete_old_homes` | homes | CRON (diario) | Eliminar hogares con deleted_at > 30 días |

---

### 11. Cron Jobs (Servidor)
**Tipo**: Scheduled Tasks
**Responsabilidad**: Ejecutar tareas periódicas de limpieza y verificación.

| Job | Frecuencia | Acción |
|-----|-----------|--------|
| cleanup_expired_invitations | Cada hora | Limpiar invitaciones expiradas sin aceptar |
| hard_delete_old_homes | Diario (3am) | Eliminar datos de hogares soft-deleted > 30 días |
| deactivate_stale_devices | Semanal | Marcar devices sin actividad > 90 días como inactive |

---

## Resiliencia por Componente Externo

| Servicio Externo | Si falla... | Estrategia |
|-----------------|-------------|------------|
| Supabase Auth | No se puede login/register nuevos | Sesión existente funciona offline |
| Supabase DB | No sync | PowerSync local funciona, queue writes |
| Supabase Realtime | No updates en vivo | Polling fallback via PowerSync periodic sync |
| PowerSync Service | No sync | Local DB sigue funcionando, retry on reconnect |
| Google/Apple OAuth | No login social | Login con email/password sigue disponible |
| FCM/APNs | No push notifications | In-app notifications siguen funcionando |
| Email Service | No emails | UI muestra "email no enviado, reintentar" |
