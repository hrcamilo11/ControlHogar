# Preguntas de Resiliencia y Operaciones

Dado que habilitó las extensiones de Seguridad y Resiliencia, necesito algunas decisiones adicionales para completar los requerimientos. Por favor responda cada pregunta colocando la letra después de `[Answer]:`.

---

## Pregunta 1: Objetivos de RTO/RPO y Estrategia de Recuperación ante Desastres
¿Cuáles son sus objetivos de Tiempo de Recuperación (RTO) y Punto de Recuperación (RPO)? Estos determinan la estrategia apropiada de Recuperación ante Desastres y el nivel de redundancia de infraestructura.

A) RPO/RTO: Horas — Estrategia de Backup & Restore. Costo más bajo ($). Datos respaldados, sin servicios desplegados. Redespliegue desde IaC y restauración de backups en caso de falla. Adecuado para cargas de trabajo no críticas.

B) RPO/RTO: Decenas de minutos — Estrategia Pilot Light. Costo: $$. Datos en vivo, servicios inactivos. Infraestructura desplegada pero no ejecutándose, se escala en failover. Adecuado para cargas de trabajo importantes.

C) RPO/RTO: Minutos — Estrategia Warm Standby. Costo: $$$. Datos en vivo, servicios a capacidad reducida. Se escalan durante failover. Adecuado para aplicaciones críticas de negocio.

D) RPO/RTO: Casi tiempo real — Estrategia Multi-site Active/Active. Costo más alto ($$$$). Datos en vivo, servicios activos en múltiples regiones simultáneamente. Adecuado para requisitos de cero tiempo de inactividad.

E) N/A — Despliegue en una sola región es aceptable, no se necesita DR entre regiones. Se confía en disponibilidad multi-zona dentro de una región.

F) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: E

## Pregunta 2: Proceso de Gestión de Cambios
¿Cómo deben gobernarse los cambios en producción para esta carga de trabajo?

A) Usar nuestro proceso organizacional existente de gestión de cambios — indicar nombre/herramienta (ej: ServiceNow, Jira Change, CAB interno)

B) No existe un proceso formal aún — AI-DLC debe proponer un proceso ligero de gestión de cambios (registro de cambio + aprobación + nota de rollback)

C) N/A — esta carga de trabajo está exenta de gestión de cambios formal (ej: herramientas internas). Se documentará la justificación de la exención.

D) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: B

## Pregunta 3: Herramientas de CI/CD y Despliegue
¿Qué herramientas de CI/CD y proceso de despliegue debe usar esta carga de trabajo?

A) Usar nuestro pipeline CI/CD existente — indicar la herramienta (ej: GitHub Actions, GitLab CI, Jenkins, CodePipeline)

B) No existe pipeline — AI-DLC debe proponer una definición de pipeline CI/CD apropiada al runtime y stack elegido

C) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: B

## Pregunta 4: Mecanismo de Rollback
¿Cómo debe revertirse un despliegue fallido en producción?

A) Redesplegar la versión anterior de IaC/artefacto (rollback con versión fija)

B) Swap Blue/Green de vuelta al entorno anterior

C) Auto-rollback Canary basado en regresión de métricas/salud

D) Rollback con awareness de base de datos (reversión de migración de esquema/datos) — señalar para diseño explícito

E) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: D

## Pregunta 5: Estilo de Despliegue
¿Qué estrategia de despliegue es aceptable para el perfil de riesgo de esta carga de trabajo?

A) Directo / in-place (menor costo, mayor radio de impacto) — aceptable para cargas no críticas

B) Rolling (reemplazo gradual de instancias)

C) Blue/green (corte sin tiempo de inactividad, mayor costo)

D) Canary (cambio progresivo de tráfico con rollback automático)

E) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: A

## Pregunta 6: Topología Regional
¿Esta carga de trabajo requiere despliegue multi-región, o es suficiente una sola región con redundancia multi-zona?

A) Una sola región, multi-zona — tolera falla de zona, no falla de región completa. Menor costo.

B) Multi-región activo-pasivo — sobrevive falla de región con failover. Mayor costo.

C) Multi-región activo-activo — sobrevive falla de región sin tiempo de inactividad. Costo más alto.

D) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: A

## Pregunta 7: Proceso de Respuesta a Incidentes
¿Cómo se manejan los incidentes de producción para esta carga de trabajo?

A) Usar nuestro proceso existente de respuesta a incidentes — indicar referencia (ej: PagerDuty, proceso IR/on-call interno)

B) No existe un proceso formal — AI-DLC debe proponer un proceso ligero de respuesta a incidentes y Corrección de Errores (COE)

C) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: B

## Pregunta 8: Enfoque de Testing de Resiliencia
¿Cómo se validarán los mecanismos de resiliencia (failover, recuperación)?

A) Usar nuestra práctica existente de DR testing / game day / chaos engineering — indicar la referencia

B) No existe práctica — AI-DLC debe proponer un plan de testing de DR y experimentos de caos

C) Diferir a la fase de Operaciones — capturar escenarios de prueba ahora, ejecutar durante Operaciones

D) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: C
