# User Stories — ControlHogar

Organizadas por módulo funcional. Prioridad de implementación: Auth/Usuarios → Tareas → Finanzas → Mantenimientos.
Formato de criterios de aceptación: Given/When/Then (BDD).

---

## Épica 1: Sistema de Usuarios y Hogares (Prioridad 1)

### US-01: Registro de Usuario
**Como** nuevo usuario  
**Quiero** crear una cuenta con email y contraseña o login social  
**Para** acceder a la aplicación y crear/unirme a un hogar  

**Criterios de Aceptación:**
- Given un usuario sin cuenta, When completa el formulario de registro con email válido y contraseña segura, Then se crea la cuenta y recibe email de verificación
- Given un usuario sin cuenta, When elige login con Google/Apple, Then se crea la cuenta automáticamente con los datos del proveedor social
- Given un email ya registrado, When intenta registrarse de nuevo, Then se muestra mensaje de error indicando que el email ya existe

**Personas**: Carlos, Laura, Andrés

---

### US-02: Inicio de Sesión
**Como** usuario registrado  
**Quiero** iniciar sesión con mis credenciales  
**Para** acceder a mi hogar y sus datos  

**Criterios de Aceptación:**
- Given credenciales válidas, When el usuario inicia sesión, Then accede al dashboard de su hogar
- Given credenciales inválidas, When intenta iniciar sesión, Then se muestra error genérico sin revelar qué campo es incorrecto
- Given un admin con MFA habilitado, When inicia sesión, Then se solicita el segundo factor antes de acceder

**Personas**: Carlos, Laura, Andrés

---

### US-03: Crear un Hogar
**Como** usuario autenticado  
**Quiero** crear un nuevo hogar  
**Para** tener un espacio donde gestionar tareas, gastos y mantenimientos con mi grupo  

**Criterios de Aceptación:**
- Given un usuario autenticado, When crea un hogar con nombre, Then se crea el hogar y el usuario se asigna como administrador
- Given un usuario, When crea un hogar, Then puede personalizar el nombre y una descripción opcional
- Given un usuario que ya pertenece a hogares, When crea otro, Then puede pertenecer a múltiples hogares simultáneamente

**Personas**: Carlos, Laura

---

### US-04: Invitar Miembros al Hogar
**Como** administrador del hogar  
**Quiero** invitar a otras personas mediante enlace o email  
**Para** que se unan al hogar con el rol apropiado  

**Criterios de Aceptación:**
- Given un admin, When genera una invitación, Then puede elegir el rol (miembro o invitado) y se genera un enlace/email
- Given un enlace de invitación válido, When un usuario registrado lo abre, Then se une al hogar con el rol asignado
- Given un enlace de invitación, When un usuario no registrado lo abre, Then se le pide crear cuenta primero y luego se une automáticamente
- Given un admin, When quiere revocar una invitación pendiente, Then puede invalidar el enlace

**Personas**: Carlos

---

### US-05: Gestionar Miembros y Roles
**Como** administrador  
**Quiero** ver los miembros del hogar y modificar sus roles  
**Para** controlar quién tiene acceso y qué permisos tienen  

**Criterios de Aceptación:**
- Given un admin, When accede a la configuración del hogar, Then ve la lista de miembros con sus roles
- Given un admin, When cambia el rol de un miembro, Then los permisos se actualizan inmediatamente
- Given un admin, When elimina a un miembro, Then pierde acceso al hogar y sus datos quedan asociados al hogar (historial)
- Given un miembro o invitado, When intenta cambiar roles, Then se le deniega la acción

**Personas**: Carlos

---

## Épica 2: Gestión de Tareas del Hogar (Prioridad 2)

### US-06: Crear Tarea
**Como** administrador o miembro  
**Quiero** crear una tarea doméstica con nombre, descripción y frecuencia  
**Para** registrar las responsabilidades del hogar  

**Criterios de Aceptación:**
- Given un usuario con permisos, When crea una tarea con nombre y frecuencia, Then la tarea aparece en la lista del hogar
- Given una tarea, When se asigna frecuencia (diaria/semanal/quincenal/mensual/personalizada), Then se generan las ocurrencias futuras automáticamente
- Given un invitado, When intenta crear una tarea, Then se le deniega la acción

**Personas**: Carlos, Laura

---

### US-07: Asignar Responsable a Tarea
**Como** administrador o miembro  
**Quiero** asignar una tarea a uno o varios miembros del hogar  
**Para** que cada quien sepa qué le corresponde  

**Criterios de Aceptación:**
- Given una tarea creada, When se asigna a un miembro, Then ese miembro recibe notificación y la tarea aparece en su lista personal
- Given una tarea, When se asigna a un invitado, Then el invitado puede verla y completarla
- Given una tarea recurrente, When se asigna, Then la asignación aplica a todas las ocurrencias futuras (o se puede rotar)

**Personas**: Carlos, Laura

---

### US-08: Completar Tarea
**Como** usuario asignado a una tarea  
**Quiero** marcar la tarea como completada  
**Para** registrar que cumplí mi responsabilidad  

**Criterios de Aceptación:**
- Given una tarea asignada al usuario, When la marca como completada, Then se registra fecha/hora y quién la completó
- Given una tarea recurrente completada, When se marca, Then la próxima ocurrencia se genera automáticamente según la frecuencia
- Given un invitado con tarea asignada, When la marca como completada, Then se registra correctamente
- Given una tarea no asignada al usuario, When intenta completarla, Then se permite (cualquier miembro puede completar tareas del hogar)

**Personas**: Carlos, Laura, Andrés

---

### US-09: Ver Historial de Tareas
**Como** administrador o miembro  
**Quiero** ver el historial de tareas completadas  
**Para** saber quién hizo qué y cuándo  

**Criterios de Aceptación:**
- Given un usuario con permisos, When accede al historial, Then ve las tareas completadas ordenadas por fecha con quién las hizo
- Given el historial, When filtra por miembro, Then ve solo las tareas completadas por esa persona
- Given el historial, When filtra por período, Then ve solo las tareas del rango seleccionado

**Personas**: Carlos, Laura

---

### US-10: Recibir Recordatorio de Tarea
**Como** usuario asignado a una tarea  
**Quiero** recibir un recordatorio antes de que venza  
**Para** no olvidar cumplirla a tiempo  

**Criterios de Aceptación:**
- Given una tarea con fecha/hora límite, When se acerca el vencimiento, Then el usuario asignado recibe notificación push
- Given una tarea vencida sin completar, When pasa el tiempo límite, Then se marca como atrasada y se notifica al admin
- Given un usuario, When configura preferencias de notificación, Then puede ajustar anticipación del recordatorio

**Personas**: Carlos, Laura, Andrés

---

## Épica 3: Planificador Financiero (Prioridad 3)

### US-11: Registrar Gasto
**Como** administrador o miembro  
**Quiero** registrar un gasto con monto, categoría y quién pagó  
**Para** llevar control de los gastos del hogar  

**Criterios de Aceptación:**
- Given un usuario con permisos, When registra un gasto con monto y categoría, Then aparece en el registro del hogar
- Given un gasto, When se indica quién pagó y quiénes participan, Then se calcula automáticamente cuánto debe cada uno
- Given un gasto, When se adjunta foto de recibo, Then queda almacenada y asociada al gasto

**Personas**: Carlos, Laura

---

### US-12: Gestionar Pagos Recurrentes
**Como** administrador o miembro  
**Quiero** registrar pagos recurrentes (servicios, arriendo, suscripciones)  
**Para** no olvidar fechas de vencimiento y distribuir responsabilidades  

**Criterios de Aceptación:**
- Given un usuario, When crea un pago recurrente con monto, frecuencia y fecha de vencimiento, Then se genera automáticamente cada período
- Given un pago recurrente próximo a vencer, When faltan X días, Then se envía notificación por push y email a los responsables
- Given un pago recurrente, When se marca como pagado, Then se registra quién pagó y la fecha

**Personas**: Carlos, Laura

---

### US-13: Ver Balance entre Miembros
**Como** miembro del hogar  
**Quiero** ver cuánto debo o me deben los demás miembros  
**Para** mantener las cuentas claras y equitativas  

**Criterios de Aceptación:**
- Given gastos registrados, When un usuario consulta el balance, Then ve el neto de lo que debe/le deben a cada miembro
- Given un balance positivo (le deben), When consulta el detalle, Then ve los gastos individuales que componen la deuda
- Given un balance, When un miembro "salda" la deuda, Then ambos confirman y el balance se reinicia

**Personas**: Carlos, Laura

---

### US-14: Definir Presupuesto Mensual
**Como** administrador  
**Quiero** definir un presupuesto mensual por categoría  
**Para** controlar el gasto del hogar y recibir alertas cuando se exceda  

**Criterios de Aceptación:**
- Given un admin, When define presupuesto por categoría (alimentación, servicios, transporte, etc.), Then se establece el límite mensual
- Given gastos que se acercan al 80% del presupuesto de una categoría, When se registra un nuevo gasto, Then se envía alerta
- Given el presupuesto excedido, When se consulta, Then se muestra claramente el exceso con indicador visual

**Personas**: Carlos

---

### US-15: Lista de Compras
**Como** administrador o miembro  
**Quiero** mantener una lista de compras pendientes  
**Para** no olvidar lo que necesita el hogar  

**Criterios de Aceptación:**
- Given un usuario, When agrega un ítem a la lista de compras, Then aparece visible para todos los miembros
- Given un ítem de la lista, When se compra, Then se puede marcar como comprado y opcionalmente registrar como gasto
- Given la lista, When se sincroniza en tiempo real, Then todos ven los cambios inmediatamente

**Personas**: Carlos, Laura

---

## Épica 4: Lista de Mantenimientos (Prioridad 4)

### US-16: Registrar Mantenimiento Pendiente
**Como** administrador o miembro  
**Quiero** registrar un arreglo o mantenimiento pendiente  
**Para** que no se olvide y se pueda planificar  

**Criterios de Aceptación:**
- Given un usuario, When crea un mantenimiento con título, descripción y prioridad, Then aparece en la lista del hogar
- Given un mantenimiento, When se le agregan fotos, Then quedan adjuntas para referencia visual
- Given un mantenimiento, When se le agregan notas, Then se acumula un historial de comentarios

**Personas**: Carlos, Laura

---

### US-17: Gestionar Estado de Mantenimiento
**Como** administrador o miembro  
**Quiero** actualizar el estado de un mantenimiento (pendiente → en progreso → completado)  
**Para** hacer seguimiento del avance  

**Criterios de Aceptación:**
- Given un mantenimiento pendiente, When se cambia a "en progreso", Then se registra la fecha y quién lo actualizó
- Given un mantenimiento en progreso, When se marca como completado, Then se mueve al historial con fecha de cierre
- Given los mantenimientos, When se filtran por estado, Then se ven solo los del estado seleccionado

**Personas**: Carlos, Laura

---

### US-18: Priorizar Mantenimientos
**Como** administrador  
**Quiero** asignar prioridad (alta, media, baja) a los mantenimientos  
**Para** atender primero lo más urgente  

**Criterios de Aceptación:**
- Given un mantenimiento, When el admin asigna prioridad alta, Then se muestra destacado en la lista
- Given la lista de mantenimientos, When se ordena por prioridad, Then los de alta prioridad aparecen primero
- Given un mantenimiento de alta prioridad sin atender por X días, When se cumple el tiempo, Then se envía recordatorio

**Personas**: Carlos

---

## Épica 5: Sincronización y Modo Offline (Transversal)

### US-19: Sincronización en Tiempo Real
**Como** miembro del hogar  
**Quiero** ver los cambios de otros miembros en tiempo real  
**Para** tener información siempre actualizada sin refrescar manualmente  

**Criterios de Aceptación:**
- Given dos usuarios conectados, When uno realiza un cambio, Then el otro lo ve reflejado en < 500ms
- Given un cambio en tiempo real, When se recibe, Then se muestra indicador visual sutil de actualización
- Given múltiples usuarios, When consultan la misma información, Then todos ven el estado consistente

**Personas**: Carlos, Laura

---

### US-20: Trabajar Sin Conexión
**Como** usuario  
**Quiero** usar la aplicación sin conexión a internet  
**Para** no depender de la conectividad para consultar o registrar información  

**Criterios de Aceptación:**
- Given un usuario sin conexión, When consulta tareas/gastos/mantenimientos, Then ve los datos locales actualizados hasta la última sincronización
- Given un usuario sin conexión, When crea/edita/completa elementos, Then los cambios se guardan localmente
- Given un indicador de conexión, When el usuario está offline, Then se muestra claramente el estado y los cambios pendientes

**Personas**: Carlos, Laura

---

### US-21: Resolución de Conflictos al Sincronizar
**Como** usuario que trabajó offline  
**Quiero** que mis cambios se sincronicen correctamente al recuperar conexión  
**Para** no perder información ni sobrescribir cambios de otros  

**Criterios de Aceptación:**
- Given cambios pendientes y conexión recuperada, When se inicia sincronización, Then los cambios sin conflicto se aplican automáticamente (merge)
- Given un conflicto irreconciliable (mismo campo editado por dos usuarios offline), When se detecta, Then se presenta al usuario las dos versiones para elegir
- Given una resolución de conflicto, When el usuario elige, Then se aplica la versión elegida y se notifica al otro usuario

**Personas**: Carlos, Laura

---

## Épica 6: Notificaciones (Transversal)

### US-22: Recibir Notificaciones Push
**Como** usuario  
**Quiero** recibir notificaciones push en mi dispositivo  
**Para** enterarme de tareas pendientes, pagos próximos y actividad del hogar  

**Criterios de Aceptación:**
- Given un evento relevante (tarea asignada, pago próximo, mantenimiento urgente), When ocurre, Then se envía push al usuario afectado
- Given un usuario, When configura preferencias de notificaciones, Then puede activar/desactivar por categoría
- Given un dispositivo con permisos de push, When se recibe notificación, Then al tocarla se abre la pantalla relevante

**Personas**: Carlos, Laura, Andrés

---

### US-23: Recibir Notificaciones por Email
**Como** usuario  
**Quiero** recibir emails para eventos importantes  
**Para** no perderme pagos que vencen o tareas atrasadas aunque no tenga la app abierta  

**Criterios de Aceptación:**
- Given un pago que vence en 3 días, When se cumple la condición, Then se envía email al responsable
- Given una tarea atrasada por más de 24h, When se cumple la condición, Then se notifica por email al asignado y al admin
- Given un usuario, When desea desuscribirse de emails, Then puede hacerlo desde la app o desde el enlace del email

**Personas**: Carlos, Laura

---

### US-24: Feed de Actividad In-App
**Como** usuario  
**Quiero** ver un feed de actividad reciente del hogar  
**Para** saber qué han hecho los demás sin tener que preguntar  

**Criterios de Aceptación:**
- Given actividad en el hogar, When un usuario abre el feed, Then ve los eventos recientes ordenados cronológicamente
- Given el feed, When hay actividad nueva no vista, Then se muestra un badge/indicador
- Given el feed, When el usuario lo consulta, Then se marca como leído y el badge desaparece

**Personas**: Carlos, Laura

---

## Resumen

| Épica | Stories | Prioridad MVP |
|-------|---------|---------------|
| Sistema de Usuarios y Hogares | US-01 a US-05 (5) | 1 - Base técnica |
| Gestión de Tareas del Hogar | US-06 a US-10 (5) | 2 - Funcionalidad cotidiana |
| Planificador Financiero | US-11 a US-15 (5) | 3 - Gestión económica |
| Lista de Mantenimientos | US-16 a US-18 (3) | 4 - Gestión física |
| Sincronización y Modo Offline | US-19 a US-21 (3) | Transversal (todas las épicas) |
| Notificaciones | US-22 a US-24 (3) | Transversal (todas las épicas) |
| **Total** | **24 stories** | |
