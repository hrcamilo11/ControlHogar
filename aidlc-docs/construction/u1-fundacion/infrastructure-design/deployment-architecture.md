# Arquitectura de Despliegue — U1: Fundación

## Diagrama de Despliegue

```
+---------------------------------------------------------------+
|                        USUARIOS                                |
|  +-------------+  +-------------+  +-----------------------+  |
|  | iOS App     |  | Android App |  | Web Browser           |  |
|  | (App Store) |  | (Play Store)|  | (controlhogar.app)    |  |
|  +------+------+  +------+------+  +-----------+-----------+  |
+---------|-----------------|----------------------|-------------+
          |                 |                      |
          v                 v                      v
+---------------------------------------------------------------+
|                      EDGE / CDN                                |
|                                                                |
|  +----------------------------------------------------------+ |
|  |              Vercel Edge Network                          | |
|  |  (CDN global, static assets, SPA routing, headers)       | |
|  +----------------------------------------------------------+ |
+---------------------------------------------------------------+
          |                 |                      |
          v                 v                      v
+---------------------------------------------------------------+
|                    BACKEND (Supabase Cloud)                    |
|                                                                |
|  +------------------+  +------------------+  +--------------+ |
|  | Supabase Auth    |  | PostgreSQL 15    |  | Edge         | |
|  | (GoTrue)         |  | + RLS Policies   |  | Functions    | |
|  | - JWT signing    |  | + pg_cron        |  | (Deno)       | |
|  | - OAuth proxy    |  | + Triggers       |  | - Emails     | |
|  | - MFA TOTP       |  | + Functions      |  | - Push       | |
|  | - Rate limiting  |  |                  |  | - Cron       | |
|  +------------------+  +------------------+  +--------------+ |
|                                                                |
|  +------------------+  +------------------+  +--------------+ |
|  | Realtime         |  | Storage          |  | PowerSync    | |
|  | (WebSocket)      |  | (S3-compatible)  |  | Connector    | |
|  | - Broadcast      |  | - Avatars        |  | (CDC →       | |
|  | - Presence       |  | - Receipts       |  |  sync rules) | |
|  | - Postgres CDC   |  | - Photos         |  |              | |
|  +------------------+  +------------------+  +--------------+ |
+---------------------------------------------------------------+
          |
          v
+---------------------------------------------------------------+
|                  SERVICIOS EXTERNOS                            |
|                                                                |
|  +-------------+  +-------------+  +------------------------+ |
|  | Google      |  | Apple       |  | PowerSync Cloud        | |
|  | OAuth +     |  | OAuth +     |  | (sync engine,          | |
|  | FCM         |  | APNs        |  |  bucket management)    | |
|  +-------------+  +-------------+  +------------------------+ |
|                                                                |
|  +-------------+  +-------------+                             |
|  | Resend /    |  | GitHub      |                             |
|  | SMTP        |  | Actions     |                             |
|  | (emails)    |  | (CI/CD)     |                             |
|  +-------------+  +-------------+                             |
+---------------------------------------------------------------+
```

---

## Pipeline CI/CD (GitHub Actions)

### Workflow: `ci.yml` (en cada push/PR)
```yaml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup pnpm + node
      - pnpm install --frozen-lockfile
      - pnpm turbo lint
      - pnpm turbo typecheck

  test:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - checkout
      - setup pnpm + node
      - setup supabase CLI (local DB for integration tests)
      - pnpm install --frozen-lockfile
      - supabase start
      - pnpm turbo test
      - upload coverage reports

  security-audit:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup pnpm
      - pnpm audit --audit-level=high

  build:
    runs-on: ubuntu-latest
    needs: [test, security-audit]
    steps:
      - checkout
      - setup pnpm + node
      - pnpm install --frozen-lockfile
      - pnpm turbo build
```

### Workflow: `deploy-web.yml` (en merge a main)
```yaml
name: Deploy Web
on:
  push:
    branches: [main]
    paths:
      - 'packages/web/**'
      - 'packages/shared/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup pnpm + node
      - pnpm install --frozen-lockfile
      - pnpm turbo build --filter=web
      - deploy to Vercel (via Vercel CLI or GitHub integration)
```

### Workflow: `deploy-supabase.yml` (en merge a main)
```yaml
name: Deploy Supabase
on:
  push:
    branches: [main]
    paths:
      - 'packages/supabase/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup supabase CLI
      - supabase link --project-ref $SUPABASE_PROJECT_ID
      - supabase db push (apply pending migrations)
      - supabase functions deploy --all
```

### Workflow: `deploy-mobile.yml` (manual trigger)
```yaml
name: Deploy Mobile
on:
  workflow_dispatch:
    inputs:
      platform:
        description: 'Platform to build'
        required: true
        type: choice
        options: [ios, android, all]
      profile:
        description: 'Build profile'
        required: true
        type: choice
        options: [preview, production]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup node + eas-cli
      - eas build --platform ${{ inputs.platform }} --profile ${{ inputs.profile }}
      # Para production: eas submit después del build
```

---

## Estrategia de Rollback

### Web (Vercel)
- **Mecanismo**: Vercel mantiene historial de deployments
- **Rollback**: Un clic en dashboard de Vercel o `vercel rollback` CLI
- **Tiempo**: Instantáneo (< 5 segundos)

### Supabase (Migraciones)
- **Mecanismo**: Cada migración tiene su `down.sql` correspondiente
- **Rollback**: `supabase migration repair` + aplicar down migration
- **Tiempo**: Minutos (depende de la migración)
- **Precaución**: Migraciones destructivas requieren backup previo

### Mobile (EAS)
- **Mecanismo**: EAS Update para OTA (JavaScript bundle)
- **Rollback**: Publicar update apuntando a bundle anterior
- **Tiempo**: Minutos (propagación OTA)
- **Nativo**: Si es cambio nativo, requiere nueva versión en stores (días)

### Edge Functions
- **Mecanismo**: Supabase mantiene versiones de functions
- **Rollback**: `supabase functions deploy` con código anterior (git revert + redeploy)
- **Tiempo**: < 30 segundos

---

## Gestión de Secretos

| Secreto | Ubicación | Acceso |
|---------|-----------|--------|
| SUPABASE_SERVICE_ROLE_KEY | GitHub Secrets + Supabase Dashboard | Solo CI/CD y Edge Functions |
| SUPABASE_ANON_KEY | Vercel env vars + app config | Público (RLS protege) |
| POWERSYNC_PUBLIC_KEY | Vercel env vars + app config | Público |
| FCM_SERVER_KEY | GitHub Secrets → Edge Function env | Solo Edge Functions |
| APPLE_PUSH_KEY | GitHub Secrets → Edge Function env | Solo Edge Functions |
| GOOGLE_OAUTH_SECRET | Supabase Dashboard (Auth config) | Solo Supabase Auth |
| APPLE_OAUTH_SECRET | Supabase Dashboard (Auth config) | Solo Supabase Auth |

**Reglas**:
- NUNCA en código fuente
- NUNCA en logs
- Rotación: anual o tras compromiso
- Service role key: solo server-side, NUNCA en cliente

---

## Monitoreo y Alertas

### Dashboards
| Fuente | Métricas |
|--------|----------|
| Supabase Dashboard | DB connections, query performance, auth events, storage usage |
| Vercel Analytics | Web vitals (LCP, FID, CLS), page views, errors |
| PowerSync Dashboard | Sync latency, connected clients, data volume |
| GitHub Actions | Build times, failure rates |

### Alertas Configuradas
| Alerta | Condición | Canal |
|--------|-----------|-------|
| DB connection pool exhausted | connections > 80% | Email al equipo |
| Auth error spike | auth failures > 20/min | Email al equipo |
| Edge Function errors | error rate > 10% | Email al equipo |
| Build failure | CI workflow fails on main | GitHub notification |
| Dependency vulnerability | high/critical CVE | Dependabot PR |

---

## Costos Estimados (Mensual)

| Servicio | Plan | Costo |
|----------|------|-------|
| Supabase | Pro | $25/mes |
| PowerSync | Free (hasta 1000 users) | $0 |
| Vercel | Free (hobby) → Pro si necesario | $0-$20/mes |
| EAS Build | Free (30 builds/mes) | $0 |
| GitHub Actions | Free (2000 min/mes) | $0 |
| Dominio | .app | ~$14/año |
| Apple Developer | Annual | $99/año |
| Google Play Developer | One-time | $25 one-time |
| **Total estimado** | | **~$30-50/mes** |
