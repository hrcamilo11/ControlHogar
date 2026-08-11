# Decisiones de Tech Stack — U1: Fundación

## Stack Principal

| Capa | Tecnología | Versión | Justificación |
|------|-----------|---------|---------------|
| Lenguaje | TypeScript | 5.5+ | Tipado fuerte fullstack, un solo lenguaje |
| Monorepo | pnpm workspaces + Turborepo | pnpm 9+, turbo 2+ | Build caching, parallel tasks, dependency deduplication |
| Web Framework | React | 18.3+ | Ecosistema maduro, hooks, concurrent features |
| Web Bundler | Vite | 5+ | HMR rápido, ESBuild, tree shaking |
| Web Router | React Router | 6.4+ | Data loading, nested routes, lazy loading |
| Web CSS | TailwindCSS | 3.4+ | Utility-first, tree-shakeable, design system rápido |
| Mobile Framework | React Native | 0.74+ | Código nativo, rendimiento, ecosistema |
| Mobile Platform | Expo | SDK 51+ | Managed workflow, OTA updates, EAS Build |
| Mobile Router | Expo Router | 3+ | File-based routing, deep linking automático |
| State Management | TanStack Query | 5+ | Server state cache, mutations, offline support |
| Local State | React Context | built-in | Ligero para state local (theme, active home) |
| Offline Sync | PowerSync | 1.5+ | Sync engine para Supabase, conflict resolution |
| Backend | Supabase | latest | PostgreSQL, Auth, Realtime, Storage, Edge Functions |
| Database | PostgreSQL | 15+ (via Supabase) | Relacional, RLS, triggers, JSONB |
| Auth | Supabase Auth | built-in | OAuth, MFA, session management, email templates |
| Realtime | Supabase Realtime | built-in | WebSocket channels, presence, broadcast |
| Storage | Supabase Storage | built-in | S3-compatible, RLS policies, transformations |
| Edge Functions | Supabase Edge Functions | Deno runtime | Serverless, TypeScript, close to DB |

## Testing Stack

| Herramienta | Versión | Uso |
|-------------|---------|-----|
| Vitest | 1.6+ | Test runner (unit + integration) |
| fast-check | 3.19+ | Property-based testing (PBT) |
| React Testing Library | 16+ | Component testing |
| React Native Testing Library | 12+ | Mobile component testing |
| MSW (Mock Service Worker) | 2+ | API mocking para tests |
| Playwright | 1.44+ | E2E tests web |
| Detox | 20+ | E2E tests mobile (futuro) |

## Tooling y DX

| Herramienta | Versión | Uso |
|-------------|---------|-----|
| ESLint | 9+ (flat config) | Linting TypeScript/React |
| Prettier | 3+ | Formateo de código |
| Husky | 9+ | Git hooks (pre-commit) |
| lint-staged | 15+ | Run linters solo en staged files |
| Commitlint | 19+ | Validar formato de commits |
| Supabase CLI | 1.170+ | Local development, migraciones, testing |

## CI/CD

| Herramienta | Uso |
|-------------|-----|
| GitHub Actions | Pipeline CI/CD principal |
| EAS Build (Expo) | Builds nativos iOS/Android en la nube |
| EAS Submit | Publicación a App Store / Play Store |
| Vercel / Netlify | Hosting web (o Supabase Hosting) |

## Dependencias de Seguridad

| Librería | Uso |
|----------|-----|
| helmet (via headers) | HTTP security headers en respuestas |
| zod | Validación de esquemas (input validation) |
| nanoid | Generación de tokens seguros (invitaciones) |
| @supabase/supabase-js | Cliente con auth, RLS integrado |
| expo-secure-store | Almacenamiento seguro en mobile (tokens) |
| @react-native-async-storage | Storage local (preferencias) |

## Dependencias de Notificaciones

| Librería | Uso |
|----------|-----|
| expo-notifications | Push notifications en mobile |
| web-push (Edge Function) | Push notifications en web |
| @supabase/functions-js | Invocar Edge Functions |
| react-hot-toast (web) | Toast notifications UI |

---

## Principios de Selección

1. **Priorizar herramientas managed**: Supabase gestiona DB, Auth, Realtime, Storage — minimizar ops
2. **Versiones pinned**: Lockfile (pnpm-lock.yaml) comiteado, sin `latest` en dependencias
3. **Misma base de código donde sea posible**: shared/ contiene lógica reutilizable
4. **Oficiales primero**: preferir sdks oficiales (@supabase/*, expo-*) sobre alternativas
5. **Dependency scanning**: `pnpm audit` en CI, alertas de Dependabot habilitadas
