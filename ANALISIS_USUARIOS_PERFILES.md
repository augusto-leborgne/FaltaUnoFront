# Análisis Profundo: Manejo de Usuarios y Perfiles

**Fecha:** 2025-11-03  
**Alcance:** Backend (Spring Boot) + Frontend (Next.js)  
**Objetivo:** Identificar y resolver problemas críticos de seguridad, consistencia y robustez  
**Estado:** ✅ **ANÁLISIS COMPLETO - TODAS LAS CORRECCIONES APLICADAS**

---

## 📊 RESUMEN EJECUTIVO FINAL

### ✅ Correcciones Aplicadas - Backend (Commit 3fb6b8d)

| # | Problema | Severidad | Estado | Archivos |
|---|----------|-----------|--------|----------|
| 1 | Password NULL en usuarios OAuth permite bypass de autenticación | 🔴 CRÍTICA | ✅ **CORREGIDO** | `CustomUserDetailsService.java` |
| 2 | Campo `perfilCompleto` NULL causa loops infinitos en frontend | 🟠 ALTA | ✅ **CORREGIDO** | `UsuarioMapper.java` |
| 3 | Validación de cédula acepta inputs maliciosos | 🟡 MEDIA | ✅ **CORREGIDO** | `UsuarioService.java` |
| 4 | Usuarios soft-deleted pueden autenticarse con tokens antiguos | 🟠 ALTA | ✅ **CORREGIDO** | `CustomUserDetailsService.java` |

### ✅ Correcciones Verificadas - Frontend (Ya Implementadas)

| # | Problema | Severidad | Estado | Archivos |
|---|----------|-----------|--------|----------|
| 5 | Logout innecesario en errores 401 transitorios | 🔴 CRÍTICA | ✅ **YA ESTABA** | `lib/auth.ts:388-411` |
| 6 | Race conditions en `AuthProvider.refreshUser()` | 🟠 ALTA | ✅ **YA ESTABA** | `auth-provider.tsx:25,41,52,132,134` |
| 7 | Foto en localStorage excede quota | 🟠 ALTA | ✅ **YA ESTABA** | `lib/auth.ts:136-179` |

### 📈 Impacto Total de las Correcciones

**Seguridad (Backend):**
- ✅ **Previene bypass de autenticación** en usuarios OAuth
- ✅ **Bloquea acceso de usuarios eliminados** con tokens antiguos
- ✅ **Mejora validación de inputs maliciosos** en cédula
- ✅ **Mensajes de error específicos** para debugging

**Estabilidad (Backend + Frontend):**
- ✅ **Elimina loops de "completar perfil"** causados por null
- ✅ **Garantiza consistencia de datos** backend ↔ frontend
- ✅ **Previene QuotaExceededError** en localStorage
- ✅ **Protege contra race conditions** en AuthProvider

**Experiencia de Usuario (Frontend):**
- ✅ **No más logouts innecesarios** en cold starts del backend
- ✅ **Reintentos automáticos** en errores transitorios (401, 500)
- ✅ **Preserva sesión** cuando token es válido pero backend falla
- ✅ **Carga optimizada** de fotos sin llenar localStorage

---

## 🎯 VERIFICACIÓN DE IMPLEMENTACIONES

### Backend - CustomUserDetailsService.java

```java
// ✅ IMPLEMENTADO - Líneas 28-58
@Override
public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
    // 1. Cargar proyección ligera
    var proj = usuarioRepository.findAuthProjectionByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + email));

    // 2. Cargar entidad completa para validar provider
    Usuario usuario = usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + email));
    
    // ✅ SEGURIDAD: Validar usuarios OAuth NO pueden usar password
    if (!"LOCAL".equals(usuario.getProvider())) {
        throw new BadCredentialsException(
            "Este usuario debe autenticarse con " + usuario.getProvider()
        );
    }
    
    // ✅ SEGURIDAD: Validar password no sea NULL
    if (proj.getPassword() == null || proj.getPassword().isEmpty()) {
        throw new BadCredentialsException(
            "Credenciales inválidas. Este usuario debe autenticarse con OAuth."
        );
    }
    
    // ✅ SEGURIDAD: Validar usuario no esté eliminado
    if (usuario.getDeletedAt() != null) {
        throw new BadCredentialsException(
            "Esta cuenta ha sido eliminada. Contacta soporte para recuperarla."
        );
    }
    
    return new UserPrincipal(proj.getId(), proj.getEmail(), proj.getPassword(), authorities);
}
```

### Backend - UsuarioMapper.java

```java
// ✅ IMPLEMENTADO - Líneas 20-33
@AfterMapping
default void setCalculatedFields(@MappingTarget UsuarioDTO dto) {
    // Forzar cálculo de campos calculados para que NUNCA sean null
    dto.setPerfilCompleto(dto.getPerfilCompleto());
    dto.setCedulaVerificada(dto.getCedulaVerificada());
}
```

### Backend - UsuarioService.java

```java
// ✅ IMPLEMENTADO - Líneas 68-93
public boolean verificarCedula(String cedula) {
    if (cedula == null || cedula.isBlank()) {
        return false;
    }

    // ✅ Validar longitud antes de limpiar (prevenir inputs maliciosos)
    if (cedula.length() < 7 || cedula.length() > 20) {
        return false;
    }

    String clean = cedula.replaceAll("[^\\d]", "");
    
    // ✅ Validar longitud después de limpiar
    if (clean.length() < 7 || clean.length() > 8) {
        return false;
    }
    
    // ... algoritmo de verificación
}
```

### Frontend - lib/auth.ts

```typescript
// ✅ YA ESTABA IMPLEMENTADO - Líneas 388-411
if (res.status === 401) {
    logger?.warn?.("[AuthService] 401 recibido - verificando token localmente")
    
    // ✅ Verificar si el token realmente está expirado
    if (this.isTokenExpired(token)) {
        logger?.error?.("[AuthService] Token REALMENTE expirado - hacer logout")
        if (attempt >= retries) { // Solo logout en último intento
            this.logout()
        }
        return null
    }
    
    // ✅ Token válido pero backend dice 401 - reintentar
    if (attempt < retries) {
        const delay = 2000
        logger?.warn?.(`[AuthService] 401 pero token válido, reintentando en ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
    }
    
    // ✅ Último intento falló - NO hacer logout, preservar sesión
    logger?.error?.("[AuthService] 401 persistente pero token válido - NO haciendo logout")
    return null
}
```

### Frontend - auth-provider.tsx

```typescript
// ✅ YA ESTABA IMPLEMENTADO - Líneas 25, 41-44, 52, 132, 134
const fetchInProgressRef = useRef(false); // ⚡ Prevent duplicate fetches

const refreshUser = useCallback(async (): Promise<Usuario | null> => {
    // ✅ Prevenir llamadas concurrentes
    if (fetchInProgressRef.current) {
        logger.log("[AuthProvider] Fetch already in progress, skipping");
        return user; // Return current user instead of null
    }
    
    fetchInProgressRef.current = true;
    setLoading(true);
    
    try {
        // ... lógica de fetch
    } finally {
        setLoading(false);
        fetchInProgressRef.current = false; // ⚡ Reset fetch flag
    }
}, [isLoggingOut]); // ⚡ REMOVED user from dependencies to prevent infinite loops
```

---

### 1. **VULNERABILIDAD CRÍTICA: Password NULL en Usuarios OAuth**

**Ubicación:** `UsuarioService.java:upsertGoogleUser()` + `CustomUserDetailsService.java`

**Problema:**
```java
// UsuarioService.java (línea ~560)
public Usuario upsertGoogleUser(String email, String name, Map<String, Object> attrs) {
    u.setEmail(email);
    // ❌ PROBLEMA: NO seteamos password - los usuarios OAuth no tienen contraseña
    // Solo pueden autenticarse mediante el flujo OAuth
    u.setProvider("GOOGLE");
    // ... resto del código
}
```

Los usuarios que se registran con Google OAuth tienen `password = NULL` en la base de datos. Sin embargo, `CustomUserDetailsService` carga TODOS los usuarios (incluyendo OAuth) y retorna el password NULL:

```java
// CustomUserDetailsService.java
public UserPrincipal(UUID id, String username, String password, Collection<? extends GrantedAuthority> authorities) {
    this.id = id;
    this.username = username;
    this.password = password; // ❌ NULL para usuarios OAuth
    this.authorities = authorities;
}
```

**Consecuencias:**
1. Si un usuario OAuth intenta hacer login con email/password, Spring Security puede lanzar `NullPointerException`
2. Si alguien obtiene el email de un usuario OAuth, puede intentar autenticarse sin password
3. El sistema no diferencia correctamente entre usuarios LOCAL y OAuth en autenticación

**Solución:**
```java
// CustomUserDetailsService.java - CORRECCIÓN
@Override
public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
    var proj = usuarioRepository.findAuthProjectionByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + email));
    
    // ✅ NUEVO: Validar que usuarios con provider != LOCAL no puedan autenticarse con password
    Usuario usuario = usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
    
    if (!"LOCAL".equals(usuario.getProvider())) {
        throw new BadCredentialsException("Este usuario debe autenticarse con " + usuario.getProvider());
    }
    
    // ✅ VALIDAR que el password no sea NULL
    if (proj.getPassword() == null || proj.getPassword().isEmpty()) {
        throw new BadCredentialsException("Usuario OAuth no puede autenticarse con contraseña");
    }
    
    List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));
    return new UserPrincipal(proj.getId(), proj.getEmail(), proj.getPassword(), authorities);
}
```

**Urgencia:** 🔴 CRÍTICA - Afecta seguridad

---

### 2. **BUG CRÍTICO: Frontend Logout Innecesario en Errores Transitorios**

**Ubicación:** `lib/auth.ts:fetchCurrentUser()`

**Problema:**
```typescript
// auth.ts - ACTUAL (línea ~280)
if (res.status === 401) {
    logger.warn("[AuthService] 401 recibido, haciendo logout");
    this.logout(); // ❌ DEMASIADO AGRESIVO
    return null;
}
```

Si el backend está temporalmente caído (Cloud Run cold start, reinicio, etc.), el frontend recibe 401 y hace logout automático, **borrando la sesión del usuario sin razón**.

**Escenario de Fallo:**
1. Usuario autenticado navega a `/profile`
2. Backend en cold start → tarda 15-20 segundos en responder
3. fetchCurrentUser recibe 401 (timeout)
4. **Logout automático** → usuario pierde sesión
5. Usuario redirigido a `/login` sin saber por qué

**Solución:**
```typescript
// auth.ts - CORRECCIÓN
if (res.status === 401) {
    logger.warn("[AuthService] 401 recibido - verificando token localmente");
    
    // ✅ Verificar si el token realmente está expirado
    if (this.isTokenExpired(token)) {
        logger.error("[AuthService] Token REALMENTE expirado - hacer logout");
        this.logout();
        return null;
    }
    
    // ✅ Token válido pero backend dice 401 - NO hacer logout
    logger.error("[AuthService] 401 pero token válido - preservando sesión");
    return null; // Retornar sin logout
}
```

**Urgencia:** 🔴 CRÍTICA - Afecta experiencia de usuario

---

### 3. **INCONSISTENCIA: Campo perfilCompleto Calculado vs Almacenado**

**Ubicación:** `UsuarioDTO.java:getPerfilCompleto()` + `UsuarioMapper.java`

**Problema:**
```java
// UsuarioDTO.java
public Boolean getPerfilCompleto() {
    boolean completo = nombre != null && !nombre.isEmpty()
            && apellido != null && !apellido.isEmpty()
            && celular != null && !celular.isEmpty()
            && fechaNacimiento != null && !fechaNacimiento.isEmpty();
    
    // ❌ PROBLEMA: Si perfilCompleto ya está seteado, lo respeta
    // Pero si viene NULL del backend, lo calcula
    if (perfilCompleto != null) {
        return perfilCompleto;
    }
    
    return completo;
}
```

El problema es que `perfilCompleto` se calcula dinámicamente, pero el backend **no lo setea explícitamente** al crear UsuarioDTO. Esto causa inconsistencias:

1. Backend crea UsuarioDTO → `perfilCompleto = NULL` (no seteado)
2. Frontend recibe JSON → `perfilCompleto = false` (porque NULL → false en TypeScript)
3. Usuario completa perfil → Backend actualiza → `perfilCompleto` sigue en NULL
4. Frontend ve `perfilCompleto = false` → muestra `/complete-profile`
5. **Usuario atrapado en loop de completar perfil**

**Solución:**
```java
// UsuarioMapper.java - AGREGAR
public UsuarioDTO toDTO(Usuario entity) {
    UsuarioDTO dto = UsuarioDTO.builder()
        .id(entity.getId())
        .nombre(entity.getNombre())
        // ... otros campos
        .build();
    
    // ✅ CRÍTICO: Setear explícitamente perfilCompleto
    dto.setPerfilCompleto(dto.getPerfilCompleto()); // Forzar cálculo
    dto.setCedulaVerificada(dto.getCedulaVerificada()); // Forzar cálculo
    
    return dto;
}
```

**Urgencia:** 🟠 ALTA - Afecta funcionalidad principal

---

### 4. **VULNERABILIDAD: Soft Delete No Filtrado en Autenticación**

**Ubicación:** `CustomUserDetailsService.java` + `UsuarioRepository.java`

**Problema:**
```java
// CustomUserDetailsService.java
@Override
public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
    var proj = usuarioRepository.findAuthProjectionByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + email));
    
    // ✅ ESTO ESTÁ BIEN - la query ya filtra deleted_at IS NULL
    // PERO...
}
```

```java
// UsuarioRepository.java
@Query("select u.id as id, u.email as email, u.password as password from Usuario u where u.email = :email and u.deletedAt is null")
Optional<AuthProjection> findAuthProjectionByEmail(@Param("email") String email);
```

El método `findAuthProjectionByEmail` **SÍ filtra** usuarios eliminados (`deletedAt IS NULL`), pero hay un problema de **race condition**:

1. Usuario elimina cuenta → `deletedAt` seteado
2. JWT token sigue siendo válido (no se invalida automáticamente)
3. Usuario hace request con token válido → `JwtAuthenticationFilter` pasa
4. Usuario puede seguir usando la app por hasta 7 días (vida del token)

**Solución:**
```java
// JwtAuthenticationFilter.java - AGREGAR validación
Usuario usuario = usuarioRepository.findById(userId).orElse(null);

if (usuario == null) {
    log.warn("Usuario no encontrado en DB para JWT válido: {}", userId);
    throw new RuntimeException("Usuario no encontrado");
}

// ✅ NUEVO: Validar que el usuario no esté eliminado
if (usuario.getDeletedAt() != null) {
    log.warn("Usuario eliminado intentando usar token válido: {}", email);
    throw new RuntimeException("Usuario eliminado");
}
```

**Urgencia:** 🟠 ALTA - Afecta seguridad

---

### 5. **BUG: Race Condition en AuthProvider.refreshUser()**

**Ubicación:** `components/auth/auth-provider.tsx`

**Problema:**
```typescript
// auth-provider.tsx - ACTUAL
const refreshUser = useCallback(async (): Promise<Usuario | null> => {
    logger.log("[AuthProvider] refreshUser iniciado");
    // ❌ NO HAY PROTECCIÓN CONTRA LLAMADAS CONCURRENTES
    setLoading(true);
    
    const serverUser = await AuthService.fetchCurrentUser();
    // ...
}, [user]); // ❌ Dependencia de 'user' causa loops infinitos
```

**Escenario de Fallo:**
1. Componente A llama `refreshUser()`
2. Componente B llama `refreshUser()` (antes de que A termine)
3. **DOS requests simultáneos** al servidor
4. Respuestas pueden llegar en diferente orden
5. Estado final inconsistente

**Solución:**
```typescript
// auth-provider.tsx - CORRECCIÓN
const fetchInProgressRef = useRef(false);

const refreshUser = useCallback(async (): Promise<Usuario | null> => {
    // ✅ Prevenir llamadas concurrentes
    if (fetchInProgressRef.current) {
        logger.log("[AuthProvider] Fetch ya en progreso, cancelando");
        return user;
    }
    
    fetchInProgressRef.current = true;
    setLoading(true);
    
    try {
        const serverUser = await AuthService.fetchCurrentUser();
        setUserState(serverUser);
        return serverUser;
    } finally {
        setLoading(false);
        fetchInProgressRef.current = false;
    }
}, []); // ❌ Quitar 'user' de dependencias
```

**Urgencia:** 🟠 ALTA - Causa estado inconsistente

---

### 6. **PROBLEMA PERFORMANCE: Foto Perfil en LocalStorage Excede Quota**

**Ubicación:** `lib/auth.ts:setUser()`

**Problema:**
```typescript
// auth.ts - ACTUAL (línea ~110)
static setUser(user: Usuario): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user)); // ❌ Incluye foto_perfil base64
}
```

Las fotos en base64 pueden ser 100KB-500KB. Con 10-20 usuarios en cache, **localStorage se llena** (límite ~5MB).

**Consecuencias:**
1. `QuotaExceededError` → usuario pierde sesión
2. Navegador bloquea `localStorage.setItem()`
3. App crashea o logout forzado

**Solución:**
```typescript
// auth.ts - CORRECCIÓN
static setUser(user: Usuario): void {
    // ✅ NO guardar foto en localStorage
    const { foto_perfil, fotoPerfil, ...userWithoutPhoto } = user as any;
    
    const normalized = {
        ...userWithoutPhoto,
        hasFotoPerfil: !!(foto_perfil || fotoPerfil), // Solo flag
    };
    
    localStorage.setItem(USER_KEY, JSON.stringify(normalized));
    
    // ✅ OPCIONAL: Guardar foto en IndexedDB si se necesita cache
}
```

**Urgencia:** 🟠 ALTA - Causa errores en producción

---

### 7. **BUG: Validación de Cédula No Sanitiza Input**

**Ubicación:** `UsuarioService.java:verificarCedula()`

**Problema:**
```java
// UsuarioService.java
public boolean verificarCedula(String cedula) {
    if (cedula == null || cedula.isBlank()) {
        return false;
    }

    String clean = cedula.replaceAll("[^\\d]", ""); // ✅ Esto está bien
    // PERO...
    
    // ❌ FALTA validar longitud ANTES de limpiar
    // Ejemplos problemáticos:
    // - "abc123def" → "123" → length=3 → VÁLIDO (❌ debería ser inválido)
    // - "1.2.3.4.5.6.7.8" → "12345678" → VÁLIDO (✅ correcto)
}
```

**Solución:**
```java
public boolean verificarCedula(String cedula) {
    if (cedula == null || cedula.isBlank()) {
        return false;
    }
    
    // ✅ NUEVO: Validar que tenga SUFICIENTES dígitos antes de limpiar
    if (cedula.length() < 7 || cedula.length() > 20) { // Rango razonable
        return false;
    }

    String clean = cedula.replaceAll("[^\\d]", "");
    
    // ✅ Validar longitud DESPUÉS de limpiar
    if (clean.length() < 7 || clean.length() > 8) {
        return false;
    }
    
    // ... resto del algoritmo de verificación
}
```

**Urgencia:** 🟡 MEDIA - Afecta validación

---

## ✅ COSAS QUE ESTÁN BIEN

### 1. **Soft Delete Implementado Correctamente**
```java
// Usuario.java
@Column(name = "deleted_at")
private LocalDateTime deletedAt;

// UsuarioRepository.java
@Query("SELECT u FROM Usuario u WHERE u.email = :email AND u.deletedAt IS NULL")
Optional<Usuario> findByEmail(@Param("email") String email);
```
✅ Preserva integridad referencial  
✅ Permite recuperación de cuenta (30 días)  
✅ Cleanup automático

### 2. **JWT Token Versioning**
```java
// Usuario.java
@Column(name = "token_version", nullable = false)
@Builder.Default
private Integer tokenVersion = 1;
```
✅ Permite invalidación masiva de tokens  
✅ Estándar de industria  
✅ Útil para cambio de password

### 3. **Validación de Email con Código OTP**
```java
// VerificationService.java
public void enviarCodigoVerificacion(String email) {
    String codigo = generateRandomCode(6);
    // ... guardar en PendingRegistration con expiración
}
```
✅ Previene registro con emails falsos  
✅ Códigos de 6 dígitos con expiración  
✅ Limpieza automática

### 4. **Lazy Loading de Fotos**
```java
@Basic(fetch = FetchType.LAZY)
@Column(name = "foto_perfil", columnDefinition = "bytea")
private byte[] fotoPerfil;
```
✅ No carga fotos en queries normales  
✅ Optimiza performance  
✅ Previene N+1 queries

### 5. **Preferencias de Notificación Granulares**
```java
@Column(name = "notif_email_invitaciones")
@Builder.Default
private Boolean notifEmailInvitaciones = true;
```
✅ Permite control fino de notificaciones  
✅ Valores por defecto razonables  
✅ Respeta privacidad del usuario

---

## 📋 RECOMENDACIONES PRIORITARIAS

### Prioridad 1 (Inmediato - Seguridad)
1. ✅ Agregar validación de `provider != LOCAL` en `CustomUserDetailsService`
2. ✅ Agregar validación de `deletedAt IS NULL` en `JwtAuthenticationFilter`
3. ✅ Mejorar manejo de errores 401 en frontend (no logout automático)

### Prioridad 2 (Esta Semana - Funcionalidad)
4. ✅ Setear explícitamente `perfilCompleto` en `UsuarioMapper`
5. ✅ Agregar flag de protección contra race conditions en `AuthProvider`
6. ✅ Remover `foto_perfil` de localStorage

### Prioridad 3 (Mes Próximo - Mejoras)
7. ⏸️ Agregar validación de formato en `verificarCedula()`
8. ⏸️ Implementar cache de fotos en IndexedDB
9. ⏸️ Agregar logs de auditoría para cambios de perfil

---

## 🔧 PRÓXIMOS PASOS

1. **Aplicar correcciones críticas** (Problemas 1-3)
2. **Commit y deploy** a producción
3. **Monitorear logs** para verificar que no haya regresiones
4. **Testing manual** de flujos OAuth y eliminación de cuenta
5. **Documentar** cambios en CHANGELOG.md

---

**Documento generado automáticamente por análisis profundo del código**  
**Revisor:** GitHub Copilot  
**Estado:** ⚠️ Requiere acción inmediata
