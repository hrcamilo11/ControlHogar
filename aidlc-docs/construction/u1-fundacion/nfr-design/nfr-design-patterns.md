# Patrones de Diseño NFR — U1: Fundación

## Patrones de Resiliencia

### P-RES-01: Offline-First con Sync Engine
**Problema**: Los usuarios necesitan usar la app sin conexión a internet.
**Patrón**: CQRS local — escrituras van a DB local (PowerSync/SQLite), lecturas desde local, sync bidireccional en background.

**Implementación**:
```
[UI] → [PowerSync Local DB] → [Sync Queue]
                                     ↓ (cuando online)
                              [Supabase PostgreSQL]
                                     ↓
                              [Realtime broadcast]
                                     ↓
                              [Otros clientes sync]
```

**Configuración**:
- PowerSync connected mode: sync continuo mientras online
- PowerSync disconnected mode: queue local, sync on reconnect
- Conflict resolution: merge automático (campos no-conflictivos) + manual (conflictos irreconciliables)

---

### P-RES-02: Retry con Exponential Backoff
**Problema**: Las llamadas de red pueden fallar temporalmente.
**Patrón**: Retry automático con backoff exponencial para operaciones idempotentes.

**Implementación**:
- TanStack Query retry config: `retry: 3, retryDelay: attempt => Math.min(1000 * 2^attempt, 30000)`
- Solo para queries (GET) — mutations no hacen retry automático
- Edge Functions: timeout 10s, no retry (PowerSync re-syncs automáticamente)

---

### P-RES-03: Graceful Degradation
**Problema**: Si un servicio secundario falla, la app no debe colapsar.
**Patrón**: Degradación por capas — funcionalidad core continúa, features secundarios se deshabilitan.

**Niveles de degradación**:
| Estado | Funcionalidad disponible |
|--------|------------------------|
| Full online | Todo funcional, realtime activo |
| Degraded (Realtime caído) | CRUD funciona, no updates en vivo, refresh manual |
| Offline | Read/write local, no sync, no push, no invitaciones |
| Auth service down | Solo si ya tiene sesión válida: funciona offline mode |

---

### P-RES-04: Circuit Breaker para Edge Functions
**Problema**: Si una Edge Function está fallando repetidamente, no saturar con reintentos.
**Patrón**: Circuit breaker simple — tras N fallos consecutivos, dejar de intentar por un período.

**Implementación (en cliente)**:
```typescript
// Parámetros
const FAILURE_THRESHOLD = 3   // fallos consecutivos para abrir circuito
const RECOVERY_TIMEOUT = 60000 // 60s antes de intentar de nuevo (half-open)

// Para funciones no-críticas (emails, push)
// Si el circuito está abierto: skip silenciosamente, loguear
// PowerSync sync NO usa circuit breaker (es crítico)
```

---

## Patrones de Seguridad

### P-SEC-01: Defense in Depth
**Problema**: No confiar en una sola capa de seguridad.
**Patrón**: Múltiples capas independientes de protección.

**Capas implementadas**:
```
Capa 1: [Supabase Auth] — JWT validation, session management
Capa 2: [RLS Policies] — Row-level isolation en PostgreSQL
Capa 3: [Application RBAC] — Role checks en servicios
Capa 4: [Input Validation] — Zod schemas en cliente Y servidor
Capa 5: [HTTP Headers] — CSP, HSTS, etc.
```

---

### P-SEC-02: Principle of Least Privilege (RLS)
**Problema**: Un usuario no debe acceder a datos de hogares ajenos.
**Patrón**: Row Level Security con policies basadas en membresía.

**Implementación base**:
```sql
-- Patrón RLS para todas las tablas con home_id
CREATE POLICY "Users can only access their homes data"
ON {table_name}
FOR ALL
USING (
  home_id IN (
    SELECT home_id FROM home_members
    WHERE user_id = auth.uid()
  )
);
```

**Variaciones por rol**:
- SELECT: todos los miembros del hogar (incluyendo guest)
- INSERT/UPDATE: member, admin, owner (no guest excepto task completions)
- DELETE: admin y owner solamente

---

### P-SEC-03: Token Security
**Problema**: Los tokens de invitación y sesión deben ser seguros contra ataques.
**Patrón**: Tokens criptográficamente seguros + validación server-side.

**Implementación**:
- Invitation tokens: `nanoid(64)` — 64 chars de entropy (384 bits)
- Session tokens: JWT firmado con HS256 por Supabase (secret server-side)
- Storage: `expo-secure-store` (mobile), httpOnly cookies (web)
- Validación: siempre server-side (nunca confiar en client-side)

---

### P-SEC-04: Rate Limiting
**Problema**: Prevenir abuse en endpoints públicos.
**Patrón**: Rate limiting por IP y por usuario.

**Implementación**:
- Supabase Auth: rate limiting built-in (configurable)
- Edge Functions: Supabase platform rate limiting
- Login: 5 intentos / 15 min por email (application-level)
- Invitaciones: 10 por hora por admin (application-level)
- API general: 100 req/min por usuario (Supabase default)

---

## Patrones de Rendimiento

### P-PERF-01: Optimistic Updates
**Problema**: Las escrituras no deben sentirse lentas por esperar al servidor.
**Patrón**: Actualizar UI inmediatamente con el resultado esperado, revertir si falla.

**Implementación**:
- PowerSync: write local es instantáneo, sync en background
- TanStack Query: `onMutate` para optimistic update, `onError` para rollback
- UI feedback: no spinner para writes normales, solo para operaciones complejas

---

### P-PERF-02: Query Caching y Deduplication
**Problema**: No hacer queries redundantes al servidor.
**Patrón**: Cache inteligente con invalidación selectiva.

**Implementación**:
- TanStack Query: `staleTime: 5min` para datos que cambian poco (perfil, preferencias)
- TanStack Query: `staleTime: 30s` para datos que cambian frecuentemente (tareas, actividad)
- PowerSync: cache local es la fuente primaria, query contra local DB
- Deduplication: TanStack Query deduplica queries idénticas automáticamente

---

### P-PERF-03: Lazy Loading y Code Splitting
**Problema**: No cargar código de features no visitados.
**Patrón**: Code splitting por ruta + lazy import de módulos pesados.

**Implementación**:
```typescript
// Web: React.lazy + Suspense por ruta
const TasksModule = lazy(() => import('./features/tasks'))
const FinanceModule = lazy(() => import('./features/finance'))

// Mobile: Expo Router hace code splitting automático por file
```

---

### P-PERF-04: Debounce y Throttle
**Problema**: Evitar operaciones excesivas en inputs frecuentes.
**Patrón**: Debounce para búsquedas, throttle para scroll/resize.

**Implementación**:
- Búsqueda/filtros: debounce 300ms
- Scroll (infinite loading): throttle 200ms
- Resize (responsive): throttle 100ms
- Sync status polling: interval 5s (solo como fallback de realtime)

---

## Patrones de Observabilidad

### P-OBS-01: Structured Logging
**Problema**: Logs no estructurados son difíciles de buscar y alertar.
**Patrón**: Logging en formato JSON con campos estandarizados.

**Implementación (Edge Functions)**:
```typescript
interface LogEntry {
  timestamp: string       // ISO 8601
  level: 'error' | 'warn' | 'info' | 'debug'
  correlation_id: string  // Request ID
  user_id?: string        // Del JWT
  home_id?: string        // Si aplica
  action: string          // Ej: 'invitation.created'
  message: string
  metadata?: Record<string, unknown>  // Datos extra (sin PII)
}
```

---

### P-OBS-02: Error Boundary Pattern
**Problema**: Errores no capturados crashean toda la app.
**Patrón**: Error boundaries jerárquicos que capturan, loguean y muestran fallback.

**Implementación**:
```
AppErrorBoundary (nivel app — muestra "algo salió mal, recargar")
├── RouteErrorBoundary (por ruta — muestra "error en esta sección")
│   ├── ComponentErrorBoundary (por widget — muestra placeholder)
```

---

### P-OBS-03: Health Check Pattern
**Problema**: Necesito saber si el sistema está funcionando.
**Patrón**: Endpoint de health check con verificación de dependencias.

**Implementación (Edge Function `/health`)**:
```json
{
  "status": "healthy",
  "timestamp": "2026-08-10T00:00:00Z",
  "checks": {
    "database": "ok",
    "auth": "ok",
    "realtime": "ok"
  }
}
```
