# Instrucciones de Tests Unitarios — ControlHogar

## Framework y Configuración

| Herramienta | Uso |
|-------------|-----|
| Vitest | Test runner principal |
| fast-check | Property-based testing (PBT) |
| React Testing Library | Component testing (web) |
| React Native Testing Library | Component testing (mobile) |
| MSW | API mocking |

## Ejecutar Tests

```bash
# Todos los tests (todos los packages)
pnpm turbo test

# Solo shared package (services + lógica de negocio)
cd packages/shared && pnpm test

# Con watch mode (desarrollo)
cd packages/shared && pnpm test:watch

# Con coverage report
cd packages/shared && pnpm test -- --coverage

# Tests de un módulo específico
cd packages/shared && pnpm test -- --filter=task-recurrence
cd packages/shared && pnpm test -- --filter=split-calculator
```

## Tests Existentes

### packages/shared/src/modules/tasks/__tests__/task-recurrence.test.ts
- ✅ `calculateNextDueDate` — once retorna null
- ✅ `calculateNextDueDate` — daily retorna mañana
- ✅ `calculateNextDueDate` — weekly retorna próximo día
- ✅ `calculateNextDueDate` — monthly respeta day of month
- ✅ `calculateNextDueDate` — monthly clamps a último día del mes
- ✅ `calculateNextDueDate` — custom respeta intervalDays
- ✅ **PBT**: daily siempre retorna fecha posterior
- ✅ **PBT**: weekly siempre dentro de 7 días
- ✅ **PBT**: custom respeta intervalDays exacto
- ✅ **PBT**: monthly aterriza en target day o último del mes
- ✅ **PBT**: once siempre retorna null

### packages/shared/src/modules/finance/__tests__/split-calculator.test.ts
- ✅ `calculateSplits` — equal split divide correctamente
- ✅ `calculateSplits` — percentage split calcula montos
- ✅ `calculateSplits` — fixed split usa montos directos
- ✅ `calculateSplits` — payer solo retorna empty
- ✅ **PBT**: equal split suma = total * (debtors/participants)
- ✅ **PBT**: todos los montos son no-negativos
- ✅ **PBT**: payer nunca aparece en splits
- ✅ `validateSplitConfig` — valida percentages suman 100
- ✅ `validateSplitConfig` — valida fixed suman total
- ✅ `validateSplitConfig` — error en participantes vacíos

## Tests Pendientes de Implementar

### Prioridad Alta (Servicios core)
- [ ] `auth.service.test.ts` — signUp, signIn, signOut, OAuth, MFA (mock Supabase client)
- [ ] `homes.service.test.ts` — CRUD homes, miembros, invitaciones
- [ ] `tasks.service.test.ts` — CRUD tasks, completeTask con rotación
- [ ] `expenses.service.test.ts` — createExpense con auto-split
- [ ] `balance.service.test.ts` — cálculo de balance con settlements

### Prioridad Media (PBT adicional)
- [ ] PBT: invitation token siempre tiene 64 chars
- [ ] PBT: home nunca excede 20 miembros (invariante)
- [ ] PBT: balance neto del hogar siempre suma 0 (invariante)
- [ ] PBT: rotation_index siempre en rango [0, members.length-1]

### Prioridad Baja (Componentes UI)
- [ ] Component tests para pantallas de auth (render, submit, validación)
- [ ] Component tests para TaskCard, TaskForm
- [ ] Component tests para ExpenseForm, BalanceView

## Convenciones de Testing

### Nombrado de archivos
- `__tests__/nombre.test.ts` — Tests unitarios
- `__tests__/nombre.integration.test.ts` — Tests de integración
- `__tests__/nombre.pbt.test.ts` — Tests PBT (si se separan)

### Estructura de un test
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'

describe('ServiceName', () => {
  describe('methodName', () => {
    it('should do X when Y', () => {
      // Arrange → Act → Assert
    })

    // PBT section
    describe('PBT: invariants', () => {
      it('property description', () => {
        fc.assert(fc.property(/* generators */, (input) => {
          // Assert property holds
        }))
      })
    })
  })
})
```

### Mocking de Supabase
```typescript
import { vi } from 'vitest'

const mockSupabase = {
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: mockSession } }),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  }),
}
```

## Coverage Targets

| Package | Target | Métrica |
|---------|--------|---------|
| shared | 80% | Statements, Branches, Functions, Lines |
| web | 60% | Statements (UI es más difícil de cubrir) |
| mobile | 50% | Statements (similar a web) |

## Seed para PBT Reproducibilidad

En CI, se loguea el seed de fast-check en cada ejecución:
```typescript
// vitest.setup.ts
import { configureGlobal } from 'fast-check'
const seed = process.env.FC_SEED ? parseInt(process.env.FC_SEED) : undefined
configureGlobal({ seed, verbose: true })
console.log(`fast-check seed: ${seed ?? 'random'}`)
```

Para reproducir un fallo:
```bash
FC_SEED=12345 pnpm test -- --filter=split-calculator
```
