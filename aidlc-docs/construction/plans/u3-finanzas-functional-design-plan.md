# Plan de Functional Design — U3: Finanzas del Hogar

## Plan de Ejecución

- [ ] Definir entidades (Expense, RecurringPayment, Settlement, Budget, ShoppingItem)
- [ ] Definir reglas de negocio (cálculo de balance, split de gastos, presupuestos)
- [ ] Definir flujos de lógica de negocio
- [ ] Generar código (migración + service + tests)

---

## Preguntas de Diseño Funcional

### Pregunta 1: Modelo de Split de Gastos
¿Cómo debe dividirse un gasto entre los miembros?

A) División equitativa automática — el gasto se divide por igual entre todos los miembros del hogar (excluyendo guests)

B) División personalizable — al crear un gasto, el usuario elige entre quiénes se divide y en qué proporción (equitativa, por porcentaje, o montos fijos)

C) División por participantes — al crear un gasto, el usuario marca quiénes participaron y se divide equitativamente solo entre ellos

D) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: B

---

## Artefactos a Generar
- `aidlc-docs/construction/u3-finanzas/functional-design/` (docs)
- `packages/supabase/supabase/migrations/20260810000006_finance_schema.sql`
- `packages/shared/src/modules/finance/` (service + types + tests)
