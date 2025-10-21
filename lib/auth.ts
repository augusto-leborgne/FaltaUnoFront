// lib/auth.ts - VERSIÓN MEJORADA
import type { Usuario } from "./api"

const TOKEN_KEY = "authToken"
const USER_KEY = "user"
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export class AuthService {
  // ============================================
  // TOKEN MANAGEMENT
  // ============================================

  static setToken(token: string): void {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(TOKEN_KEY, token)
      console.log("[AuthService] Token guardado")
    } catch (error) {
      console.error("[AuthService] Error guardando token:", error)
    }
  }

  static getToken(): string | null {
    if (typeof window === "undefined") return null
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch (error) {
      console.error("[AuthService] Error obteniendo token:", error)
      return null
    }
  }

  static removeToken(): void {
    if (typeof window === "undefined") return
    try {
      localStorage.removeItem(TOKEN_KEY)
      console.log("[AuthService] Token eliminado")
    } catch (error) {
      console.error("[AuthService] Error eliminando token:", error)
    }
  }

  // ============================================
  // USER MANAGEMENT
  // ============================================

  static setUser(user: Usuario): void {
    if (typeof window === "undefined") return
    try {
      // ✅ CRÍTICO: Normalizar foto_perfil antes de guardar
      const normalizedUser = {
        ...user,
        foto_perfil: user.foto_perfil || (user as any).fotoPerfil || undefined,
        fotoPerfil: undefined // Eliminar duplicado
      }
      
      localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser))
      console.log("[AuthService] Usuario guardado:", normalizedUser.email)
      
      // Disparar evento personalizado para notificar cambios
      window.dispatchEvent(new CustomEvent('userUpdated', { 
        detail: normalizedUser 
      }))
    } catch (error) {
      console.error("[AuthService] Error guardando usuario:", error)
    }
  }

  static getUser(): Usuario | null {
    if (typeof window === "undefined") return null
    try {
      const userStr = localStorage.getItem(USER_KEY)
      if (!userStr) return null
      
      const user = JSON.parse(userStr) as Usuario
      
      // ✅ CRÍTICO: Normalizar foto_perfil al leer
      return {
        ...user,
        foto_perfil: user.foto_perfil || (user as any).fotoPerfil || undefined
      }
    } catch (error) {
      console.error("[AuthService] Error parseando usuario:", error)
      return null
    }
  }

  static removeUser(): void {
    if (typeof window === "undefined") return
    try {
      localStorage.removeItem(USER_KEY)
      console.log("[AuthService] Usuario eliminado")
      
      // Disparar evento de logout
      window.dispatchEvent(new CustomEvent('userLoggedOut'))
    } catch (error) {
      console.error("[AuthService] Error eliminando usuario:", error)
    }
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  static logout(): void {
    console.log("[AuthService] Logout iniciado")
    
    // Limpiar storage
    this.removeToken()
    this.removeUser()
    
    // ✅ CRÍTICO: Limpiar TODOS los datos de sesión
    if (typeof window !== "undefined") {
      try {
        // Limpiar cualquier otro dato de sesión
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.startsWith('match_') || key.startsWith('user_')) {
            localStorage.removeItem(key)
          }
        })
      } catch (error) {
        console.error("[AuthService] Error limpiando storage:", error)
      }
    }
    
    console.log("[AuthService] Logout completado")
  }

  static isLoggedIn(): boolean {
    const token = this.getToken()
    if (!token) return false
    
    // Verificar si el token está expirado
    if (this.isTokenExpired(token)) {
      console.log("[AuthService] Token expirado, limpiando sesión")
      this.logout()
      return false
    }
    
    return true
  }

  // ============================================
  // TOKEN VALIDATION
  // ============================================

  static isTokenExpired(token: string): boolean {
    try {
      // Decodificar el payload del JWT
      const payload = JSON.parse(atob(token.split(".")[1]))
      const exp = payload.exp * 1000 // Convertir a milisegundos
      const now = Date.now()
      
      return now >= exp
    } catch (error) {
      console.error("[AuthService] Error verificando token:", error)
      return true // Si no se puede verificar, asumir expirado
    }
  }

  static validateAndCleanup(): void {
    const token = this.getToken()
    
    if (!token) {
      this.removeUser()
      return
    }
    
    if (this.isTokenExpired(token)) {
      console.log("[AuthService] Token expirado, limpiando")
      this.logout()
    }
  }

  // ============================================
  // API HELPERS
  // ============================================

  static getAuthHeaders(): Record<string, string> {
    const token = this.getToken()
    
    if (!token) {
      return {
        "Content-Type": "application/json"
      }
    }
    
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  }

  // ✅ NUEVO: Método para refrescar datos del usuario desde el servidor
  static async fetchCurrentUser(): Promise<Usuario | null> {
    try {
      const token = this.getToken()
      
      if (!token) {
        console.log("[AuthService] No hay token para fetch")
        return null
      }
      
      if (this.isTokenExpired(token)) {
        console.log("[AuthService] Token expirado")
        this.logout()
        return null
      }
      
      console.log("[AuthService] Fetching current user...")
      
      const response = await fetch(`${API_URL}/api/usuarios/me`, {
        headers: this.getAuthHeaders()
      })
      
      if (!response.ok) {
        console.error("[AuthService] Error en fetchCurrentUser:", response.status)
        
        // Si es 401, el token es inválido
        if (response.status === 401) {
          this.logout()
        }
        
        return null
      }
      
      const result = await response.json()
      const userData = result.data
      
      if (!userData) {
        console.error("[AuthService] No hay datos de usuario en respuesta")
        return null
      }
      
      // Normalizar y guardar
      const normalizedUser: Usuario = {
        ...userData,
        foto_perfil: userData.foto_perfil || userData.fotoPerfil || undefined,
        fotoPerfil: undefined
      }
      
      this.setUser(normalizedUser)
      
      console.log("[AuthService] Usuario actualizado desde servidor")
      
      return normalizedUser
    } catch (error) {
      console.error("[AuthService] Error en fetchCurrentUser:", error)
      return null
    }
  }

  // ✅ NUEVO: Método para actualizar foto de perfil
  static async updateProfilePhoto(file: File): Promise<boolean> {
    try {
      const token = this.getToken()
      
      if (!token) {
        throw new Error("No hay token de autenticación")
      }
      
      const formData = new FormData()
      formData.append("file", file)
      
      const response = await fetch(`${API_URL}/api/usuarios/me/foto`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      })
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`)
      }
      
      // Refrescar datos del usuario
      await this.fetchCurrentUser()
      
      return true
    } catch (error) {
      console.error("[AuthService] Error actualizando foto:", error)
      return false
    }
  }

  // ✅ NUEVO: Método para actualizar perfil
  static async updateProfile(data: Partial<Usuario>): Promise<boolean> {
    try {
      const token = this.getToken()
      
      if (!token) {
        throw new Error("No hay token de autenticación")
      }
      
      const response = await fetch(`${API_URL}/api/usuarios/me`, {
        method: "PUT",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`)
      }
      
      // Refrescar datos del usuario
      await this.fetchCurrentUser()
      
      return true
    } catch (error) {
      console.error("[AuthService] Error actualizando perfil:", error)
      return false
    }
  }
}

export default AuthService