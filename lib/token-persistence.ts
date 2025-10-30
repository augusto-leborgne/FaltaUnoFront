/**
 * Token Persistence Manager
 * 
 * Ensures JWT tokens are never lost due to errors, crashes, or navigation issues.
 * Provides multiple layers of redundancy and recovery mechanisms.
 */

import { AuthService } from "./auth"
import { logger } from "./logger"

const TOKEN_BACKUP_KEY = "authToken_backup"
const TOKEN_RECOVERY_KEY = "authToken_recovery"
const LAST_TOKEN_CHECK = "lastTokenCheck"

/**
 * Clase para gestionar la persistencia robusta del token JWT
 */
export class TokenPersistence {
  /**
   * Guarda el token con múltiples capas de redundancia
   */
  static saveTokenWithBackup(token: string): void {
    if (typeof window === "undefined") return
    
    try {
      // 1. Guardar en la ubicación principal
      AuthService.setToken(token)
      
      // 2. Crear copia de respaldo en localStorage
      localStorage.setItem(TOKEN_BACKUP_KEY, token)
      
      // 3. Crear copia de recuperación adicional
      localStorage.setItem(TOKEN_RECOVERY_KEY, token)
      
      // 4. Registrar timestamp del último guardado exitoso
      localStorage.setItem(LAST_TOKEN_CHECK, Date.now().toString())
      
      logger?.debug?.("[TokenPersistence] Token guardado con redundancia")
    } catch (error) {
      logger?.error?.("[TokenPersistence] Error guardando token:", error)
    }
  }

  /**
   * Recupera el token desde cualquier ubicación disponible
   * Intenta múltiples fuentes en orden de prioridad
   */
  static recoverToken(): string | null {
    if (typeof window === "undefined") return null
    
    try {
      // 1. Intentar obtener desde ubicación principal
      let token = AuthService.getToken()
      if (token && this.isTokenValid(token)) {
        logger?.debug?.("[TokenPersistence] Token recuperado desde ubicación principal")
        return token
      }
      
      // 2. Intentar desde backup
      token = localStorage.getItem(TOKEN_BACKUP_KEY)
      if (token && this.isTokenValid(token)) {
        logger?.warn?.("[TokenPersistence] Token recuperado desde BACKUP")
        // Restaurar a ubicación principal
        AuthService.setToken(token)
        return token
      }
      
      // 3. Último recurso: recovery key
      token = localStorage.getItem(TOKEN_RECOVERY_KEY)
      if (token && this.isTokenValid(token)) {
        logger?.warn?.("[TokenPersistence] Token recuperado desde RECOVERY")
        // Restaurar a todas las ubicaciones
        this.saveTokenWithBackup(token)
        return token
      }
      
      logger?.warn?.("[TokenPersistence] No se pudo recuperar token válido desde ninguna fuente")
      return null
    } catch (error) {
      logger?.error?.("[TokenPersistence] Error recuperando token:", error)
      return null
    }
  }

  /**
   * Valida si un token es válido (no expirado)
   */
  private static isTokenValid(token: string): boolean {
    if (!token || token === "undefined" || token === "null") return false
    
    try {
      return !AuthService.isTokenExpired(token)
    } catch {
      return false
    }
  }

  /**
   * Verifica la consistencia del token en todas las ubicaciones
   * Detecta y repara inconsistencias automáticamente
   */
  static verifyTokenConsistency(): { 
    isConsistent: boolean; 
    token: string | null;
    repaired: boolean;
  } {
    if (typeof window === "undefined") {
      return { isConsistent: true, token: null, repaired: false }
    }
    
    try {
      const mainToken = AuthService.getToken()
      const backupToken = localStorage.getItem(TOKEN_BACKUP_KEY)
      const recoveryToken = localStorage.getItem(TOKEN_RECOVERY_KEY)
      
      // Encontrar el token válido más reciente
      const tokens = [mainToken, backupToken, recoveryToken].filter(t => t && this.isTokenValid(t))
      
      if (tokens.length === 0) {
        return { isConsistent: true, token: null, repaired: false }
      }
      
      // Si todos los tokens son iguales, está consistente
      const allSame = tokens.every(t => t === tokens[0])
      if (allSame) {
        return { isConsistent: true, token: tokens[0], repaired: false }
      }
      
      // Inconsistencia detectada - reparar
      logger?.warn?.("[TokenPersistence] Inconsistencia detectada en tokens, reparando...")
      const validToken = tokens[0]!
      this.saveTokenWithBackup(validToken)
      
      return { isConsistent: false, token: validToken, repaired: true }
    } catch (error) {
      logger?.error?.("[TokenPersistence] Error verificando consistencia:", error)
      return { isConsistent: false, token: null, repaired: false }
    }
  }

  /**
   * Limpia todas las copias del token
   */
  static clearAllTokens(): void {
    if (typeof window === "undefined") return
    
    try {
      AuthService.removeToken()
      localStorage.removeItem(TOKEN_BACKUP_KEY)
      localStorage.removeItem(TOKEN_RECOVERY_KEY)
      localStorage.removeItem(LAST_TOKEN_CHECK)
      
      logger?.debug?.("[TokenPersistence] Todos los tokens eliminados")
    } catch (error) {
      logger?.error?.("[TokenPersistence] Error limpiando tokens:", error)
    }
  }

  /**
   * Exporta el estado del token para debugging
   */
  static debugTokenState(): void {
    if (typeof window === "undefined") return
    
    try {
      const mainToken = AuthService.getToken()
      const backupToken = localStorage.getItem(TOKEN_BACKUP_KEY)
      const recoveryToken = localStorage.getItem(TOKEN_RECOVERY_KEY)
      const lastCheck = localStorage.getItem(LAST_TOKEN_CHECK)
      
      console.group("🔍 Token Debug State")
      console.log("Main Token:", mainToken ? `Exists (${mainToken.length} chars)` : "Missing")
      console.log("Backup Token:", backupToken ? `Exists (${backupToken.length} chars)` : "Missing")
      console.log("Recovery Token:", recoveryToken ? `Exists (${recoveryToken.length} chars)` : "Missing")
      console.log("Last Check:", lastCheck ? new Date(parseInt(lastCheck)).toISOString() : "Never")
      
      if (mainToken) {
        console.log("Main Token Valid:", !AuthService.isTokenExpired(mainToken))
        try {
          const payload = JSON.parse(atob(mainToken.split('.')[1]))
          console.log("Token Expires:", new Date(payload.exp * 1000).toISOString())
          console.log("Token User ID:", payload.userId)
          console.log("Token Email:", payload.sub)
        } catch (e) {
          console.log("Cannot decode token")
        }
      }
      
      const consistency = this.verifyTokenConsistency()
      console.log("Consistency Check:", consistency)
      console.groupEnd()
    } catch (error) {
      console.error("Error in debugTokenState:", error)
    }
  }
}

// Exponer globalmente para debugging en consola
if (typeof window !== "undefined") {
  (window as any).debugToken = () => TokenPersistence.debugTokenState()
}
