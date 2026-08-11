# Reglas de Negocio — U3: Finanzas del Hogar

## BR-FIN: Reglas de Gastos

### BR-FIN-01: Creación de Gastos
- Solo owner, admin y member pueden crear gastos (guest NO)
- Campos obligatorios: monto (> 0), categoría, pagado_por
- Campos opcionales: descripción, foto recibo, participantes
- Si no se especifican participantes: se divide entre todos los miembros activos (excluyendo guests)

### BR-FIN-02: Split de Gastos (Personalizable)
Tres modos de división:
- **Equitativo**: monto / número_de_participantes (cada uno debe lo mismo)
- **Porcentaje**: cada participante tiene un % asignado (deben sumar 100%)
- **Montos fijos**: cada participante tiene un monto específico (deben sumar el total)

El pagador NO se incluye como deudor (él ya pagó). Su "parte" es lo que no le deben.

### BR-FIN-03: Cálculo de Balance
- Balance = Σ(lo que otros me deben) - Σ(lo que debo a otros)
- Se calcula en tiempo real como vista materializada o query
- Al crear un gasto: cada participante (excepto pagador) acumula deuda con el pagador
- Al hacer un settlement: se reduce la deuda entre dos miembros

### BR-FIN-04: Settlements (Saldar Deudas)
- Cualquier miembro puede registrar que "pagó" a otro miembro
- Requiere confirmación del receptor (o el admin puede forzar)
- Al confirmar, se reduce el balance entre ambos por el monto indicado
- No puede saldar más de lo que se debe

### BR-FIN-05: Pagos Recurrentes
- Solo owner, admin y member pueden crear pagos recurrentes
- Campos: nombre, monto, frecuencia (mensual/bimestral/anual), día de vencimiento, responsable(s)
- X días antes del vencimiento: notificación push + email
- Al marcar como pagado: se crea un gasto asociado automáticamente con el split configurado

### BR-FIN-06: Presupuestos
- Solo owner y admin pueden definir presupuestos
- Se define por categoría y mes (ej: "Alimentación - Agosto 2026 - $500.000")
- Al registrar un gasto en una categoría, se verifica contra el presupuesto:
  - >= 80%: alerta amarilla (notificación in-app)
  - >= 100%: alerta roja (notificación push + in-app)
- Historial mensual de cumplimiento de presupuesto

### BR-FIN-07: Lista de Compras
- Cualquier miembro puede agregar/eliminar items
- Al marcar como "comprado", opcionalmente se crea un gasto asociado
- La lista es compartida y se sincroniza en tiempo real
- Items marcados como comprados se mueven a sección "comprados" (no desaparecen inmediatamente)

### BR-FIN-08: Categorías de Gastos
Categorías predefinidas (el usuario puede crear personalizadas):
- Alimentación, Servicios, Arriendo/Hipoteca, Transporte, Entretenimiento, Salud, Educación, Hogar, Otro

## Permisos por Rol

| Acción | owner | admin | member | guest |
|--------|-------|-------|--------|-------|
| Crear gasto | ✅ | ✅ | ✅ | ❌ |
| Ver gastos | ✅ | ✅ | ✅ | ❌ |
| Editar gasto propio | ✅ | ✅ | ✅ | ❌ |
| Eliminar gasto | ✅ | ✅ | solo propios | ❌ |
| Ver balance | ✅ | ✅ | ✅ | ❌ |
| Registrar settlement | ✅ | ✅ | ✅ | ❌ |
| Crear pago recurrente | ✅ | ✅ | ✅ | ❌ |
| Definir presupuesto | ✅ | ✅ | ❌ | ❌ |
| Lista de compras | ✅ | ✅ | ✅ | ❌ |
