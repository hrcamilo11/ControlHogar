# Modelo de Lógica de Negocio — U1: Fundación

## Flujo 1: Registro de Usuario

```
1. Usuario ingresa email + contraseña (o elige OAuth)
2. IF email/password:
   a. Validar formato email
   b. Validar contraseña (min 8 chars)
   c. Verificar email no existe en sistema
   d. Crear usuario en Supabase Auth
   e. Crear perfil en public.profiles (email_verified=false)
   f. Enviar email de verificación
   g. Redirigir a pantalla "Verifica tu email"
3. IF OAuth (Google/Apple):
   a. Redirigir a proveedor OAuth
   b. Recibir callback con token
   c. Crear usuario en Supabase Auth (email_verified=true automáticamente)
   d. Crear perfil en public.profiles
   e. Redirigir a dashboard (puede crear/unirse a hogar inmediatamente)
```

## Flujo 2: Verificación de Email

```
1. Usuario hace clic en enlace de verificación
2. Validar que el token no ha expirado (24h)
3. IF válido:
   a. Marcar email_verified=true en profiles
   b. Actualizar auth.users metadata
   c. Redirigir a app con mensaje de éxito
   d. Habilitar acciones protegidas (crear/unirse a hogar)
4. IF expirado:
   a. Mostrar pantalla "Enlace expirado"
   b. Ofrecer botón "Reenviar verificación"
```

## Flujo 3: Inicio de Sesión

```
1. Usuario ingresa email + contraseña (o elige OAuth)
2. IF email/password:
   a. Verificar credenciales con Supabase Auth
   b. IF credenciales inválidas:
      - Incrementar contador de intentos fallidos
      - IF intentos >= 5: bloquear 15 minutos
      - Mostrar error genérico "Credenciales inválidas"
   c. IF credenciales válidas:
      - Resetear contador de intentos
      - IF MFA habilitado: solicitar código TOTP
      - Generar access token + refresh token
      - Inicializar PowerSync con userId
      - Cargar hogar activo (último utilizado)
      - Redirigir a dashboard
3. IF OAuth:
   a. Redirigir a proveedor → recibir callback
   b. Generar tokens
   c. Verificar si usuario necesita configurar MFA (es admin sin MFA)
   d. Inicializar PowerSync
   e. Redirigir a dashboard
```

## Flujo 4: Crear Hogar

```
1. Verificar email_verified == true
2. Verificar usuario tiene < 5 hogares activos
3. Validar nombre (2-100 chars) y descripción (0-500 chars)
4. Crear registro en tabla homes (is_active=true)
5. Crear registro en home_members (user_id=current, role='owner')
6. Establecer como hogar activo del usuario
7. Inicializar preferencias de notificación para el usuario en este hogar
8. Crear entrada en activity_entries ('home', 'created')
9. Retornar hogar creado
```

## Flujo 5: Invitar Miembro

```
1. Verificar usuario actual es owner o admin del hogar
2. Verificar hogar tiene < 20 miembros
3. IF rol invitación es 'admin':
   - Verificar usuario actual es owner (solo owner puede crear admins)
4. IF invitación por email:
   - Verificar email no es de un miembro existente del hogar
5. Generar token criptográfico (64 chars, crypto.randomBytes)
6. Crear registro en invitations (expires_at = now + 24h)
7. IF invitación por email:
   - Enviar email con enlace de invitación (Edge Function)
8. Retornar invitación con enlace/token
```

## Flujo 6: Aceptar Invitación

```
1. Buscar invitación por token
2. Validaciones:
   a. Invitación existe
   b. accepted_at IS NULL (no usada)
   c. revoked_at IS NULL (no revocada)
   d. expires_at > now() (no expirada)
   e. Hogar is_active == true
   f. Hogar tiene < 20 miembros
   g. Usuario no es ya miembro del hogar
   h. Usuario tiene < 5 hogares
   i. Usuario tiene email verificado
3. IF todas las validaciones pasan:
   a. Crear registro en home_members con rol de la invitación
   b. Marcar invitación como accepted_at = now()
   c. Crear entrada en activity_entries ('member', 'joined')
   d. Notificar a todos los miembros del hogar (excepto al nuevo)
   e. IF rol es 'admin': marcar flag "must_setup_mfa" para próximo login
   f. Retornar hogar con datos
4. IF alguna validación falla:
   - Retornar error específico (invitación expirada, hogar lleno, etc.)
```

## Flujo 7: Gestionar Miembros

### Cambiar Rol
```
1. Verificar permisos del usuario actual:
   - Owner puede cambiar cualquier rol (excepto su propio ownership via este flujo)
   - Admin puede cambiar member↔guest solamente
2. Validar nueva asignación:
   - No se puede degradar al owner
   - No se puede promover a owner (usar transferencia)
   - Admin no puede promover a admin ni degradar a otros admins
3. Actualizar rol en home_members
4. IF nuevo rol es 'admin':
   - Marcar flag "must_setup_mfa"
5. Crear entrada en activity_entries
6. Notificar al usuario afectado
```

### Eliminar Miembro
```
1. Verificar permisos:
   - Owner puede eliminar a cualquiera excepto a sí mismo
   - Admin puede eliminar members y guests, no otros admins
2. No se puede eliminar al owner (debe transferir primero)
3. Eliminar registro de home_members
4. Crear entrada en activity_entries ('member', 'removed')
5. Notificar al usuario eliminado
6. IF usuario eliminado tenía este hogar como activo:
   - Cambiar su hogar activo al siguiente disponible (o ninguno)
```

### Transferir Ownership
```
1. Verificar usuario actual es owner
2. Verificar nuevo owner es miembro del hogar
3. Cambiar rol del owner actual a 'admin'
4. Cambiar rol del nuevo owner a 'owner'
5. IF nuevo owner no tiene MFA: marcar flag "must_setup_mfa"
6. Crear entrada en activity_entries ('home', 'ownership_transferred')
7. Notificar a todos los miembros
```

## Flujo 8: PowerSync Inicialización

```
1. Al login exitoso:
   a. Obtener userId y homeId activo
   b. Conectar PowerSync con credenciales de Supabase
   c. Configurar sync rules:
      - Tabla profiles: solo el perfil propio
      - Tabla homes: hogares donde user es miembro
      - Tabla home_members: miembros de hogares del user
      - Tabla invitations: invitaciones de hogares donde user es admin/owner
      - Tablas futuras (tasks, expenses, etc.): se agregan en U2/U3/U4
   d. Iniciar sincronización inicial (download)
   e. Establecer listeners para cambios
2. Al cambiar hogar activo:
   - No se requiere reconectar (todas las tablas ya están synced)
   - Filtrar UI por home_id activo
3. Al detectar desconexión:
   - PowerSync almacena cambios en cola local
   - Mostrar indicador offline en UI
4. Al reconectar:
   - PowerSync sincroniza cola automáticamente
   - Si hay conflictos: presentar modal de resolución
```

## Flujo 9: Feed de Actividad

```
1. Al abrir feed:
   a. Consultar activity_entries WHERE home_id = activeHomeId ORDER BY created_at DESC LIMIT 50
   b. Marcar notificaciones in-app como leídas
   c. Resetear badge counter
2. Al crear nueva actividad:
   a. Insertar en activity_entries
   b. Incrementar badge de todos los miembros del hogar (excepto autor)
   c. IF push habilitado para categoría: enviar push a miembros
3. Paginación:
   - Cursor-based (created_at del último item visible)
   - Cargar 50 items más al hacer scroll
```

## Propiedades Testables (PBT-01)

### Round-trip Properties
- Token de invitación: encode(data) → decode(token) = data original
- Serialización de preferencias de notificación: serialize → deserialize = identity

### Invariant Properties
- Un hogar siempre tiene exactamente un owner
- Un usuario nunca pertenece a más de 5 hogares activos
- Un hogar activo nunca tiene más de 20 miembros
- Una invitación aceptada/revocada no puede cambiar de estado
- El badge count nunca es negativo

### Idempotency Properties
- Marcar notificaciones como leídas es idempotente
- Aceptar una invitación ya aceptada retorna éxito sin crear duplicados
- Registrar un dispositivo con el mismo push_token actualiza en lugar de duplicar
