# Documento de Requerimientos — ControlHogar

## Análisis de Intención

| Campo | Valor |
|-------|-------|
| **Solicitud del usuario** | Crear "ControlHogar" — un centro de gestión y control doméstico |
| **Tipo de solicitud** | Nuevo Proyecto (Greenfield) |
| **Estimación de alcance** | Múltiples Componentes |
| **Estimación de complejidad** | Moderada |

## Visión del Producto

ControlHogar es una aplicación de gestión doméstica colaborativa diseñada para simplificar la convivencia y administración del hogar. Resuelve la desorganización en tareas cotidianas, la falta de seguimiento a gastos/pagos recurrentes y la acumulación de arreglos pendientes mediante un sistema multiusuario y sincronizado que centraliza el aseo, la planeación financiera y el mantenimiento en un solo lugar.

---

## Requerimientos Funcionales

### RF-01: Gestión de Tareas del Hogar
- Crear, editar y eliminar tareas domésticas (limpieza, compras, cocina, etc.)
- Asignar responsables a cada tarea
- Definir frecuencia/recurrencia (diaria, semanal, quincenal, mensual, personalizada)
- Marcar tareas como completadas con registro de fecha/hora
- Notificaciones/recordatorios de tareas pendientes
- Historial de tareas completadas por usuario

### RF-02: Planificador Financiero del Hogar
- Registrar gastos individuales y compartidos
- Gestionar recibos y pagos recurrentes (servicios públicos, arriendo, suscripciones)
- Definir presupuesto mensual del hogar
- Seguimiento de compras pendientes y realizadas
- Balance y distribución de gastos entre miembros del hogar
- Alertas de vencimiento de pagos

### RF-03: Lista de Mantenimientos
- Registrar arreglos y mantenimientos pendientes del hogar
- Asignar prioridad (alta, media, baja)
- Agregar notas, fotos y descripciones
- Seguimiento de estado (pendiente, en progreso, completado)
- Historial de mantenimientos realizados

### RF-04: Sistema de Usuarios y Hogares
- Registro e inicio de sesión de usuarios (email/contraseña, login social)
- Crear un "hogar" (espacio compartido)
- Invitar a otros usuarios al hogar mediante enlace o email
- Roles de usuario: administrador, miembro, invitado
- El administrador puede gestionar miembros y configuración del hogar
- Un usuario puede pertenecer a múltiples hogares

### RF-05: Sincronización en Tiempo Real
- Cambios realizados por cualquier miembro se reflejan inmediatamente en todos los dispositivos
- Soporte de WebSockets / Supabase Realtime para actualizaciones en vivo
- Indicadores visuales de actividad de otros miembros

### RF-06: Modo Sin Conexión (Offline-First)
- La aplicación funciona sin conexión a internet
- Los datos se almacenan localmente (IndexedDB en web, SQLite en móvil)
- Al recuperar conexión, sincronización automática con resolución de conflictos
- Indicador visual de estado de conexión y datos pendientes de sincronizar

---

## Requerimientos No Funcionales

### RNF-01: Plataformas
- **Web**: Aplicación web responsive accesible desde navegadores modernos (Chrome, Firefox, Safari, Edge)
- **Móvil**: Aplicación nativa/híbrida para iOS y Android
- **Experiencia unificada**: Misma funcionalidad y datos en todas las plataformas

### RNF-02: Stack Tecnológico
- **Lenguaje**: TypeScript (fullstack)
- **Frontend Web**: React con framework multiplataforma (React Native / Capacitor para móvil)
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Almacenamiento local**: IndexedDB (web) / SQLite (móvil)
- **Testing PBT**: fast-check (integrado con Vitest/Jest)

### RNF-03: Seguridad y Privacidad
- Cifrado de datos en tránsito (TLS 1.2+) y en reposo
- Autenticación segura con Supabase Auth (hash adaptativo, MFA para admins)
- Row Level Security (RLS) en PostgreSQL para aislamiento de datos por hogar
- Validación de entrada en todas las APIs
- Headers HTTP de seguridad (CSP, HSTS, X-Content-Type-Options, etc.)
- No almacenar datos sensibles en logs
- Control de acceso basado en roles (RBAC) a nivel de aplicación

### RNF-04: Rendimiento
- Tiempo de carga inicial < 3 segundos
- Actualizaciones en tiempo real con latencia < 500ms
- Soporte para modo offline sin degradación de UX local
- Sincronización eficiente (solo deltas/cambios)

### RNF-05: Escalabilidad
- Escala pequeña: hasta ~50 hogares, ~200 usuarios concurrentes
- Supabase maneja la escalabilidad del backend
- Diseño stateless para las funciones serverless

### RNF-06: Disponibilidad y Resiliencia
- **Topología**: Una sola región, multi-zona (Supabase gestionado)
- **RTO/RPO**: Horas (Backup & Restore es suficiente dado que Supabase gestiona backups automáticos)
- **DR Strategy**: Sin DR cross-region; confiar en la disponibilidad multi-zona de Supabase
- **Monitoreo**: Dashboard básico de salud y alertas para errores críticos

### RNF-07: Operaciones y Despliegue
- **CI/CD**: Pipeline a definir (propuesta de AI-DLC — GitHub Actions recomendado)
- **Estilo de despliegue**: Directo / in-place
- **Rollback**: Database-aware (reversión de migraciones de esquema)
- **Gestión de cambios**: Proceso ligero (registro + aprobación + nota de rollback)
- **Respuesta a incidentes**: Proceso ligero propuesto por AI-DLC
- **Testing de resiliencia**: Diferido a fase de Operaciones

### RNF-08: Accesibilidad
- Cumplimiento con WCAG 2.1 nivel AA
- Navegación por teclado completa
- Compatible con lectores de pantalla
- Contraste de colores adecuado

### RNF-09: Internacionalización
- Idioma principal: Español
- Arquitectura preparada para soporte multiidioma futuro (i18n)

---

## Decisiones de Extensiones

| Extensión | Estado | Decisión |
|-----------|--------|----------|
| Security Baseline | ✅ Habilitada | Todas las reglas SECURITY como restricciones obligatorias |
| Resiliency Baseline | ✅ Habilitada | Todas las reglas RESILIENCY como guía de diseño |
| Property-Based Testing | ✅ Habilitada | Todas las reglas PBT como restricciones obligatorias |

---

## Restricciones y Supuestos

### Restricciones
- Backend gestionado por Supabase (no infraestructura propia de base de datos)
- Presupuesto acorde a escala pequeña (tier gratuito/pro de Supabase)
- Despliegue en una sola región

### Supuestos
- Los usuarios tienen conexión a internet la mayor parte del tiempo (offline es para períodos cortos)
- El volumen de datos por hogar es moderado (no big data)
- No se requiere integración con dispositivos IoT físicos
- La resolución de conflictos offline puede ser "last-write-wins" con opción de revisión manual

---

## Resumen Ejecutivo

ControlHogar es una app multiplataforma (web + iOS + Android) construida con TypeScript y Supabase que permite a los miembros de un hogar gestionar colaborativamente sus tareas domésticas, finanzas del hogar y mantenimientos pendientes. Soporta múltiples usuarios con roles, sincronización en tiempo real y funcionamiento offline-first con resolución de conflictos.
