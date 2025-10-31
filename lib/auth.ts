// lib/auth.ts — versión robusta y lista para prod
import type { Usuario } from "./api"
import { API_BASE, normalizeUrl } from "./api"
import { logger } from "./logger"

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
      const token = localStorage.getItem(TOKEN_KEY)
      if (!token || token === "undefined" || token === "null") return null
      
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
      const normalized: any = {
        ...user,
        foto_perfil: (user as any).foto_perfil || (user as any).fotoPerfil || undefined,
      }
      delete normalized.fotoPerfil
      localStorage.setItem(USER_KEY, JSON.stringify(normalized))
      logger?.debug?.("[AuthService] Usuario guardado:", normalized?.email)
      window.dispatchEvent(new CustomEvent("userUpdated", { detail: normalized }))
    } catch (error) {
      logger?.error?.("[AuthService] Error guardando usuario:", error)
    }
  }

  static getUser(): Usuario | null {
    if (typeof window === "undefined") return null
    try {
      const stored = localStorage.getItem(USER_KEY)
      const user = safeJSONParse<any>(stored)
      if (!user) return null
      return {
        ...user,
        foto_perfil: user.foto_perfil || user.fotoPerfil || undefined,
      }
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
    this.removeToken()
    this.removeUser()
    if (typeof window !== "undefined") {
      try {
        // Limpieza de llaves auxiliares
        const keys = Object.keys(localStorage)
        for (const k of keys) {
          if (k.startsWith("match_") || k.startsWith("user_")) {
            localStorage.removeItem(k)
          }
        }
      } catch (e) {
        logger?.error?.("[AuthService] Error limpiando storage extra:", e)
      }
    }
    logger?.debug?.("[AuthService] Logout completado")
    if (typeof window !== "undefined") {
      // INMEDIATO: Usar replace para evitar que el usuario use "back"
      window.location.replace("/login")
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
        const res = await fetch(url, { 
          headers: this.getAuthHeaders(),
          // ⚡ Timeout reducido - si el backend tarda demasiado, hay un problema
          signal: AbortSignal.timeout(10000) // 10 segundos
        })
        
        if (!res.ok) {
          logger?.error?.("[AuthService] fetchCurrentUser status:", res.status)
          
          // 401 = token inválido o expirado
          if (res.status === 401) {
            logger?.error?.("[AuthService] 401 Unauthorized - Token inválido")
            // Solo hacer logout si estamos seguros
            if (this.isTokenExpired(token)) {
              logger?.error?.("[AuthService] 🚪 LOGOUT - Token expirado")
              this.logout()
            }
            return null
          }
          
          // 404 = usuario no encontrado - NO reintentar, es definitivo
          if (res.status === 404) {
            logger?.error?.("[AuthService] 404 Usuario no encontrado")
            return null
          }
          
          // Otros errores (500, 503, etc) → solo 1 reintento
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
        const normalized: any = {
          ...data,
          foto_perfil: data?.foto_perfil ?? data?.fotoPerfil ?? undefined,
        }
        delete normalized.fotoPerfil
        this.setUser(normalized)
        logger?.debug?.("[AuthService] ✅ Usuario actualizado desde servidor")
        return normalized as Usuario
        
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
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
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
      const url = normalizeUrl(`${API_BASE}/api/usuarios/me`)
      const res = await fetch(url, {
        method: "PUT",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`)
      await this.fetchCurrentUser()
      return true
    } catch (e) {
      logger?.error?.("[AuthService] Error actualizando perfil:", e)
      return false
    }
  }
}

export default AuthService