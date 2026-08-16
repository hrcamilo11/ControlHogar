# ControlHogar — Changelog & Roadmap

## Estado del Proyecto

- **Versión actual**: 0.1.0 (MVP Web)
- **Plataformas**: Web (React + Vite + TailwindCSS)
- **Backend**: Supabase Cloud (PostgreSQL + Auth + Realtime + Storage + Edge Functions)
- **Deploy**: Vercel
- **Última actualización**: 2026-08-12

---

## Changelog

### v0.1.0 — MVP Web Completo (2026-08-10 → 2026-08-12)

#### Auth y Usuarios

- Login con email/password + Google OAuth
- Registro con verificación de email
- Recuperar contraseña
- Múltiples hogares por usuario (máx 5)
- Selector de hogar en header
- Invitaciones por enlace (expiración 24h)
- Aceptar invitación via URL
- Revocar invitaciones pendientes
- Roles: owner, admin, member, guest
- Gestionar miembros (cambiar rol, eliminar)
- RLS en todas las tablas

#### Tareas

- CRUD con frecuencia configurable (una vez, diaria, semanal, quincenal, mensual)
- Días específicos de la semana + hora
- Asignar a múltiples miembros
- Rotación equitativa (asigna al de menos completaciones)
- Completar con optimistic update
- Pausar/reactivar tareas recurrentes
- Subtareas (checklist con barra de progreso)
- Comentarios por tarea
- Historial de completaciones con filtros
- Filtros: asignado (todas/mías/sin asignar) + fecha (hoy/semana/mes/atrasadas)
- Ordenamiento: fecha/título/frecuencia
- Editar completo (título, descripción, frecuencia, días, hora)
- Eliminar (soft delete, conserva historial)
- Validaciones: título vacío, fecha pasada, rotación <2, confirmación atrasada >24h
- Permisos por rol (guest solo completa asignadas)

#### Finanzas

- Gastos con split personalizable (equitativo / porcentaje / montos fijos)
- Elegir quién pagó y entre quiénes se divide
- Selector de categoría (9 predeterminadas + personalizadas)
- Adjuntar recibo (upload a Storage, vista inline)
- Asociar gasto a tarea
- Editar gastos existentes
- Balance detallado (quién debe a quién, con detalle por persona)
- Botón "Saldar" por deuda individual
- Pagos recurrentes (crear, marcar pagado, eliminar)
- Indicadores visuales de vencimiento (próximo/vencido)
- Presupuesto mensual por categoría con barras de progreso y alertas (80%/100%)
- Lista de compras colaborativa (agregar, marcar comprado, eliminar)
- Filtros por categoría y pagador
- Descripción/notas en gastos

#### Mantenimientos

- CRUD con prioridad (alta/media/baja) + colores
- Asignar responsable
- Fecha estimada de resolución
- Asociar a tarea
- Avanzar estado (Pendiente → En progreso → Completado)
- Notas inline
- Fotos con upload + galería con lightbox
- Filtros por estado
- Muestra quién creó y completó
- Eliminar con confirmación

#### Dashboard

- Cards de resumen (4 métricas clave)
- Próximas tareas (5 más cercanas)
- Búsqueda global (tareas + gastos + mantenimientos)

#### Calendario Global

- Vista mensual con navegación entre meses
- 3 tipos de eventos: tareas (azul), pagos (verde), mantenimientos (naranja)
- Leyenda de colores
- Panel lateral al clic con detalle del día (icono + título + info)
- Día actual resaltado

#### Estadísticas

- Gastos por categoría (barras)
- Completaciones por miembro (barras)
- Reporte mensual descargable (TXT)

#### Notificaciones

- Panel de alertas (tareas atrasadas, pagos próximos)
- Badge con conteo de no leídas (polling 30s)
- Marcar individual/todas como leídas
- Eliminar notificaciones
- Cron automático diario (7 AM Colombia) via Edge Function

#### Actividad

- Feed cronológico de acciones del hogar
- Dots de color por tipo de acción
- Timestamps relativos
- Actualización en tiempo real

#### Configuración

- Temas: Claro / Oscuro / AMOLED / Sistema
- Idioma: Español / Inglés (estructura base)
- Perfil: avatar (upload), nombre editable
- Seguridad: cambiar contraseña, cerrar sesión
- Hogar: editar nombre/descripción, moneda (8 LATAM), transferir ownership, abandonar, eliminar (soft 30 días)
- Categorías: ver predeterminadas, crear/eliminar personalizadas
- Exportar datos: JSON por módulo o completo

#### Infraestructura

- Monorepo (pnpm workspaces + Turborepo)
- TypeScript strict mode
- 25+ tests unitarios con PBT (fast-check)
- CI/CD (GitHub Actions: lint → typecheck → test → build)
- Supabase Cloud con 11+ migraciones SQL
- RLS deny-by-default en todas las tablas
- Edge Functions: health, send-email, check-overdue
- Realtime subscriptions (sync multi-usuario)
- Modo offline (cache + indicador + mutations queue)
- Deploy automático en Vercel
- Lucide React para iconografía consistente
- Accesibilidad (skip-link, aria-labels, roles)
- Animaciones CSS (fade-slide en transiciones)

---

## Pendientes — Roadmap

### Prioridad 1: Limpieza y Correcciones

- [x] **Eliminar código muerto**: `TaskCalendar.tsx`, `SortableTaskList.tsx`, `MonthlyReport.tsx`, `i18n.ts`, dependencia `@dnd-kit`
- [x] **Fix transferir ownership**: ahora muestra lista numerada de candidatos y deja elegir
- [x] **Fix exportar datos**: cambiado de JSON a CSV (compatible con Excel, con BOM UTF-8)
- [x] **Eliminar reporte TXT**: eliminado, las estadísticas visuales + CSV cubren la necesidad
- [x] **Frecuencia "custom" (cada X días)**: expuesto en UI con input de días (2-365) + hora

### Prioridad 2: Mejoras Funcionales

- [ ] **Unificar Actividad + Alertas**: una sola vista "Notificaciones" con filtros (Todo / Requiere acción)
- [ ] **Dashboard accionable**: agregar "Completar" directo desde inicio, "Marcar pagado" en cards
- [ ] **Calendario interactivo**: clic en día vacío permite crear tarea/pago/mantenimiento
- [ ] **Balance con simplificación de deudas**: algoritmo que minimiza número de transacciones necesarias
- [ ] **Subtareas con asignado**: cada item del checklist puede asignarse a alguien diferente
- [ ] **Considerar fusionar Mantenimiento con Tareas**: ambos son muy similares, mantenimiento podría ser un "tipo" de tarea sin recurrencia

### Prioridad 3: UX y Pulido

- [ ] **Onboarding**: tutorial guiado para nuevos usuarios
- [ ] **Atajos de teclado**: Ctrl+K búsqueda, Ctrl+N nueva tarea
- [ ] **Toast con undo**: al eliminar algo, poder deshacer en 5 segundos
- [ ] **Tema personalizable**: colores de acento custom (no solo azul)
- [ ] **Mover lista de compras**: sacarla de Finanzas, hacerla accesible desde Inicio o como tipo de tarea

### Prioridad 4: Mobile

- [ ] **Setup Expo + React Native**: proyecto con shared package
- [ ] **Pantallas nativas**: login, dashboard, tareas, finanzas, mantenimiento
- [ ] **Push notifications**: FCM (Android) + APNs (iOS)
- [ ] **Build APK**: EAS Build para Android
- [ ] **Build IPA**: EAS Build para iOS (requiere Apple Developer $99/año)
- [ ] **Deep linking**: abrir invitaciones desde la app mobile

### Prioridad 5: Infraestructura

- [ ] **Tests E2E**: Playwright para flujos críticos (login, crear tarea, registrar gasto)
- [ ] **PowerSync offline real**: SQLite local con sync bidireccional
- [ ] **Email delivery**: verificar que emails de Resend no caigan en spam
- [ ] **Sentry**: error tracking en producción
- [ ] **Analytics**: métricas de uso (opcional, privacy-first)

---

## Decisiones Arquitectónicas Pendientes

| Decisión                        | Opciones                                        | Estado      |
| -------------------------------- | ----------------------------------------------- | ----------- |
| Fusionar Mantenimiento en Tareas | Módulo separado vs tipo de tarea               | Por evaluar |
| Lista de compras                 | Sub-tab de Finanzas vs acceso rápido en Inicio | Por evaluar |
| i18n                             | Implementar completo vs eliminar sistema muerto | Por evaluar |
| Frecuencia "custom"              | Exponer en UI vs eliminar del código           | Por evaluar |

---

## Notas Técnicas

- Base de datos: 20+ tablas con RLS, triggers, pg_cron
- Migraciones: `packages/supabase/supabase/migrations/` (secuenciales)
- Edge Functions: `packages/supabase/supabase/functions/` (health, send-email, check-overdue)
- Cron: `check-overdue-daily` ejecuta diariamente a las 12:00 UTC
- Realtime: publicación en tablas tasks, expenses, settlements, maintenances, etc.
- Storage buckets: avatars (público), receipts (privado), maintenance-photos (público)
