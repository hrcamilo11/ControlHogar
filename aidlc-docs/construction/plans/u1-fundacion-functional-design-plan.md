# Plan de Functional Design — U1: Fundación

## Plan de Ejecución

### Fase 1: Modelo de Dominio
- [x] Definir entidades principales (User, Home, Member, Invitation)
- [x] Definir relaciones y cardinalidades
- [x] Especificar atributos de cada entidad

### Fase 2: Reglas de Negocio
- [x] Reglas de autenticación y sesiones
- [x] Reglas de gestión de hogares y membresías
- [x] Reglas de invitaciones y roles
- [x] Reglas de permisos (RBAC)

### Fase 3: Lógica de Negocio
- [x] Flujos de autenticación (registro, login, OAuth, MFA)
- [x] Flujos de gestión de hogares (crear, invitar, aceptar invitación)
- [x] Lógica de PowerSync (inicialización, conexión, schema base)
- [x] Lógica de notificaciones base (registro device, feed de actividad)

### Fase 4: Componentes Frontend
- [x] Jerarquía de componentes UI (web + mobile)
- [x] Definir pantallas y navegación
- [x] Flujos de interacción del usuario

---

## Preguntas de Diseño Funcional

Por favor responda cada pregunta colocando la letra después de `[Answer]:`.

### Pregunta 1: Proveedores de Login Social
¿Qué proveedores de login social deben soportarse en el MVP?

A) Solo Google

B) Google + Apple (requerido por Apple para apps en App Store)

C) Google + Apple + Facebook

D) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: B

### Pregunta 2: Límites de Hogares y Miembros
¿Cuántos hogares y miembros debe permitir el sistema?

A) Máximo 3 hogares por usuario, máximo 10 miembros por hogar

B) Máximo 5 hogares por usuario, máximo 20 miembros por hogar

C) Sin límite de hogares, máximo 10 miembros por hogar

D) Sin límites (dejarlo sin restricción por ahora)

E) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: B

### Pregunta 3: Expiración de Invitaciones
¿Cuánto tiempo deben ser válidas las invitaciones?

A) 24 horas — seguridad alta, el admin puede regenerar si expira

B) 7 días — balance entre seguridad y conveniencia

C) 30 días — máxima conveniencia

D) Sin expiración — válida hasta que el admin la revoque manualmente

E) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: A

### Pregunta 4: Política de Eliminación de Hogar
¿Qué sucede cuando un admin elimina un hogar?

A) Soft delete — se marca como inactivo pero los datos se conservan 30 días por si se quiere recuperar

B) Hard delete inmediato — se eliminan todos los datos del hogar irreversiblemente

C) Solo el último admin puede eliminar, y requiere confirmación con contraseña

D) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: A

### Pregunta 5: Transferencia de Administración
¿Puede haber más de un administrador por hogar?

A) Un solo admin — si quiere salir, debe transferir el rol a otro miembro primero

B) Múltiples admins — cualquier admin puede gestionar el hogar

C) Un admin principal + admins secundarios (pueden gestionar miembros pero no eliminar el hogar)

D) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: C

### Pregunta 6: Verificación de Email
¿Es obligatoria la verificación de email antes de usar la app?

A) Sí — debe verificar email antes de poder crear/unirse a un hogar

B) No — puede usar la app inmediatamente, pero se recuerda verificar periódicamente

C) Parcial — puede usar la app pero con funcionalidades limitadas hasta verificar (ej: no puede invitar a otros)

D) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: A

---

## Artefactos a Generar
- `aidlc-docs/construction/u1-fundacion/functional-design/domain-entities.md`
- `aidlc-docs/construction/u1-fundacion/functional-design/business-rules.md`
- `aidlc-docs/construction/u1-fundacion/functional-design/business-logic-model.md`
- `aidlc-docs/construction/u1-fundacion/functional-design/frontend-components.md`
