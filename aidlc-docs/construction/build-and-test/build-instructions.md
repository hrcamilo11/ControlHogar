# Instrucciones de Build — ControlHogar

## Prerequisitos

| Herramienta | Versión Mínima | Instalación |
|-------------|---------------|-------------|
| Node.js | 20.x | https://nodejs.org |
| pnpm | 9.x | `npm install -g pnpm` |
| Supabase CLI | 1.170+ | `pnpm add -g supabase` |
| Docker | 24+ | https://docker.com (para Supabase local) |
| Git | 2.40+ | https://git-scm.com |

## Setup Inicial (Primera Vez)

```bash
# 1. Clonar repositorio
git clone https://github.com/<org>/ControlHogar.git
cd ControlHogar

# 2. Instalar dependencias
pnpm install

# 3. Iniciar Supabase local (requiere Docker)
cd packages/supabase
supabase start
# Nota: Guarda las URLs y keys que se muestran al iniciar

# 4. Aplicar migraciones
supabase db reset  # Aplica todas las migraciones + seeds

# 5. Generar tipos desde la DB
pnpm generate-types

# 6. Configurar variables de entorno
cd ../..
cp .env.example .env.local
# Editar .env.local con las URLs de supabase start
```

## Variables de Entorno (.env.local)

```env
# Supabase (local)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<anon-key-from-supabase-start>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-supabase-start>

# PowerSync (dev)
VITE_POWERSYNC_URL=<powersync-dev-instance-url>

# App
VITE_APP_URL=http://localhost:5173
```

## Comandos de Build

```bash
# Build completo (todos los packages)
pnpm turbo build

# Build individual por package
pnpm turbo build --filter=@controlhogar/shared
pnpm turbo build --filter=@controlhogar/web
pnpm turbo build --filter=@controlhogar/mobile

# Type checking
pnpm turbo typecheck

# Linting
pnpm turbo lint

# Formateo
pnpm format
pnpm format:check  # Solo verificar sin corregir
```

## Desarrollo Local

```bash
# Web (Vite dev server en http://localhost:5173)
pnpm dev:web

# Mobile (Expo dev server)
pnpm dev:mobile

# Supabase Studio (http://localhost:54323)
cd packages/supabase && supabase start
```

## Migraciones de Base de Datos

```bash
cd packages/supabase

# Crear nueva migración
supabase migration new <nombre_descriptivo>

# Aplicar migraciones pendientes (local)
supabase db push

# Reset completo (recrear desde cero)
supabase db reset

# Generar tipos TypeScript desde la DB
pnpm generate-types
```

## Build para Producción

```bash
# Web (genera dist/ optimizado)
pnpm turbo build --filter=@controlhogar/web
# Output: packages/web/dist/

# Mobile (via EAS Build)
cd packages/mobile
eas build --platform ios --profile production
eas build --platform android --profile production

# Deploy Supabase (migraciones + Edge Functions)
cd packages/supabase
supabase link --project-ref <project-id>
supabase db push
supabase functions deploy --all
```
