# Personas de Usuario — ControlHogar

## Persona 1: Carlos — Administrador del Hogar

| Atributo | Descripción |
|----------|-------------|
| **Rol** | Administrador |
| **Edad** | 30-45 años |
| **Ocupación** | Profesional con trabajo de oficina |
| **Contexto** | Vive con pareja e hijos o compañeros de piso |
| **Dispositivo principal** | Smartphone (Android/iOS) + laptop para planificación detallada |
| **Frecuencia de uso** | Diario (mañana y noche) |
| **Motivación** | Mantener el hogar organizado, asegurar que todos cumplan sus responsabilidades, tener control del presupuesto familiar |
| **Frustración** | Nadie recuerda qué le toca hacer, los gastos se acumulan sin control, los arreglos se posponen indefinidamente |
| **Objetivo principal** | Que el hogar funcione como un equipo coordinado sin tener que estar recordando todo verbalmente |

### Contexto de Uso
- Revisa la app al despertar para ver el estado del día
- Asigna tareas y configura frecuencias desde el laptop los domingos
- Registra gastos inmediatamente desde el móvil
- Invita nuevos miembros al hogar y gestiona permisos

---

## Persona 2: Laura — Miembro del Hogar

| Atributo | Descripción |
|----------|-------------|
| **Rol** | Miembro |
| **Edad** | 18-35 años |
| **Ocupación** | Estudiante o profesional joven |
| **Contexto** | Comparte vivienda (pareja, roommates, familia) |
| **Dispositivo principal** | Smartphone exclusivamente |
| **Frecuencia de uso** | Diario (consultas rápidas) |
| **Motivación** | Saber qué le toca hacer hoy, no olvidar pagos, contribuir equitativamente |
| **Frustración** | No saber cuánto debe del mes, olvidar tareas asignadas, no tener visibilidad del estado general |
| **Objetivo principal** | Cumplir sus responsabilidades sin fricción y tener claridad sobre su parte de los gastos |

### Contexto de Uso
- Revisa notificaciones push para ver tareas del día
- Marca tareas como completadas desde el móvil
- Consulta el balance de gastos para saber cuánto debe/le deben
- A veces usa la app sin conexión (metro, zonas sin WiFi)

---

## Persona 3: Andrés — Invitado

| Atributo | Descripción |
|----------|-------------|
| **Rol** | Invitado |
| **Edad** | 20-50 años |
| **Ocupación** | Variado |
| **Contexto** | Visita temporal (familiar de visita, amigo ayudando en mudanza, cuidador temporal) |
| **Dispositivo principal** | Smartphone |
| **Frecuencia de uso** | Ocasional (durante su estadía) |
| **Motivación** | Colaborar con tareas específicas asignadas durante su visita |
| **Frustración** | No saber qué se espera de él, no poder marcar que ya hizo algo |
| **Objetivo principal** | Ver qué tareas tiene asignadas y marcarlas como hechas, sin complicaciones |

### Contexto de Uso
- Recibe invitación por enlace/email
- Ve solo las tareas asignadas a él y la información general del hogar
- Marca tareas completadas
- No crea, edita ni elimina contenido
- No accede a finanzas ni mantenimiento

---

## Matriz Persona-Módulo

| Módulo | Carlos (Admin) | Laura (Miembro) | Andrés (Invitado) |
|--------|---------------|-----------------|-------------------|
| Gestión de Tareas | CRUD completo + asignar | CRUD + completar propias | Solo ver + completar asignadas |
| Planificador Financiero | CRUD completo + presupuesto | Crear gastos + ver balance | Sin acceso |
| Mantenimientos | CRUD completo + priorizar | Crear + actualizar estado | Sin acceso |
| Usuarios y Hogar | Gestión completa + invitar | Ver miembros | Solo perfil propio |
| Notificaciones | Todas | Todas relevantes | Solo tareas asignadas |
