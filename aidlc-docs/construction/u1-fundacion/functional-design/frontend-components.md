# Componentes Frontend — U1: Fundación

## Estructura de Navegación

### Web (React Router)
```
/                       → Redirect a /dashboard o /auth/login
/auth/login             → Pantalla de login
/auth/register          → Pantalla de registro
/auth/verify-email      → Pantalla "Verifica tu email"
/auth/reset-password    → Solicitar reset de contraseña
/auth/callback          → OAuth callback
/invite/:token          → Aceptar invitación
/dashboard              → Dashboard del hogar activo
/home/create            → Crear nuevo hogar
/home/settings          → Configuración del hogar (admin)
/home/members           → Gestión de miembros
/home/select            → Selector de hogar (si tiene múltiples)
/notifications          → Feed de actividad
/profile                → Perfil y configuración del usuario
/profile/notifications  → Preferencias de notificaciones
/profile/security       → MFA y seguridad
```

### Mobile (Expo Router — file-based)
```
(auth)/
  login                 → Pantalla de login
  register              → Pantalla de registro
  verify-email          → Pantalla verificación
  reset-password        → Reset contraseña
(app)/
  (tabs)/
    index               → Dashboard (tab principal)
    tasks               → Tareas (U2)
    finance             → Finanzas (U3)
    maintenance         → Mantenimientos (U4)
    notifications       → Feed de actividad
  home/
    create              → Crear hogar
    settings            → Config hogar
    members             → Miembros
    select              → Selector de hogar
  profile/
    index               → Perfil
    notifications       → Preferencias
    security            → MFA
  invite/[token]        → Aceptar invitación
```

---

## Jerarquía de Componentes UI

### Layout Principal (Shared concept, platform-specific render)
```
AppRoot
├── AuthGuard (redirect si no autenticado)
│   ├── EmailVerificationGuard (bloquea si no verificado)
│   │   ├── HomeGuard (redirect si no tiene hogar)
│   │   │   ├── MainLayout
│   │   │   │   ├── Header/TopBar
│   │   │   │   │   ├── HomeSwitcher (dropdown/modal)
│   │   │   │   │   ├── NotificationBell (con badge)
│   │   │   │   │   └── UserAvatar (menu perfil)
│   │   │   │   ├── Navigation (sidebar web / bottom tabs mobile)
│   │   │   │   └── ContentArea (outlet para rutas hijas)
```

---

## Pantallas Detalladas

### Auth: Login
**Componentes:**
- `LoginForm`
  - Input email (validación formato)
  - Input password (min 8 chars, toggle visibilidad)
  - Botón "Iniciar Sesión"
  - Link "¿Olvidaste tu contraseña?"
  - Divider "o continuar con"
  - Botón Google OAuth
  - Botón Apple OAuth
  - Link "¿No tienes cuenta? Regístrate"
- `MFAPrompt` (modal, aparece si usuario tiene MFA)
  - Input código 6 dígitos
  - Botón "Verificar"

**Estado:**
- `isLoading`: boolean
- `error`: string | null
- `showMFA`: boolean

---

### Auth: Register
**Componentes:**
- `RegisterForm`
  - Input nombre
  - Input email
  - Input password (con indicador de fortaleza)
  - Input confirmar password
  - Checkbox aceptar términos
  - Botón "Crear Cuenta"
  - Botón Google OAuth
  - Botón Apple OAuth
  - Link "¿Ya tienes cuenta? Inicia Sesión"

**Validaciones frontend:**
- Nombre: 2-50 caracteres
- Email: formato válido
- Password: min 8 caracteres, al menos 1 mayúscula, 1 número
- Confirmar password: debe coincidir
- Términos: debe estar marcado

---

### Auth: Verify Email
**Componentes:**
- `VerifyEmailScreen`
  - Icono de email
  - Texto "Hemos enviado un enlace de verificación a {email}"
  - Botón "Reenviar email" (con cooldown 60s)
  - Link "Cambiar email"
  - Auto-refresh cada 5s (polling para detectar verificación)

---

### Home: Dashboard
**Componentes:**
- `DashboardScreen`
  - `WelcomeHeader` (nombre del usuario + hogar)
  - `QuickStats` (resumen: tareas pendientes hoy, balance, mantenimientos urgentes)
  - `RecentActivity` (últimas 5 entradas del feed)
  - `QuickActions` (botones: nueva tarea, nuevo gasto, nuevo mantenimiento)

**Nota**: Los widgets de tareas/finanzas/mantenimientos se implementan como placeholders en U1, se llenan en U2/U3/U4.

---

### Home: Create
**Componentes:**
- `CreateHomeForm`
  - Input nombre (2-100 chars)
  - Textarea descripción (opcional, 0-500 chars)
  - Contador de caracteres
  - Botón "Crear Hogar"
- `HomeCreatedSuccess` (post-creación)
  - Mensaje de éxito
  - Botón "Invitar miembros"
  - Botón "Ir al dashboard"

---

### Home: Members
**Componentes:**
- `MembersList`
  - Lista de miembros con avatar, nombre, rol, fecha de ingreso
  - Badge de rol con color (owner=dorado, admin=azul, member=verde, guest=gris)
  - Menú contextual por miembro (cambiar rol, eliminar) — solo visible según permisos
- `InviteMemberModal`
  - Toggle: "Por email" / "Enlace genérico"
  - Input email (si por email)
  - Selector de rol (admin/member/guest — según permisos del invitador)
  - Botón "Enviar Invitación"
  - Copiar enlace (si enlace genérico)
- `PendingInvitations`
  - Lista de invitaciones pendientes con email, rol, tiempo restante
  - Botón "Revocar" por invitación
- `ChangeRoleModal`
  - Selector de nuevo rol
  - Advertencias contextuales (ej: "Se le pedirá configurar MFA")
  - Botón confirmar
- `TransferOwnershipModal` (solo visible para owner)
  - Selector de nuevo owner
  - Advertencia explícita
  - Input confirmación (escribir nombre del hogar)
  - Botón "Transferir"

---

### Notifications: Feed
**Componentes:**
- `NotificationFeed`
  - Lista virtualizada de ActivityEntry
  - Cada item muestra: avatar actor, acción, entidad, timestamp relativo
  - Paginación infinite scroll (50 items por página)
  - Estado vacío: "No hay actividad aún"
- `NotificationBell`
  - Icono campana
  - Badge con conteo de no leídas (número o "9+")
  - Al tocar: navegar a feed

---

### Profile: Settings
**Componentes:**
- `ProfileForm`
  - Avatar (editable, upload a Supabase Storage)
  - Input nombre
  - Email (readonly, mostrar verificado ✓)
  - Botón "Guardar cambios"
- `SecuritySection`
  - Estado MFA (habilitado/deshabilitado)
  - Botón "Configurar MFA" / "Desactivar MFA"
  - Botón "Cambiar contraseña"
  - Botón "Cerrar sesión"
  - Botón "Cerrar todas las sesiones"

---

### Profile: Notification Preferences
**Componentes:**
- `PreferencesForm`
  - Por cada categoría (tasks, finance, maintenance, home):
    - Toggle Push
    - Toggle Email
    - Toggle In-App
  - Botón "Guardar preferencias"

---

### Invite: Accept
**Componentes:**
- `AcceptInvitationScreen`
  - IF válida: nombre del hogar, quién invitó, rol asignado, botón "Unirme"
  - IF expirada: mensaje "Invitación expirada", sugerir pedir nueva
  - IF revocada: mensaje "Invitación revocada"
  - IF ya miembro: mensaje "Ya eres miembro de este hogar"
  - IF no autenticado: redirigir a registro/login, luego volver

---

## Componentes Compartidos (UI Kit)

| Componente | Uso |
|------------|-----|
| `Button` | Primario, secundario, outline, danger, con loading state |
| `Input` | Text, email, password con validación inline |
| `Modal` | Overlay modal responsive |
| `Toast` | Notificaciones efímeras (éxito, error, info) |
| `Badge` | Contador numérico (notificaciones) |
| `Avatar` | Imagen circular con fallback a iniciales |
| `RoleBadge` | Badge coloreado por rol |
| `EmptyState` | Placeholder cuando no hay datos |
| `LoadingSpinner` | Indicador de carga |
| `ConnectionIndicator` | Online/Offline badge en header |
| `PullToRefresh` | Mobile: pull-to-refresh wrapper |
| `InfiniteScroll` | Paginación automática al scroll |
