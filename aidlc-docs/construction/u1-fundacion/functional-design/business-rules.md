# Reglas de Negocio — U1: Fundación

## BR-AUTH: Reglas de Autenticación

### BR-AUTH-01: Registro de Usuario
- El email debe ser único en el sistema
- La contraseña debe tener mínimo 8 caracteres
- Se envía email de verificación inmediatamente tras el registro
- El usuario NO puede crear/unirse a hogares hasta verificar su email
- Login social (Google, Apple) verifica email automáticamente

### BR-AUTH-02: Verificación de Email
- El enlace de verificación expira en 24 horas
- El usuario puede solicitar reenvío del email de verificación
- Una vez verificado, el estado es permanente (no se revierte)
- El usuario puede navegar la app pero ve pantalla de "verificar email" al intentar acciones protegidas

### BR-AUTH-03: Inicio de Sesión
- Máximo 5 intentos fallidos antes de bloqueo temporal (15 minutos)
- El mensaje de error no debe revelar si el email existe o no ("Credenciales inválidas")
- La sesión expira tras 30 días de inactividad
- Login social no tiene límite de intentos (gestionado por el proveedor)

### BR-AUTH-04: MFA (Multi-Factor Authentication)
- MFA es OBLIGATORIO para usuarios con rol 'owner' o 'admin' en cualquier hogar
- MFA es OPCIONAL para usuarios con rol 'member' o 'guest'
- Método soportado: TOTP (app autenticadora como Google Authenticator)
- Si un miembro es promovido a admin, se le pide configurar MFA en el siguiente login

### BR-AUTH-05: Sesiones y Tokens
- Access token expira en 1 hora
- Refresh token expira en 30 días
- Al cerrar sesión se invalida el refresh token del dispositivo actual
- Un usuario puede tener sesiones activas en múltiples dispositivos simultáneamente

---

## BR-HOME: Reglas de Hogares

### BR-HOME-01: Creación de Hogar
- Solo usuarios con email verificado pueden crear hogares
- Un usuario puede pertenecer a máximo **5 hogares** simultáneamente
- Al crear un hogar, el creador se asigna automáticamente el rol 'owner'
- El nombre del hogar: mínimo 2, máximo 100 caracteres
- La descripción es opcional: máximo 500 caracteres

### BR-HOME-02: Límite de Miembros
- Un hogar puede tener máximo **20 miembros** (incluyendo owner, admins, members, guests)
- Si se alcanza el límite, no se pueden crear nuevas invitaciones
- Los miembros eliminados no cuentan hacia el límite

### BR-HOME-03: Soft Delete de Hogar
- Solo el 'owner' puede eliminar el hogar
- Al eliminar, se marca `is_active = false` y se registra `deleted_at`
- Los datos se conservan **30 días** tras la eliminación
- Durante los 30 días, el owner puede restaurar el hogar
- Tras 30 días, un proceso programado elimina los datos permanentemente
- Al soft-delete, todos los miembros pierden acceso inmediatamente
- Se notifica a todos los miembros que el hogar fue eliminado

### BR-HOME-04: Hogar Activo
- Un usuario tiene un "hogar activo" seleccionado a la vez
- Al abrir la app, se selecciona automáticamente el último hogar utilizado
- Si el usuario solo pertenece a un hogar, ese es siempre el activo
- Si el usuario no pertenece a ningún hogar, se muestra pantalla de "crear o unirse"

---

## BR-ROLE: Reglas de Roles y Permisos

### BR-ROLE-01: Jerarquía de Roles
Los roles tienen la siguiente jerarquía (de mayor a menor permisos):

| Rol | Descripción |
|-----|-------------|
| **owner** | Creador del hogar. Máximo 1 por hogar. Control total. |
| **admin** | Admin secundario. Gestiona miembros, no puede eliminar hogar. |
| **member** | Miembro regular. CRUD de contenido (tareas, gastos, mantenimientos). |
| **guest** | Invitado temporal. Solo ver + completar tareas asignadas. |

### BR-ROLE-02: Permisos por Rol

| Acción | owner | admin | member | guest |
|--------|-------|-------|--------|-------|
| Eliminar hogar | ✅ | ❌ | ❌ | ❌ |
| Restaurar hogar | ✅ | ❌ | ❌ | ❌ |
| Invitar miembros | ✅ | ✅ | ❌ | ❌ |
| Eliminar miembros | ✅ | ✅* | ❌ | ❌ |
| Cambiar roles | ✅ | ✅** | ❌ | ❌ |
| Editar info del hogar | ✅ | ✅ | ❌ | ❌ |
| Crear contenido (tareas, gastos, mant.) | ✅ | ✅ | ✅ | ❌ |
| Editar contenido propio | ✅ | ✅ | ✅ | ❌ |
| Editar contenido de otros | ✅ | ✅ | ❌ | ❌ |
| Completar tarea asignada | ✅ | ✅ | ✅ | ✅ |
| Ver contenido | ✅ | ✅ | ✅ | ✅*** |
| Configurar presupuesto | ✅ | ✅ | ❌ | ❌ |

*Admin puede eliminar members y guests, pero no a otros admins ni al owner
**Admin puede cambiar roles de member↔guest, pero no promover a admin ni degradar a otros admins
***Guest solo ve tareas (no finanzas ni mantenimientos)

### BR-ROLE-03: Transferencia de Owner
- Solo existe un 'owner' por hogar
- El owner puede transferir el ownership a otro miembro (que se convierte en owner, y el anterior en admin)
- Si el owner quiere abandonar el hogar y es el único admin, DEBE transferir primero
- La transferencia requiere confirmación explícita de ambas partes

### BR-ROLE-04: Promoción a Admin requiere MFA
- Cuando un member es promovido a admin, en su siguiente login se le solicita configurar MFA
- Si no configura MFA en 7 días, se le recuerda pero no se le degrada automáticamente

---

## BR-INV: Reglas de Invitaciones

### BR-INV-01: Creación de Invitación
- Solo owner y admin pueden crear invitaciones
- Se puede invitar por email específico o generar enlace genérico
- El rol asignado en la invitación puede ser: 'admin', 'member', o 'guest'
- Solo el owner puede crear invitaciones con rol 'admin'
- Admin puede crear invitaciones con rol 'member' o 'guest'
- No se puede invitar a alguien que ya es miembro del hogar

### BR-INV-02: Vigencia
- Las invitaciones expiran en **24 horas** desde su creación
- Una invitación expirada no puede ser aceptada (se debe crear una nueva)
- El admin puede revocar una invitación antes de que expire o sea aceptada
- Una invitación revocada no puede ser aceptada

### BR-INV-03: Aceptación
- Al aceptar una invitación, el usuario se agrega como miembro con el rol especificado
- Si el usuario no tiene cuenta, debe registrarse primero y luego la invitación se acepta automáticamente
- Al aceptar, se verifica que el hogar no haya alcanzado el límite de miembros
- Al aceptar, se genera una entrada en el feed de actividad

### BR-INV-04: Token de Invitación
- El token es un string criptográficamente seguro de 64 caracteres
- El token es de un solo uso (una vez aceptado, no puede reutilizarse)
- El enlace de invitación contiene el token en la URL

---

## BR-NOTIF: Reglas de Notificaciones Base

### BR-NOTIF-01: Preferencias por Defecto
- Al registrarse, todas las categorías tienen push=true, email=true, in_app=true
- El usuario puede modificar sus preferencias en cualquier momento
- Las categorías son: 'tasks', 'finance', 'maintenance', 'home'

### BR-NOTIF-02: Dispatch de Notificaciones
- Antes de enviar, se verifican las preferencias del usuario para esa categoría y canal
- Si el canal está deshabilitado para esa categoría, no se envía por ese canal
- Las notificaciones in-app siempre se crean (aunque el usuario las haya "deshabilitado" se guardan pero no generan badge)

### BR-NOTIF-03: Feed de Actividad
- El feed muestra los últimos 50 eventos del hogar activo
- Se pagina si hay más eventos
- El badge muestra la cantidad de eventos no leídos desde la última visita
- Marcar como leído: al abrir el feed, se marcan todos los eventos como leídos

### BR-NOTIF-04: Push Notifications
- Se envía push a TODOS los dispositivos activos del usuario
- Si un push falla (token inválido), se marca el dispositivo como is_active=false
- No se envía push al usuario que generó el evento (no te notificas a ti mismo)
