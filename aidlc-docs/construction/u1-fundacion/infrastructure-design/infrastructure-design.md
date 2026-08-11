# Diseño de Infraestructura — U1: Fundación

## Mapeo de Componentes Lógicos a Servicios

| Componente Lógico | Servicio Real | Tier/Plan |
|-------------------|--------------|-----------|
| PostgreSQL + RLS + Triggers | Supabase Database (PostgreSQL 15) | Pro |
| Auth Service | Supabase Auth | Incluido en Pro |
| Realtime | Supabase Realtime | Incluido en Pro |
| Storage (avatares, recibos) | Supabase Storage | Incluido en Pro |
| Edge Functions | Supabase Edge Functions (Deno) | Incluido en Pro |
| Cron Jobs | pg_cron (extensión PostgreSQL) | Incluido |
| Sync Engine Backend | PowerSync Service | Free/Pro tier |
| Web Hosting | Vercel | Free/Pro tier |
| Mobile Builds | EAS Build (Expo) | Free tier (limited) |
| Mobile Distribution | App Store + Play Store | Cuentas de desarrollador |
| CI/CD | GitHub Actions | Free (2000 min/mes) |
| Email transaccional | Supabase SMTP (built-in) o Resend | Free tier |
| Push Notifications | FCM (Android/Web) + APNs (iOS) | Gratuito |
| DNS/Domain | Vercel DNS o externo | Incluido en Vercel |
| Dependency Scanning | GitHub Dependabot | Gratuito |
| Error Tracking | Sentry (futuro) | Free tier |

---

## Configuración de Supabase

### Proyecto Supabase
- **Región**: Elegir la más cercana a los usuarios principales (ej: `us-east-1` o `sa-east-1` para LATAM)
- **Plan**: Pro ($25/mes) — incluye:
  - 8GB database space
  - 250MB storage
  - 500K auth users
  - 5M Edge Function invocations
  - Daily backups (7 días retención)
  - Point-in-time recovery
  - No pausing por inactividad

### Extensiones PostgreSQL Habilitadas
```sql
-- Requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- Generación de UUIDs
CREATE EXTENSION IF NOT EXISTS "pg_cron";       -- Scheduled jobs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- Funciones criptográficas

-- Opcionales/futuras
-- CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- Búsqueda fuzzy (futuro)
```

### Supabase Auth Config
```
Site URL: https://controlhogar.app (producción)
Redirect URLs: 
  - https://controlhogar.app/auth/callback
  - http://localhost:5173/auth/callback (dev)
  - controlhogar://auth/callback (mobile deep link)

Providers:
  - Email (habilitado, confirm email = true)
  - Google OAuth (habilitado)
  - Apple OAuth (habilitado)

Security:
  - MFA: habilitado (TOTP)
  - Refresh token rotation: habilitado
  - Session duration: 30 días
  - JWT expiry: 3600 segundos (1 hora)
```

### Supabase Storage Buckets
| Bucket | Público | Max File Size | Tipos Permitidos |
|--------|---------|---------------|-----------------|
| `avatars` | Sí (read) | 2MB | image/jpeg, image/png, image/webp |
| `receipts` | No | 5MB | image/*, application/pdf |
| `maintenance-photos` | No | 5MB | image/* |

### Supabase Realtime Channels
| Canal | Formato | Uso |
|-------|---------|-----|
| `home:{homeId}` | Broadcast | Actividad general del hogar |
| `presence:{homeId}` | Presence | Quién está activo |

---

## Configuración de PowerSync

### PowerSync Instance
- **Provider**: PowerSync Cloud (managed)
- **Conexión**: Supabase PostgreSQL connection string
- **Sync Rules**: Definidas en `packages/shared/src/modules/sync/sync-rules.yaml`

### Sync Rules Base (U1)
```yaml
bucket_definitions:
  user_data:
    parameters: SELECT id AS user_id FROM profiles WHERE id = token_parameters.user_id
    data:
      - SELECT * FROM profiles WHERE id = bucket.user_id
      - SELECT * FROM user_devices WHERE user_id = bucket.user_id
      - SELECT * FROM notification_preferences WHERE user_id = bucket.user_id
  
  home_data:
    parameters: SELECT home_id FROM home_members WHERE user_id = token_parameters.user_id
    data:
      - SELECT * FROM homes WHERE id = bucket.home_id
      - SELECT * FROM home_members WHERE home_id = bucket.home_id
      - SELECT * FROM invitations WHERE home_id = bucket.home_id
      - SELECT * FROM activity_entries WHERE home_id = bucket.home_id
      - SELECT * FROM app_notifications WHERE home_id = bucket.home_id AND user_id = token_parameters.user_id
```

---

## Configuración de Vercel

### Proyecto Vercel
- **Framework Preset**: Vite
- **Build Command**: `cd packages/web && pnpm build`
- **Output Directory**: `packages/web/dist`
- **Install Command**: `pnpm install`
- **Root Directory**: `/` (monorepo root)

### Environment Variables (Vercel)
```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_POWERSYNC_URL=https://<instance>.powersync.journeyapps.com
```

### Dominios
- Producción: `controlhogar.app` (o similar)
- Preview: `*.controlhogar.vercel.app` (automático por PR)
- Dev local: `http://localhost:5173`

### Headers de Seguridad (vercel.json)
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.powersync.journeyapps.com" }
      ]
    }
  ]
}
```

---

## Configuración de EAS (Expo Application Services)

### eas.json
```json
{
  "cli": { "version": ">= 9.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "<apple-id>", "ascAppId": "<asc-app-id>" },
      "android": { "serviceAccountKeyPath": "./google-services.json" }
    }
  }
}
```

---

## Ambientes

| Ambiente | Supabase | Vercel | Mobile |
|----------|----------|--------|--------|
| **dev** | Local (supabase start) | localhost:5173 | Expo Dev Client |
| **staging** | Proyecto Supabase separado | Preview deploy (PR) | EAS preview build |
| **production** | Proyecto Supabase principal | controlhogar.app | App Store / Play Store |

### Variables de Entorno por Ambiente
```
# Shared across envs (different values)
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY (solo server/CI)
POWERSYNC_URL
POWERSYNC_PUBLIC_KEY

# Production only
SENTRY_DSN (futuro)
FCM_SERVER_KEY
APPLE_PUSH_KEY
```
