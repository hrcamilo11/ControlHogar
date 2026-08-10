# Plan de Diseño de Aplicación — ControlHogar

## Plan de Ejecución

### Fase 1: Identificación de Componentes
- [x] Identificar componentes principales del sistema y sus responsabilidades
- [x] Definir límites claros entre módulos (Tareas, Finanzas, Mantenimientos, Usuarios, Sync, Notificaciones)
- [x] Establecer componentes compartidos/transversales

### Fase 2: Definición de Métodos e Interfaces
- [x] Definir interfaces públicas de cada componente
- [x] Especificar firmas de métodos principales (entrada/salida)
- [x] Identificar DTOs y tipos compartidos

### Fase 3: Diseño de Capa de Servicios
- [x] Definir servicios de orquestación
- [x] Establecer patrones de comunicación entre componentes
- [x] Diseñar la capa de sincronización offline

### Fase 4: Dependencias entre Componentes
- [x] Mapear dependencias entre componentes
- [x] Definir flujos de datos principales
- [x] Documentar patrones de comunicación (eventos, llamadas directas, suscripciones)

### Fase 5: Consolidación
- [x] Generar documento consolidado de diseño de aplicación
- [x] Validar completitud y consistencia

---

## Preguntas de Diseño

Por favor responda cada pregunta colocando la letra después de `[Answer]:`.

### Pregunta 1: Estructura del Proyecto
¿Cómo prefiere organizar el código del proyecto?

A) Monorepo con workspaces (una sola repo con packages: web, mobile, shared, api) — facilita compartir código entre plataformas

B) Repositorios separados (una repo para web, otra para móvil, otra para backend/shared) — mayor independencia de equipos

C) Monorepo con estructura de features (carpetas por feature que contienen web+mobile+shared para ese feature) — alta cohesión por funcionalidad

D) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: A

### Pregunta 2: Framework Móvil
¿Qué framework prefiere para la aplicación móvil?

A) React Native (con Expo) — código nativo real, gran ecosistema, excelente rendimiento, compatible con TypeScript

B) Capacitor (Ionic) — envuelve la app web en un shell nativo, menor esfuerzo de desarrollo separado, misma base de código web

C) React Native (bare workflow, sin Expo) — máximo control sobre módulos nativos, más complejo de configurar

D) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: A

### Pregunta 3: Gestión de Estado en el Cliente
¿Qué patrón de gestión de estado prefiere para el frontend?

A) Zustand — ligero, simple, sin boilerplate, ideal para apps medianas

B) Redux Toolkit — robusto, predecible, excelente DevTools, más estructura

C) React Query/TanStack Query + Context — enfocado en server state con cache, ideal cuando los datos vienen del backend

D) Jotai/Recoil — atómico, granular, excelente para composición de estado

E) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: C

### Pregunta 4: Estrategia de Sincronización Offline
¿Qué librería/enfoque prefiere para el almacenamiento local y sync offline?

A) WatermelonDB — base de datos reactiva optimizada para React Native, sync incremental, excelente rendimiento con grandes datasets

B) RxDB — base de datos offline-first reactiva con replicación integrada para CouchDB/Supabase, soporte multi-tab

C) Implementación custom con Supabase + IndexedDB/SQLite — control total, sin dependencia extra, más esfuerzo de desarrollo

D) PowerSync — sync engine específico para Supabase con resolución de conflictos integrada

E) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: D

### Pregunta 5: Patrón de Comunicación entre Componentes
¿Cómo deben comunicarse los componentes/módulos internamente?

A) Event-driven (pub/sub interno) — bajo acoplamiento, componentes independientes emiten y escuchan eventos

B) Llamadas directas a servicios — simple, directo, cada componente importa y llama al servicio que necesita

C) Híbrido — llamadas directas para operaciones síncronas + eventos para notificaciones y updates en tiempo real

D) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: C

### Pregunta 6: Funciones del Backend (Supabase)
¿Dónde debe residir la lógica de negocio del servidor?

A) Supabase Edge Functions (Deno) — serverless, escalable, cercano a la base de datos, ideal para validaciones y triggers

B) Funciones de base de datos (PostgreSQL functions/triggers) — máxima cercanía a los datos, ideal para constraints y cálculos

C) Combinación: RLS + DB triggers para seguridad/integridad + Edge Functions para lógica compleja (emails, push notifications, cálculos de balance)

D) Backend separado (Node.js/Express) desplegado aparte — máximo control pero más infraestructura

E) Otro (por favor describa después de la etiqueta [Answer]:)

[Answer]: C

---

## Artefactos a Generar
- `aidlc-docs/inception/application-design/components.md`
- `aidlc-docs/inception/application-design/component-methods.md`
- `aidlc-docs/inception/application-design/services.md`
- `aidlc-docs/inception/application-design/component-dependency.md`
- `aidlc-docs/inception/application-design/application-design.md` (consolidado)
