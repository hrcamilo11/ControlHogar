# Plan de Generación de User Stories — ControlHogar

## Metodología y Enfoque

Este plan define cómo se crearán las user stories para ControlHogar, una aplicación de gestión doméstica colaborativa.

---

## Plan de Ejecución

### Fase 1: Definición de Personas
- [x] Identificar y documentar personas principales basadas en los roles definidos
- [x] Definir características, motivaciones y frustraciones de cada persona
- [x] Mapear el contexto de uso de cada persona (dispositivo, frecuencia, momentos de uso)

### Fase 2: Generación de User Stories por Módulo
- [x] Crear épicas principales por módulo funcional
- [x] Generar stories de Gestión de Tareas del Hogar
- [x] Generar stories de Planificador Financiero
- [x] Generar stories de Lista de Mantenimientos
- [x] Generar stories de Sistema de Usuarios y Hogares
- [x] Generar stories de Sincronización y Modo Offline
- [x] Generar stories técnicas transversales (seguridad, notificaciones)

### Fase 3: Criterios de Aceptación y Validación
- [x] Agregar criterios de aceptación a cada story (formato Given/When/Then)
- [x] Validar que stories cumplen criterios INVEST
- [x] Mapear personas a stories relevantes
- [x] Verificar cobertura completa de requerimientos funcionales

---

## Preguntas de Planificación

Por favor responda cada pregunta colocando la letra después de `[Answer]:`.

### Pregunta 1: Enfoque de Desglose de Stories
¿Cómo prefiere que se organicen las user stories?

A) Basado en Módulos/Features — Stories agrupadas por funcionalidad (Tareas, Finanzas, Mantenimiento, Usuarios)

B) Basado en Personas — Stories agrupadas por tipo de usuario (Admin, Miembro, Invitado)

C) Basado en Journeys — Stories que siguen flujos completos del usuario de principio a fin

D) Basado en Épicas — Stories jerárquicas con épicas principales y sub-stories

E) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: A

### Pregunta 2: Granularidad de Stories
¿Qué nivel de detalle prefiere para las stories?

A) Stories grandes (épicas) — pocas stories amplias que cubran flujos completos, ideales para planificación de alto nivel

B) Stories medianas — un balance entre detalle y cantidad, cada story cubre una interacción significativa del usuario

C) Stories pequeñas (atómicas) — stories muy granulares donde cada una cubre una sola acción o pantalla, ideales para desarrollo ágil con sprints cortos

D) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: B

### Pregunta 3: Formato de Criterios de Aceptación
¿Qué formato prefiere para los criterios de aceptación?

A) Given/When/Then (formato BDD estándar — ideal para automatización de tests)

B) Lista de verificación (checklist de condiciones que deben cumplirse)

C) Escenarios descriptivos (narrativa de lo que debe ocurrir en cada caso)

D) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: A

### Pregunta 4: Priorización de Módulos para MVP
¿En qué orden de prioridad desea los módulos para el MVP?

A) Tareas del Hogar primero → Finanzas → Mantenimientos (enfocado en lo más cotidiano)

B) Usuarios/Auth primero → Tareas → Finanzas → Mantenimientos (base técnica primero)

C) Todos los módulos con funcionalidad básica simultáneamente (MVP horizontal)

D) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: B

### Pregunta 5: Flujos de Invitado
¿Qué puede hacer un usuario con rol "invitado" en el hogar?

A) Solo ver información (tareas, gastos, mantenimientos) sin poder modificar nada

B) Ver información y marcar tareas asignadas como completadas, pero no crear ni editar

C) Funcionalidad limitada — puede ver todo y participar en tareas pero no en finanzas ni mantenimiento

D) Acceso temporal completo — mismas capacidades que un miembro pero con fecha de expiración

E) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: B

### Pregunta 6: Notificaciones
¿Qué tipo de notificaciones debe soportar la aplicación?

A) Solo notificaciones push en el dispositivo (móvil y web)

B) Notificaciones push + email para eventos importantes (vencimiento de pagos, tareas atrasadas)

C) Notificaciones push + email + notificaciones in-app (badge, feed de actividad)

D) Solo notificaciones in-app (sin push ni email — enfoque minimalista)

E) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: C

### Pregunta 7: Resolución de Conflictos Offline
¿Cómo debe resolverse cuando dos usuarios editan el mismo dato sin conexión?

A) Last-write-wins automático — el último cambio sincronizado gana, sin intervención del usuario

B) Last-write-wins con notificación — gana el último pero se notifica al otro usuario del cambio

C) Resolución manual — se muestra el conflicto y el usuario elige qué versión mantener

D) Merge automático cuando es posible + resolución manual para conflictos irreconciliables

E) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: D

---

## Artefactos a Generar
- `aidlc-docs/inception/user-stories/personas.md` — Personas de usuario
- `aidlc-docs/inception/user-stories/stories.md` — User stories completas con criterios de aceptación
