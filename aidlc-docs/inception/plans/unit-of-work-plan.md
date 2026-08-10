# Plan de Unidades de Trabajo — ControlHogar

## Plan de Ejecución

### Fase 1: Definición de Unidades
- [x] Definir unidades de trabajo basadas en módulos y dependencias
- [x] Establecer el orden de implementación respetando dependencias
- [x] Documentar el alcance de cada unidad

### Fase 2: Mapeo de Stories a Unidades
- [x] Asignar cada user story a su unidad correspondiente
- [x] Verificar cobertura completa (ninguna story sin unidad)
- [x] Identificar stories transversales y cómo se distribuyen

### Fase 3: Dependencias entre Unidades
- [x] Documentar la matriz de dependencias
- [x] Definir interfaces/contratos entre unidades
- [x] Identificar puntos de integración

### Fase 4: Validación
- [x] Validar que las unidades son implementables independientemente (en orden)
- [x] Verificar que cada unidad tiene un entregable testeable
- [x] Confirmar que el orden permite demos incrementales

---

## Preguntas de Descomposición

Por favor responda cada pregunta colocando la letra después de `[Answer]:`.

### Pregunta 1: Estrategia de Descomposición
¿Cómo prefiere que se dividan las unidades de trabajo?

A) Por módulo funcional — una unidad por módulo (Auth, Homes, Tasks, Finance, Maintenance, Sync, Notifications). 7 unidades con implementación secuencial según dependencias.

B) Por épica/prioridad — una unidad por prioridad MVP (Unidad 1: Auth+Homes, Unidad 2: Tasks, Unidad 3: Finance, Unidad 4: Maintenance). 4 unidades más grandes con entregables incrementales completos.

C) Por capa — una unidad para DB/Backend, una para Shared/Services, una para Web, una para Mobile. 4 unidades técnicas que se integran al final.

D) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: B

### Pregunta 2: Alcance de la Unidad Base (Auth + Homes)
¿Qué debería incluir la primera unidad de trabajo (fundación)?

A) Solo autenticación y gestión de hogares básica (login, registro, crear hogar, invitar) — mínimo para que las demás unidades funcionen

B) Autenticación + hogares + infraestructura transversal completa (PowerSync config, notificaciones base, CI/CD, estructura del monorepo) — setup completo del proyecto

C) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: B

### Pregunta 3: Tratamiento del Modo Offline
¿Cómo debe integrarse la funcionalidad offline en las unidades?

A) Como parte de cada unidad funcional — cada módulo (Tasks, Finance, Maintenance) incluye su implementación offline desde el inicio

B) Como unidad separada final — primero se implementan los módulos solo-online, luego una unidad dedicada agrega offline a todo

C) Híbrido — la configuración base de PowerSync va en la primera unidad (fundación), y cada módulo implementa su sync específica como parte de su propia unidad

D) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: C

### Pregunta 4: Implementación de Plataformas (Web vs Mobile)
¿Cómo debe tratarse la implementación multiplataforma?

A) Web primero para todas las unidades, luego una unidad final que agrega la app mobile

B) Ambas plataformas simultáneamente en cada unidad — cada unidad entrega web + mobile

C) Shared + Web para todas las unidades, Mobile en paralelo como unidad independiente que consume Shared

D) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: B

---

## Artefactos a Generar
- `aidlc-docs/inception/application-design/unit-of-work.md`
- `aidlc-docs/inception/application-design/unit-of-work-dependency.md`
- `aidlc-docs/inception/application-design/unit-of-work-story-map.md`
