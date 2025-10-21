// lib/auth.ts - VERSIÓN ARREGLADA (usa API_BASE)
import type { Usuario } from "./api"
import { API_BASE, normalizeUrl } from "./api"

const TOKEN_KEY = "authToken"
const USER_KEY = "user"

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
      const normalizedUser: any = {
        ...user,
        foto_perfil: (user as any).foto_perfil || (user as any).fotoPerfil || undefined,
      }
      delete normalizedUser.fotoPerfil

      localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser))
      console.log("[AuthService] Usuario guardado:", normalizedUser.email)

      window.dispatchEvent(new CustomEvent("userUpdated", { detail: normalizedUser }))
    } catch (error) {
      console.error("[AuthService] Error guardando usuario:", error)
    }
  }

  static getUser(): Usuario | null {
    if (typeof window === "undefined") return null
    try {
      const userStr = localStorage.getItem(USER_KEY)
      if (!userStr) return null
      const user = JSON.parse(userStr) as any
      return {
        ...user,
        foto_perfil: user.foto_perfil || user.fotoPerfil || undefined,
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
      window.dispatchEvent(new CustomEvent("userLoggedOut"))
    } catch (error) {
      console.error("[AuthService] Error eliminando usuario:", error)
    }
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  static logout(): void {
    console.log("[AuthService] Logout iniciado")
    this.removeToken()
    this.removeUser()

    if (typeof window !== "undefined") {
      try {
        // limpiar otras claves de sesión si las usás
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith("match_") || k.startsWith("user_")) localStorage.removeItem(k)
        })
      } catch (e) {
        console.error("[AuthService] Error limpiando storage extra:", e)
      }
    }
    console.log("[AuthService] Logout completado")
  }

  static isLoggedIn(): boolean {
    const token = this.getToken()
    if (!token) return false
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
      const payload = JSON.parse(atob(token.split(".")[1]))
      const exp = payload.exp * 1000
      return Date.now() >= exp
    } catch (error) {
      console.error("[AuthService] Error verificando token:", error)
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
      console.log("[AuthService] Token expirado, limpiando")
      this.logout()
    }
  }

  // ============================================
  // API HELPERS
  // ============================================

  static getAuthHeaders(): Record<string, string> {
    const token = this.getToken()
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
  }

  // ✅ Usa API_BASE normalizado (nada de backend:8080 en el browser)
  static async fetchCurrentUser(): Promise<Usuario | null> {
    try {
      const token = this.getToken()
      if (!token) return null
      if (this.isTokenExpired(token)) {
        this.logout()
        return null
      }

      console.log("[AuthService] Fetching current user...")
      const url = normalizeUrl(`${API_BASE}/api/usuarios/me`)
      const res = await fetch(url, { headers: this.getAuthHeaders() })

      if (!res.ok) {
        console.error("[AuthService] fetchCurrentUser status:", res.status)
        if (res.status === 401) this.logout()
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
      console.log("[AuthService] Usuario actualizado desde servidor")
      return normalized as Usuario
    } catch (e) {
      console.error("[AuthService] Error en fetchCurrentUser:", e)
      return null
    }
  }

  static async updateProfilePhoto(file: File): Promise<boolean> {
    try {
      const token = this.getToken()
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
      console.error("[AuthService] Error actualizando foto:", e)
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
      console.error("[AuthService] Error actualizando perfil:", e)
      return false
    }
  }
}

export default AuthService