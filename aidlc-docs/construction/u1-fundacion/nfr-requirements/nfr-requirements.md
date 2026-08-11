# Requerimientos No Funcionales — U1: Fundación

## NFR-PERF: Rendimiento

### NFR-PERF-01: Tiempo de Carga Inicial
- **Web**: First Contentful Paint < 1.5s, Time to Interactive < 3s
- **Mobile**: App launch to interactive < 2s (cold start)
- **Estrategia**: Code splitting por ruta, lazy loading de features, prefetch de datos críticos

### NFR-PERF-02: Respuesta de API
- Operaciones CRUD: < 200ms (P95) para queries simples
- Autenticación: < 500ms (P95) incluyendo OAuth redirect
- PowerSync initial sync: < 3s para hogar con 20 miembros y datos base

### NFR-PERF-03: Realtime Latency
- Cambios propagados a otros clientes: < 500ms (P95) en condiciones normales
- Feed de actividad actualizado: < 1s

### NFR-PERF-04: Optimización de Bundle
- Web bundle (gzipped): < 200KB initial load (JS + CSS)
- Imágenes: WebP con lazy loading, thumbnails para avatares
- Fonts: system fonts preferidos, variable font si custom

---

## NFR-SEC: Seguridad

### NFR-SEC-01: Cifrado
- **En tránsito**: TLS 1.3 (Supabase enforce por defecto)
- **En reposo**: AES-256 (Supabase encrypted storage por defecto)
- **Tokens locales**: expo-secure-store (mobile), httpOnly cookies (web)
- **Invitaciones**: nanoid con 64 chars entropy (crypto random)

### NFR-SEC-02: Autenticación
- Supabase Auth con PKCE flow para OAuth
- Session tokens: JWT con audience y issuer validation
- Refresh token rotation habilitado
- Brute force protection: 5 intentos, lockout 15 min
- MFA: TOTP con backup codes

### NFR-SEC-03: Autorización (RLS)
- Todas las tablas con RLS habilitado (DENY by default)
- Policies basadas en `auth.uid()` y membership en `home_members`
- No hay endpoints sin autenticación excepto: health check, invitación pública
- Object-level authorization: verificar membership en cada query

### NFR-SEC-04: Input Validation
- Validación con Zod en cliente Y servidor (Edge Functions)
- Max payload size: 1MB para requests normales, 5MB para uploads
- Sanitización de HTML/XSS en campos de texto libre
- SQL injection: imposible con RLS + prepared statements (Supabase default)

### NFR-SEC-05: Headers HTTP (Web)
- Content-Security-Policy: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'` (TailwindCSS requiere unsafe-inline para styles)
- Strict-Transport-Security: `max-age=31536000; includeSubDomains`
- X-Content-Type-Options: `nosniff`
- X-Frame-Options: `DENY`
- Referrer-Policy: `strict-origin-when-cross-origin`

### NFR-SEC-06: Supply Chain
- Lockfile comiteado (pnpm-lock.yaml)
- `pnpm audit` en CI pipeline (fail on high/critical)
- Dependabot habilitado para PRs automáticos
- No usar `latest` en ninguna dependencia
- SBOM generado en build de release

---

## NFR-RELI: Confiabilidad

### NFR-RELI-01: Disponibilidad
- Target: 99.5% uptime (Supabase Pro tier SLA)
- Degradación graceful: app funciona offline con datos locales
- Health check endpoint: `/health` en Edge Functions

### NFR-RELI-02: Offline Resilience
- PowerSync mantiene datos locales completos del hogar
- Operaciones de escritura se encolan localmente
- Detección automática de reconexión
- Sync automática al recuperar conexión
- UI indica claramente estado offline y cambios pendientes

### NFR-RELI-03: Error Handling
- Global error boundary en React (web + mobile)
- Errores de red: retry automático con exponential backoff (3 retries)
- Errores de validación: mensajes amigables al usuario
- Errores de servidor: mensaje genérico + logging detallado
- Crash reporting: Sentry o similar (futuro)

### NFR-RELI-04: Data Integrity
- Foreign keys con ON DELETE CASCADE/RESTRICT según caso
- Unique constraints en business keys
- Check constraints para enums y rangos
- Transacciones para operaciones multi-tabla (via DB functions)

---

## NFR-OBSV: Observabilidad

### NFR-OBSV-01: Logging
- Structured logging (JSON format) en Edge Functions
- Log levels: error, warn, info, debug
- Campos obligatorios: timestamp, correlation_id, user_id, home_id, action
- NO loguear: passwords, tokens, PII sensible
- Retención: 90 días mínimo (Supabase Logs)

### NFR-OBSV-02: Monitoreo
- Dashboard Supabase para métricas de DB, Auth, Realtime, Storage
- Alertas: error rate > 5%, latencia P95 > 2s, auth failures > 10/min
- PowerSync dashboard para sync metrics
- Uptime monitoring: endpoint health check cada 5 min

### NFR-OBSV-03: Audit Trail
- activity_entries captura todas las acciones de negocio
- Supabase Auth logs captura auth events
- Edge Function logs captura invocaciones

---

## NFR-MAINT: Mantenibilidad

### NFR-MAINT-01: Calidad de Código
- ESLint strict mode (no warnings as errors)
- Prettier para formateo consistente
- TypeScript strict mode (strict: true, noUncheckedIndexedAccess: true)
- Husky pre-commit: lint + format + type-check

### NFR-MAINT-02: Testing
- Unit tests: Vitest, coverage target > 80% en shared/
- PBT: fast-check para propiedades identificadas en Functional Design
- Component tests: React Testing Library
- Integration tests: Supabase local (via CLI) + test containers
- E2E: Playwright para web (smoke tests críticos)

### NFR-MAINT-03: Migraciones de DB
- Versionadas con Supabase CLI (`supabase migration new`)
- Cada migración tiene su rollback (`down.sql`)
- Migrations testadas en local antes de aplicar en producción
- Naming convention: `YYYYMMDDHHMMSS_description.sql`

### NFR-MAINT-04: Documentación
- README.md con setup rápido, requisitos y comandos
- JSDoc en funciones públicas de shared/
- ADRs (Architecture Decision Records) para decisiones importantes
- API docs auto-generadas desde tipos TypeScript

---

## NFR-ACCESS: Accesibilidad

### NFR-ACCESS-01: Estándares
- WCAG 2.1 Level AA compliance
- Navegación completa por teclado (web)
- Soporte VoiceOver (iOS) y TalkBack (Android)
- Contraste mínimo 4.5:1 para texto normal, 3:1 para texto grande

### NFR-ACCESS-02: Implementación
- Semantic HTML (web): headings, landmarks, aria-labels
- React Native: accessibilityLabel, accessibilityRole, accessibilityHint
- Focus management en modales y navegación
- Skip links en web
- Reduced motion support (prefers-reduced-motion)

---

## NFR-I18N: Internacionalización

### NFR-I18N-01: Preparación
- Idioma principal: Español (es)
- Arquitectura preparada para i18n (react-intl o i18next)
- Todos los strings en archivos de traducción (no hardcoded en componentes)
- Formato de fechas/números localizado
- RTL no requerido en MVP pero no bloquear

---

## Cumplimiento de Extensiones

### Security Baseline
- SECURITY-01: ✅ Cifrado at rest y in transit (Supabase default + TLS)
- SECURITY-03: ✅ Structured logging en Edge Functions
- SECURITY-04: ✅ HTTP security headers definidos
- SECURITY-05: ✅ Zod validation en todas las APIs
- SECURITY-08: ✅ RLS + RBAC application-level
- SECURITY-10: ✅ Lockfile + audit + Dependabot
- SECURITY-12: ✅ Supabase Auth (adaptive hashing, MFA, brute-force)

### Resiliency Baseline
- RESILIENCY-05: ✅ Monitoring con dashboard Supabase + alertas
- RESILIENCY-06: ✅ Health check endpoint
- RESILIENCY-10: ✅ Timeouts + retry con backoff + graceful degradation

### Property-Based Testing
- PBT-09: ✅ Framework seleccionado: fast-check con Vitest
