import { Usuario } from "./api"
import { jwtDecode } from 'jwt-decode

// ============================================
// CONFIGURACIÓN
// ============================================

const TOKEN_KEY = "authToken";
const USER_KEY = "user";
const TOKEN_REFRESH_THRESHOLD = 5 * 60; // 5 minutos antes de expirar

// ============================================
// INTERFACES
// ============================================

interface JwtPayload {
  sub: string // email
  userId?: string
  exp: number
  iat: number
  roles?: string[]
}

// ============================================
// UTILIDADES
// ============================================

function hasWindow(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function base64UrlDecode(str: string): string {
  // Reemplazar caracteres URL-safe
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  
  // Agregar padding si es necesario
  while (str.length % 4) {
    str += "=";
  }
  
  try {
    return atob(str);
  } catch (e) {
    console.error("[Auth] Error decodificando base64:", e);
    throw new Error("Token inválido");
  }
}

// ============================================
// AUTH SERVICE
// ============================================

export const AuthService = {
  /**
   * Guardar token JWT
   */
  setToken(token: string): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(TOKEN_KEY, token)
      console.log('[AuthService] Token guardado')
    } catch (error) {
      console.error('[AuthService] Error guardando token:', error)
    }
  },

  /**
   * Obtener token JWT
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null
    
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch (error) {
      console.error('[AuthService] Error obteniendo token:', error)
      return null
    }
  },

  /**
   * Guardar datos de usuario
   */
  setUser(user: Usuario): void {
    if (typeof window === 'undefined') return
    
    try {
      // Limpiar password antes de guardar
      const userToSave = { ...user }
      delete (userToSave as any).password
      
      localStorage.setItem(USER_KEY, JSON.stringify(userToSave))
      console.log('[AuthService] Usuario guardado:', user.email)
    } catch (error) {
      console.error('[AuthService] Error guardando usuario:', error)
    }
  },

  /**
   * Obtener datos de usuario
   */
  getUser(): Usuario | null {
    if (typeof window === 'undefined') return null
    
    try {
      const userStr = localStorage.getItem(USER_KEY)
      if (!userStr) return null
      
      return JSON.parse(userStr) as Usuario
    } catch (error) {
      console.error('[AuthService] Error obteniendo usuario:', error)
      return null
    }
  },

  /**
   * Verificar si hay una sesión activa válida
   */
  isAuthenticated(): boolean {
    const token = this.getToken()
    
    if (!token) {
      console.log('[AuthService] No hay token')
      return false
    }
    
    if (this.isTokenExpired(token)) {
      console.log('[AuthService] Token expirado')
      this.logout() // Limpiar sesión expirada
      return false
    }
    
    return true
  },

  /**
   * Verificar si el token está expirado
   */
  isTokenExpired(token: string): boolean {
    try {
      const decoded = jwtDecode<JwtPayload>(token)
      const now = Date.now() / 1000
      
      // Considerar expirado si quedan menos de 60 segundos
      const isExpired = decoded.exp < now + 60
      
      if (isExpired) {
        console.log('[AuthService] Token expira en:', decoded.exp - now, 'segundos')
      }
      
      return isExpired
    } catch (error) {
      console.error('[AuthService] Error decodificando token:', error)
      return true // Si no se puede decodificar, considerar expirado
    }
  },

  /**
   * Decodificar token para obtener información
   */
  decodeToken(token?: string): JwtPayload | null {
    const tokenToUse = token || this.getToken()
    
    if (!tokenToUse) return null
    
    try {
      return jwtDecode<JwtPayload>(tokenToUse)
    } catch (error) {
      console.error('[AuthService] Error decodificando token:', error)
      return null
    }
  },

  /**
   * Cerrar sesión - CORREGIDO para evitar race conditions
   */
  logout(): void {
    if (typeof window === 'undefined') return
    
    console.log('[AuthService] 🚪 Cerrando sesión...')
    
    try {
      // 1. Limpiar localStorage
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      
      // 2. Limpiar cualquier otro dato relacionado
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('faltauno_')) {
          localStorage.removeItem(key)
        }
      })
      
      console.log('[AuthService] ✅ Sesión limpiada')
    } catch (error) {
      console.error('[AuthService] Error limpiando sesión:', error)
    }
  },

  /**
   * Validar y limpiar sesión si es inválida
   */
  validateAndCleanup(): void {
    if (typeof window === 'undefined') return
    
    const token = this.getToken()
    const user = this.getUser()
    
    // Si hay token pero está expirado, limpiar todo
    if (token && this.isTokenExpired(token)) {
      console.log('[AuthService] 🧹 Token expirado, limpiando sesión')
      this.logout()
      return
    }
    
    // Si hay usuario pero no token, limpiar todo
    if (user && !token) {
      console.log('[AuthService] 🧹 Usuario sin token, limpiando sesión')
      this.logout()
      return
    }
    
    // Si hay token pero no usuario, intentar recuperar del token
    if (token && !user) {
      console.log('[AuthService] ⚠️ Token sin usuario, requiere re-login')
      this.logout()
      return
    }
  },

  /**
   * Verificar si el usuario existe en el backend
   */
  async verifyUserExists(): Promise<boolean> {
    if (typeof window === 'undefined') return false
    
    const token = this.getToken()
    if (!token || this.isTokenExpired(token)) {
      this.logout()
      return false
    }
    
    try {
      const response = await fetch('/api/usuarios/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        console.log('[AuthService] Usuario no existe en BD, limpiando sesión')
        this.logout()
        return false
      }
      
      const result = await response.json()
      
      if (!result.success || !result.data) {
        this.logout()
        return false
      }
      
      // Actualizar datos del usuario
      this.setUser(result.data)
      return true
      
    } catch (error) {
      console.error('[AuthService] Error verificando usuario:', error)
      this.logout()
      return false
    }
  },

  /**
   * Refrescar datos del usuario desde el backend
   */
  async refreshUser(): Promise<Usuario | null> {
    if (typeof window === 'undefined') return null
    
    const token = this.getToken()
    if (!token || this.isTokenExpired(token)) {
      this.logout()
      return null
    }
    
    try {
      const response = await fetch('/api/usuarios/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        this.logout()
        return null
      }
      
      const result = await response.json()
      
      if (result.success && result.data) {
        this.setUser(result.data)
        return result.data
      }
      
      return null
    } catch (error) {
      console.error('[AuthService] Error refrescando usuario:', error)
      return null
    }
  },

  /**
   * Obtener información del token actual
   */
  getTokenInfo(): {
    email: string | null
    userId: string | null
    expiresAt: Date | null
    isExpired: boolean
  } {
    const token = this.getToken()
    
    if (!token) {
      return {
        email: null,
        userId: null,
        expiresAt: null,
        isExpired: true
      }
    }
    
    try {
      const decoded = this.decodeToken(token)
      
      if (!decoded) {
        return {
          email: null,
          userId: null,
          expiresAt: null,
          isExpired: true
        }
      }
      
      return {
        email: decoded.sub,
        userId: decoded.userId || null,
        expiresAt: new Date(decoded.exp * 1000),
        isExpired: this.isTokenExpired(token)
      }
    } catch (error) {
      return {
        email: null,
        userId: null,
        expiresAt: null,
        isExpired: true
      }
    }
  }
}