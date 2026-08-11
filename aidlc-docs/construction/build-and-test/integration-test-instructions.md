# Instrucciones de Tests de Integración — ControlHogar

## Estrategia de Testing de Integración

Los tests de integración verifican que los componentes funcionan correctamente juntos:
- Services → Supabase (DB real local)
- RLS Policies → queries con diferentes roles
- Triggers → efectos secundarios en DB
- PowerSync → sync de datos locales ↔ remotos

## Prerequisitos

```bash
# Docker corriendo (para Supabase local)
docker --version

# Supabase CLI
supabase --version

# Iniciar Supabase local
cd packages/supabase && supabase start
```

## Tests de Integración de Base de Datos

### Qué probar
1. **RLS Policies**: Verificar que cada rol solo accede a lo permitido
2. **Triggers**: Verificar que los efectos secundarios se ejecutan
3. **Constraints**: Verificar que los límites (5 homes, 20 members) se enforzan
4. **Migrations**: Verificar que up + down migrations son reversibles

### Ejecutar
```bash
cd packages/supabase

# Reset y aplicar migraciones
supabase db reset

# Ejecutar tests de DB (via pgTAP o SQL scripts)
supabase test db
```

### Escenarios de RLS a Verificar

| Escenario | Expected |
|-----------|----------|
| Owner ve su hogar | ✅ Acceso |
| Member ve su hogar | ✅ Acceso |
| Guest ve tareas del hogar | ✅ Acceso |
| Guest ve finanzas del hogar | ❌ Denegado |
| Usuario ve hogar ajeno | ❌ Denegado |
| Member crea tarea | ✅ Acceso |
| Guest crea tarea | ❌ Denegado |
| Admin elimina miembro | ✅ Acceso |
| Member elimina otro miembro | ❌ Denegado |
| User crea 6to hogar | ❌ Error (límite 5) |
| Admin invita al 21vo miembro | ❌ Error (límite 20) |

### Escenarios de Triggers a Verificar

| Trigger | Verificar |
|---------|-----------|
| on_auth_user_created | Profile creado automáticamente |
| on_home_created | Owner membership creada |
| on_member_joined | Preferences creadas + activity logged |
| on_task_completed | Activity entry creada |
| on_expense_created | Activity entry creada |
| on_maintenance_status_change | Activity entry creada |
| check_home_member_limit | Error al exceder 20 |
| check_user_home_limit | Error al exceder 5 |

## Tests de Integración de Services

### Qué probar
- Services operan correctamente contra Supabase local
- Flujos completos end-to-end (register → create home → invite → accept → create task → complete)

### Setup para tests de integración
```typescript
// test-utils/setup-integration.ts
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'http://localhost:54321'
const SERVICE_ROLE_KEY = '<service-role-key>'

export function createTestClient(userId?: string) {
  // Crear cliente con JWT de test user
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false },
    global: { headers: userId ? { Authorization: `Bearer ${createTestJWT(userId)}` } : {} }
  })
}
```

### Flujos de Integración a Verificar

```
Flujo 1: Onboarding completo
  register → verify email → create home → invite member → accept invitation

Flujo 2: Ciclo de tarea
  create task (recurrent, weekly) → assign member → complete task → verify next_due_date updated → verify rotation

Flujo 3: Ciclo financiero
  create expense (split 3-way) → verify splits created → check balance → create settlement → confirm → verify balance reduced

Flujo 4: Mantenimiento lifecycle
  create maintenance (high priority) → add note → add photo → change to in_progress → complete → verify history
```

## Tests E2E (Futuro)

### Web (Playwright)
```bash
cd packages/web
npx playwright test
```

**Smoke tests prioritarios:**
- Login/registro flow
- Crear hogar y invitar miembro
- Crear y completar una tarea
- Registrar un gasto y ver balance

### Mobile (Detox — Futuro)
- Deferred a cuando la app mobile esté más madura
- Mismos smoke tests que web, adaptados a UI nativa
