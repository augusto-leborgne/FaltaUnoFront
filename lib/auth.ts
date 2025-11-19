// lib/auth.ts — versión robusta y lista para prod
import { normalizeUrl, API_BASE } from "./api"
import { keysToCamelCase } from "./case-converter"
import { logger } from "./logger"
import { fetchWithTimeout } from "./fetch-with-timeout"
import type { Usuario } from "./api"

const TOKEN_KEY = "authToken"
const USER_KEY = "user"

function safeJSONParse<T = unknown>(str: string | null): T | null {
  if (!str) return null
  try {
    return JSON.parse(str) as T
  } catch {
    return null
  }
}

export class AuthService {
  // =========================
  // TOKEN MANAGEMENT
  // =========================

  static setToken(token: string): void {
    if (typeof window === "undefined") return
    try {
      const val = token && token !== "undefined" && token !== "null" ? token : ""
      localStorage.setItem(TOKEN_KEY, val)
      // cookie auxiliar (middleware / fetch server-side)
      document.cookie = `authToken=${val}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
      logger?.debug?.("[AuthService] Token guardado")
    } catch (error) {
      logger?.error?.("[AuthService] Error guardando token:", error)
    }
  }

  static getToken(): string | null {
    if (typeof window === "undefined") return null
    try {
      // ⚡ PRIORIDAD 1: Leer de localStorage
      let token = localStorage.getItem(TOKEN_KEY)
      if (!token || token === "undefined" || token === "null") {
        // ⚡ FALLBACK: Leer de cookie si localStorage está vacío
        token = this.getTokenFromCookie()
        if (token) {
          // Sincronizar cookie → localStorage
          localStorage.setItem(TOKEN_KEY, token)
          logger?.debug?.("[AuthService] Token restaurado desde cookie")
        }
      }
      
      if (!token) return null
      
      // ⚡ VALIDACIÓN: Verificar que el token no esté corrupto
      if (this.isTokenCorrupted(token)) {
        logger?.warn?.("[AuthService] Token corrupto detectado, limpiando...")
        this.removeToken()
        return null
      }
      
      return token
    } catch (error) {
      logger?.error?.("[AuthService] Error obteniendo token:", error)
      return null
    }
  }

  /**
   * Lee el token desde la cookie authToken (fallback si localStorage falla)
   */
  private static getTokenFromCookie(): string | null {
    if (typeof document === "undefined") return null
    try {
      const cookies = document.cookie.split(";")
      for (const cookie of cookies) {
        const [key, value] = cookie.trim().split("=")
        if (key === TOKEN_KEY && value && value !== "undefined" && value !== "null") {
          return value
        }
      }
      return null
    } catch (error) {
      logger?.error?.("[AuthService] Error leyendo cookie:", error)
      return null
    }
  }

  /**
   * Detecta si un token está corrupto (formato inválido, caracteres extraños, etc.)
   */
  static isTokenCorrupted(token: string): boolean {
    try {
      // Validar formato básico de JWT (3 partes separadas por .)
      const parts = token.split(".")
      if (parts.length !== 3) return true
      
      // Validar que cada parte sea base64 válido
      for (const part of parts) {
        if (!part || !/^[A-Za-z0-9_-]+$/.test(part)) return true
      }
      
      // Intentar decodificar el payload
      JSON.parse(atob(parts[1]))
      
      return false
    } catch {
      return true
    }
  }

  static removeToken(): void {
    if (typeof window === "undefined") return
    try {
      localStorage.removeItem(TOKEN_KEY)
      document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      logger?.debug?.("[AuthService] Token eliminado")
    } catch (error) {
      logger?.error?.("[AuthService] Error eliminando token:", error)
    }
  }

  /**
   * Espera un tick antes de leer el token para evitar condiciones de carrera
   * al volver de otra pantalla (hidratación Next).
   */
  static async ensureToken(delayMs = 100): Promise<string | null> {
    await new Promise((r) => setTimeout(r, delayMs))
    return this.getToken()
  }

  // =========================
  // USER MANAGEMENT
  // =========================

  static setUser(user: Usuario): void {
    if (typeof window === "undefined") return
    try {
      // ⚡ CRÍTICO: NO guardar foto_perfil en localStorage (puede exceder quota)
      // La foto se carga desde el servidor cuando se necesita
      const { foto_perfil, fotoPerfil, ...userWithoutPhoto } = user as any
      
      // ⚡ CRÍTICO: Preservar TODOS los campos importantes del perfil
      const normalized = {
        ...userWithoutPhoto,
        // Guardar solo un flag indicando si tiene foto
        hasFotoPerfil: !!(foto_perfil || fotoPerfil),
        // ⚡ NUEVO: Asegurar que perfilCompleto esté definido
        perfilCompleto: user.perfilCompleto ?? true, // Default a true si no está definido
        cedulaVerificada: user.cedulaVerificada ?? false, // Default a false
      }
      // timestamp para soportar una "grace window" tras actualizaciones optimistas
      ;(normalized as any).userLastUpdatedAt = Date.now()
      
      localStorage.setItem(USER_KEY, JSON.stringify(normalized))
      logger?.debug?.("[AuthService] Usuario guardado (sin foto):", normalized?.email)
      logger?.debug?.("[AuthService] Perfil completo:", normalized.perfilCompleto)
      
      // ⚡ OPCIONAL: Guardar foto en IndexedDB si existe (mejor para datos grandes)
      // Por ahora simplemente no la guardamos - se cargará del servidor cuando se necesite
      
      window.dispatchEvent(new CustomEvent("userUpdated", { detail: user })) // Dispatch con foto completa
    } catch (error) {
      logger?.error?.("[AuthService] Error guardando usuario:", error)
      
      // ⚡ RECUPERACIÓN: Si falla por quota, intentar limpiar y reintentar
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        logger?.warn?.("[AuthService] localStorage lleno, limpiando datos antiguos...")
        try {
          // Limpiar datos de cache antiguos
          const keys = Object.keys(localStorage)
          for (const k of keys) {
            if (k.startsWith("match_") || k.startsWith("cache_") || k.startsWith("old_")) {
              localStorage.removeItem(k)
            }
          }
          
          // Reintentar sin foto
          const { foto_perfil, fotoPerfil, ...userWithoutPhoto } = user as any
          localStorage.setItem(USER_KEY, JSON.stringify(userWithoutPhoto))
          logger?.debug?.("[AuthService] Usuario guardado después de limpieza")
        } catch (retryError) {
          logger?.error?.("[AuthService] Error en reintento:", retryError)
        }
      }
    }
  }

  static getUser(): Usuario | null {
    if (typeof window === "undefined") return null
    try {
      const stored = localStorage.getItem(USER_KEY)
      const user = safeJSONParse<any>(stored)
      if (!user) return null
      
      // El usuario del localStorage NO tiene foto_perfil
      // La foto se carga desde el servidor con fetchCurrentUser()
      return user
    } catch (error) {
      logger?.error?.("[AuthService] Error parseando usuario:", error)
      return null
    }
  }

  static removeUser(): void {
    if (typeof window === "undefined") return
    try {
      localStorage.removeItem(USER_KEY)
      logger?.debug?.("[AuthService] Usuario eliminado")
      window.dispatchEvent(new CustomEvent("userLoggedOut"))
    } catch (error) {
      logger?.error?.("[AuthService] Error eliminando usuario:", error)
    }
  }

  // =========================
  // SESSION
  // =========================

  static logout(): void {
    logger?.debug?.("[AuthService] Logout iniciado")
    
    // Marcar flag de logout para prevenir reinicios automáticos
    if (typeof window !== "undefined") {
      sessionStorage.setItem("isLoggingOut", "true")
    }
    
    this.removeToken()
    this.removeUser()
    
    if (typeof window !== "undefined") {
      try {
        // ⚡ CRÍTICO: Limpieza COMPLETA de todo el storage
        localStorage.clear()
        sessionStorage.clear()
        
        // Volver a setear solo el flag de logout
        sessionStorage.setItem("isLoggingOut", "true")
        
        logger?.debug?.("[AuthService] Storage completamente limpiado")
      } catch (e) {
        logger?.error?.("[AuthService] Error limpiando storage:", e)
      }
      
      // Disparar evento para que otros componentes sepan del logout
      window.dispatchEvent(new CustomEvent("userLoggedOut"))
    }
    
    logger?.debug?.("[AuthService] Logout completado, storage limpiado")
    
    if (typeof window !== "undefined") {
      // INMEDIATO: Usar replace para evitar que el usuario use "back"
      // Agregar timestamp para evitar cache del navegador
      window.location.replace("/login?t=" + Date.now())
    }
  }

  static isLoggedIn(): boolean {
    const token = this.getToken()
    if (!token) return false
    if (this.isTokenExpired(token)) {
      logger?.debug?.("[AuthService] Token expirado, limpiando sesión")
      this.logout()
      return false
    }
    return true
  }

  // =========================
  // TOKEN VALIDATION
  // =========================

  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split(".")[1] || ""))
      const expMs = (payload?.exp ?? 0) * 1000
      return !expMs || Date.now() >= expMs
    } catch (error) {
      logger?.error?.("[AuthService] Error verificando token:", error)
      return true
    }
  }

  static validateAndCleanup(): void {
    const token = this.getToken()
    if (!token) {
      this.removeUser()
      return
    }
    if (this.isTokenExpired(token)) {
      logger?.debug?.("[AuthService] Token expirado, limpiando")
      this.logout()
      return
    }
    
    // ⚡ NUEVO: Limpiar localStorage si está cerca del límite
    try {
      // Intentar detectar si localStorage está lleno
      const usage = this.estimateLocalStorageUsage()
      if (usage > 0.8) { // Si está al 80% o más
        logger?.warn?.("[AuthService] localStorage al", Math.round(usage * 100) + "%, limpiando cache...")
        this.cleanupOldCache()
      }
    } catch (error) {
      logger?.error?.("[AuthService] Error verificando localStorage:", error)
    }
  }
  
  /**
   * Estima el porcentaje de uso de localStorage (0.0 a 1.0)
   */
  private static estimateLocalStorageUsage(): number {
    try {
      let total = 0
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          const value = localStorage.getItem(key) || ""
          total += key.length + value.length
        }
      }
      // Estimar límite de 5MB (5 * 1024 * 1024 chars)
      const limit = 5 * 1024 * 1024
      return total / limit
    } catch {
      return 0
    }
  }
  
  /**
   * Limpia cache antiguo de localStorage
   */
  private static cleanupOldCache(): void {
    try {
      const keys = Object.keys(localStorage)
      let cleaned = 0
      
      for (const key of keys) {
        // Limpiar datos de cache, matches viejos, etc
        if (
          key.startsWith("match_") ||
          key.startsWith("cache_") ||
          key.startsWith("old_") ||
          key.startsWith("temp_") ||
          key === "chakra-ui-color-mode" || // Si usaste Chakra antes
          key.includes("debug")
        ) {
          localStorage.removeItem(key)
          cleaned++
        }
      }
      
      logger?.debug?.(`[AuthService] Limpieza completada: ${cleaned} items eliminados`)
    } catch (error) {
      logger?.error?.("[AuthService] Error en cleanupOldCache:", error)
    }
  }

  // =========================
  // API HELPERS
  // =========================

  static getAuthHeaders(): Record<string, string> {
    const token = this.getToken()
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
  }

  /**
   * Usa API_BASE normalizado. Si el backend responde 401 → logout.
   * Si responde 404/500 no se hace logout: se asume error transitorio.
   * Incluye reintentos automáticos para manejar errores transitorios.
   */
  static async fetchCurrentUser(retries = 2): Promise<Usuario | null> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const token = await this.ensureToken()
        if (!token) {
          logger?.debug?.("[AuthService] No hay token, no se puede obtener usuario")
          return null
        }
        
        if (this.isTokenExpired(token)) {
          logger?.warn?.("[AuthService] Token expirado, haciendo logout")
          this.logout()
          return null
        }
        
        logger?.debug?.(`[AuthService] Fetching current user (intento ${attempt}/${retries})...`)
        const url = normalizeUrl(`${API_BASE}/api/usuarios/me`)
        
        // ⚡ Usar fetchWithTimeout para prevenir requests colgados
        // Cloud Run cold starts pueden tardar, damos 45s de timeout
        const res = await fetchWithTimeout(url, { 
          headers: this.getAuthHeaders()
        }, 45000) // 45 segundos para cold starts
        
        if (!res.ok) {
          logger?.error?.("[AuthService] fetchCurrentUser status:", res.status)
          
          // ⚡ CRÍTICO: NO hacer logout automático en 401
          // El token puede ser válido pero el servidor está teniendo problemas
          if (res.status === 401) {
            logger?.warn?.("[AuthService] 401 recibido - verificando token localmente")
            
            // Verificar si el token realmente está expirado
            if (this.isTokenExpired(token)) {
              logger?.error?.("[AuthService] Token REALMENTE expirado - hacer logout")
              // Solo en este caso hacemos logout
              if (attempt >= retries) { // Solo logout en último intento
                this.logout()
              }
              return null
            }
            
            // Token válido pero backend dice 401 - reintentar
            if (attempt < retries) {
              const delay = 2000 // Esperar más en caso de 401
              logger?.warn?.(`[AuthService] 401 pero token válido, reintentando en ${delay}ms...`)
              await new Promise(resolve => setTimeout(resolve, delay))
              continue
            }
            
            // Último intento falló - NO hacer logout, preservar sesión
            logger?.error?.("[AuthService] 401 persistente pero token válido - NO haciendo logout")
            return null
          }
          
          // 404 = usuario no encontrado - NO reintentar, es definitivo
          if (res.status === 404) {
            logger?.error?.("[AuthService] 404 Usuario no encontrado")
            return null
          }
          
          // Otros errores (500, 503, etc) → reintentar
          if (attempt < retries && res.status >= 500) {
            const delay = 1000 // Solo 1 segundo de espera
            logger?.warn?.(`[AuthService] Error ${res.status}, reintentando en ${delay}ms...`)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
          
          return null
        }
        
        const json = await res.json()
        const data = json?.data ?? json
        const currentUser = this.getUser()
        
        // Defensive merge: prefer server values when present, but NEVER
        // overwrite valid local fields with empty/null server values.
        const merged: any = {
          // Start from local user to preserve existing fields
          ...(currentUser ?? {}),
          // Then overlay server-provided fields
          ...(data ?? {}),
        }

        // Normalize foto field (server may use fotoPerfil or foto_perfil)
        merged.foto_perfil = data?.foto_perfil ?? data?.fotoPerfil ?? currentUser?.foto_perfil ?? undefined

        // Preserve perfilCompleto unless server explicitly provides a value
        merged.perfilCompleto = (data && Object.prototype.hasOwnProperty.call(data, 'perfilCompleto'))
          ? data.perfilCompleto
          : (currentUser?.perfilCompleto ?? true)

        // Preserve cedulaVerificada unless server provides one
        merged.cedulaVerificada = (data && Object.prototype.hasOwnProperty.call(data, 'cedulaVerificada'))
          ? data.cedulaVerificada
          : (currentUser?.cedulaVerificada ?? false)

        // Preserve nombre/apellido if server returned empty/null values
        merged.nombre = (data && data.nombre) ? data.nombre : currentUser?.nombre ?? merged.nombre
        merged.apellido = (data && data.apellido) ? data.apellido : currentUser?.apellido ?? merged.apellido

        // Preserve/normalize photo flag (server may return explicit hasFotoPerfil)
        merged.hasFotoPerfil = (data && Object.prototype.hasOwnProperty.call(data, 'hasFotoPerfil'))
          ? data.hasFotoPerfil
          : (currentUser?.hasFotoPerfil ?? Boolean(merged.foto_perfil))

        // Remove alias fotoPerfil if present
        delete merged.fotoPerfil

        // Persist merged user
        this.setUser(merged)
        logger?.debug?.("[AuthService] ✅ Usuario actualizado desde servidor (merged):", {
          email: merged.email,
          perfilCompleto: merged.perfilCompleto,
          cedulaVerificada: merged.cedulaVerificada,
        })
        return merged as Usuario
        
      } catch (e) {
        logger?.error?.(`[AuthService] Error en fetchCurrentUser (intento ${attempt}/${retries}):`, e)
        
        // Si es error de timeout o red, solo 1 reintento
        if (attempt < retries && (e instanceof TypeError || (e as any).name === 'AbortError')) {
          const delay = 1000
          logger?.warn?.(`[AuthService] Error de red/timeout, reintentando en ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
        
        // Error final - NO hacer logout, preservar token
        return null
      }
    }
    
    // Si llegamos aquí, todos los reintentos fallaron
    logger?.error?.("[AuthService] Todos los reintentos fallaron para fetchCurrentUser")
    return null
  }

  static async updateProfilePhoto(file: File): Promise<boolean> {
    try {
      const token = await this.ensureToken()
      if (!token) throw new Error("No hay token")
      const form = new FormData()
      form.append("file", file)
      const url = normalizeUrl(`${API_BASE}/api/usuarios/me/foto`)
      const res = await fetchWithTimeout(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      }, 60000) // 60s para subida de foto
      if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`)
      await this.fetchCurrentUser()
      return true
    } catch (e) {
      logger?.error?.("[AuthService] Error actualizando foto:", e)
      return false
    }
  }

  static async updateProfile(data: Partial<Usuario>): Promise<boolean> {
    try {
      // ⚡ CRÍTICO: Filtrar campos undefined/null para evitar borrar datos
      const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          acc[key] = value
        }
        return acc
      }, {} as Record<string, any>)

      logger?.debug?.("[AuthService] Actualizando perfil con:", cleanData)

      const url = normalizeUrl(`${API_BASE}/api/usuarios/me`)
      const res = await fetchWithTimeout(url, {
        method: "PUT",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(cleanData),
      }, 30000) // 30s timeout
      
      if (!res.ok) {
        const errorText = await res.text()
        logger?.error?.("[AuthService] Error actualizando perfil:", res.status, errorText)
        throw new Error(`Error ${res.status}: ${errorText}`)
      }
      
      // Refrescar usuario desde servidor
      await this.fetchCurrentUser()
      return true
    } catch (e) {
      logger?.error?.("[AuthService] Error actualizando perfil:", e)
      return false
    }
  }
}

export default AuthService