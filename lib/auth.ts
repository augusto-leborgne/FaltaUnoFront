import { Usuario } from "./api";

// ============================================
// CONFIGURACIÓN
// ============================================

const STORAGE_TOKEN_KEY = "authToken";
const STORAGE_USER_KEY = "user";
const TOKEN_REFRESH_THRESHOLD = 5 * 60; // 5 minutos antes de expirar

// ============================================
// INTERFACES
// ============================================

interface JWTPayload {
  sub: string; // user id
  email: string;
  exp: number; // expiration timestamp (seconds)
  iat: number; // issued at timestamp (seconds)
  [key: string]: any;
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
   * Decodifica un token JWT y retorna el payload
   */
  decodeToken: (token: string): JWTPayload | null => {
    try {
      const parts = token.split(".");
      
      if (parts.length !== 3) {
        console.warn("[Auth] Token JWT inválido: no tiene 3 partes");
        return null;
      }

      const payload = parts[1];
      const decoded = base64UrlDecode(payload);
      const parsed = JSON.parse(decoded) as JWTPayload;

      return parsed;
    } catch (error) {
      console.error("[Auth] Error decodificando token:", error);
      return null;
    }
  },

  /**
   * Verifica si un token está expirado
   */
  isTokenExpired: (token: string): boolean => {
    try {
      const decoded = AuthService.decodeToken(token);
      
      if (!decoded || !decoded.exp) {
        console.warn("[Auth] Token sin claim 'exp'");
        return true;
      }

      const now = Math.floor(Date.now() / 1000); // Convertir a segundos
      const isExpired = decoded.exp < now;

      if (isExpired) {
        console.log("[Auth] Token expirado:", {
          exp: new Date(decoded.exp * 1000).toISOString(),
          now: new Date(now * 1000).toISOString(),
        });
      }

      return isExpired;
    } catch (error) {
      console.error("[Auth] Error verificando expiración:", error);
      return true;
    }
  },

  /**
   * Verifica si el token necesita ser renovado pronto
   */
  shouldRefreshToken: (token: string): boolean => {
    try {
      const decoded = AuthService.decodeToken(token);
      
      if (!decoded || !decoded.exp) {
        return false;
      }

      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decoded.exp - now;

      // Refrescar si faltan menos de 5 minutos para expirar
      return timeUntilExpiry < TOKEN_REFRESH_THRESHOLD && timeUntilExpiry > 0;
    } catch (error) {
      console.error("[Auth] Error verificando refresh:", error);
      return false;
    }
  },

  /**
   * Obtiene el token del localStorage
   */
  getToken: (): string | null => {
    if (!hasWindow()) return null;
    
    try {
      return localStorage.getItem(STORAGE_TOKEN_KEY);
    } catch (error) {
      console.warn("[Auth] Error obteniendo token:", error);
      return null;
    }
  },

  /**
   * Guarda el token en localStorage
   */
  setToken: (token: string): void => {
    if (!hasWindow()) return;
    
    try {
      localStorage.setItem(STORAGE_TOKEN_KEY, token);
      console.log("[Auth] Token guardado exitosamente");
    } catch (error) {
      console.error("[Auth] Error guardando token:", error);
    }
  },

  /**
   * Obtiene el usuario del localStorage
   */
  getUser: (): Usuario | null => {
    if (!hasWindow()) return null;
    
    try {
      const raw = localStorage.getItem(STORAGE_USER_KEY);
      if (!raw) return null;
      
      return JSON.parse(raw) as Usuario;
    } catch (error) {
      console.warn("[Auth] Error obteniendo usuario:", error);
      return null;
    }
  },

  /**
   * Guarda el usuario en localStorage
   */
  setUser: (user: Usuario): void => {
    if (!hasWindow()) return;
    
    try {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
      console.log("[Auth] Usuario guardado:", user.email);
    } catch (error) {
      console.error("[Auth] Error guardando usuario:", error);
    }
  },

  /**
   * Actualiza los datos del usuario en localStorage
   */
  updateUser: (updates: Partial<Usuario>): void => {
    const currentUser = AuthService.getUser();
    if (!currentUser) return;
    
    const updatedUser = { ...currentUser, ...updates };
    AuthService.setUser(updatedUser);
  },

  /**
   * Cierra sesión y limpia localStorage
   */
  logout: (): void => {
    if (!hasWindow()) return;
    
    console.log("[Auth] Cerrando sesión");
    
    try {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_USER_KEY);
    } catch (error) {
      console.warn("[Auth] Error limpiando localStorage:", error);
    }
  },

  /**
   * Valida el token actual y limpia si está expirado
   */
  validateAndCleanup: (): boolean => {
    if (!hasWindow()) return false;
    
    const token = AuthService.getToken();
    
    if (!token) {
      return false;
    }

    if (AuthService.isTokenExpired(token)) {
      console.warn("[Auth] Token expirado detectado, limpiando sesión");
      AuthService.logout();
      return false;
    }

    return true;
  },

  /**
   * Verifica si el usuario está autenticado
   */
  isLoggedIn: (): boolean => {
    if (!hasWindow()) return false;
    
    const token = AuthService.getToken();
    const user = AuthService.getUser();
    
    if (!token || !user) {
      return false;
    }

    if (AuthService.isTokenExpired(token)) {
      console.log("[Auth] Token expirado en isLoggedIn");
      return false;
    }

    return true;
  },

  /**
   * Obtiene información del usuario desde el token
   */
  getUserFromToken: (token?: string): Partial<Usuario> | null => {
    const tokenToUse = token || AuthService.getToken();
    if (!tokenToUse) return null;

    try {
      const decoded = AuthService.decodeToken(tokenToUse);
      if (!decoded) return null;

      return {
        id: decoded.sub,
        email: decoded.email,
        nombre: decoded.nombre,
        apellido: decoded.apellido,
      };
    } catch (error) {
      console.error("[Auth] Error extrayendo usuario del token:", error);
      return null;
    }
  },

  /**
   * Obtiene headers de autenticación para requests
   */
  getAuthHeaders: (): Record<string, string> => {
    const token = AuthService.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  },

  /**
   * Wrapper para fetch que inyecta headers de autenticación
   */
  authFetch: async (
    input: RequestInfo,
    init: RequestInit = {}
  ): Promise<Response> => {
    // Validar token antes del request
    AuthService.validateAndCleanup();

    const token = AuthService.getToken();
    if (!token) {
      throw new Error("No hay token de autenticación");
    }

    // Preparar headers
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    
    if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    // Hacer request
    const response = await fetch(input, {
      ...init,
      headers,
    });

    // Si es 401, limpiar sesión
    if (response.status === 401) {
      console.warn("[Auth] 401 recibido, limpiando sesión");
      AuthService.logout();
      
      if (hasWindow()) {
        window.location.href = "/login";
      }
    }

    return response;
  },

  /**
   * Verifica si el perfil del usuario está completo
   */
  isProfileComplete: (): boolean => {
    const user = AuthService.getUser();
    if (!user) return false;

    return user.perfilCompleto ?? false;
  },

  /**
   * Verifica si la cédula del usuario está verificada
   */
  isCedulaVerified: (): boolean => {
    const user = AuthService.getUser();
    if (!user) return false;

    return user.cedulaVerificada ?? false;
  },

  /**
   * Obtiene el tiempo restante hasta la expiración del token (en segundos)
   */
  getTokenTimeRemaining: (): number | null => {
    const token = AuthService.getToken();
    if (!token) return null;

    try {
      const decoded = AuthService.decodeToken(token);
      if (!decoded || !decoded.exp) return null;

      const now = Math.floor(Date.now() / 1000);
      const remaining = decoded.exp - now;

      return remaining > 0 ? remaining : 0;
    } catch (error) {
      console.error("[Auth] Error calculando tiempo restante:", error);
      return null;
    }
  },

  /**
   * Formatea el tiempo restante del token en formato legible
   */
  formatTokenTimeRemaining: (): string => {
    const seconds = AuthService.getTokenTimeRemaining();
    if (seconds === null) return "Token inválido";
    if (seconds === 0) return "Expirado";

    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  },

  /**
   * Debug: Imprime información del token actual
   */
  debugToken: (): void => {
    if (!hasWindow()) {
      console.log("[Auth Debug] No hay window disponible");
      return;
    }

    const token = AuthService.getToken();
    const user = AuthService.getUser();

    console.group("[Auth Debug]");
    console.log("Token exists:", !!token);
    console.log("User exists:", !!user);
    
    if (token) {
      const decoded = AuthService.decodeToken(token);
      console.log("Token decoded:", decoded);
      console.log("Is expired:", AuthService.isTokenExpired(token));
      console.log("Should refresh:", AuthService.shouldRefreshToken(token));
      console.log("Time remaining:", AuthService.formatTokenTimeRemaining());
    }
    
    if (user) {
      console.log("User:", {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        perfilCompleto: user.perfilCompleto,
        cedulaVerificada: user.cedulaVerificada,
      });
    }
    
    console.groupEnd();
  },
};