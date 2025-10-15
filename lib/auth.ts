// lib/auth.ts
import { Usuario } from "./api";

const STORAGE_TOKEN_KEY = "authToken";
const STORAGE_USER_KEY = "user";

function hasWindow(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export const AuthService = {
  logout: () => {
    if (!hasWindow()) return;
    console.log("[AuthService] Ejecutando logout");
    try {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_USER_KEY);
    } catch (e) {
      console.warn("AuthService.logout: localStorage inaccesible", e);
    }
  },

  getToken: (): string | null => {
    if (!hasWindow()) return null;
    try {
      const token = localStorage.getItem(STORAGE_TOKEN_KEY);
      return token;
    } catch {
      return null;
    }
  },

  getUser: (): Usuario | null => {
    if (!hasWindow()) return null;
    try {
      const raw = localStorage.getItem(STORAGE_USER_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as Usuario;
    } catch (err) {
      console.warn("AuthService.getUser: error parsing user from localStorage", err);
      return null;
    }
  },

  isLoggedIn: (): boolean => {
    if (!hasWindow()) return false;
    try {
      const token = localStorage.getItem(STORAGE_TOKEN_KEY);
      const user = localStorage.getItem(STORAGE_USER_KEY);
      
      if (!token || !user) return false;
      
      // Verificar que el token no esté expirado
      if (AuthService.isTokenExpired(token)) {
        console.log("[AuthService] Token expirado en isLoggedIn");
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  },

  setToken: (token: string) => {
    if (!hasWindow()) return;
    console.log("[AuthService] Guardando token");
    try { 
      localStorage.setItem(STORAGE_TOKEN_KEY, token); 
    } catch (e) {
      console.warn("AuthService.setToken: error", e);
    }
  },

  setUser: (u: Usuario) => {
    if (!hasWindow()) return;
    console.log("[AuthService] Guardando usuario:", u.email);
    try { 
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(u)); 
    } catch (e) {
      console.warn("AuthService.setUser: error", e);
    }
  },

  /**
   * Decodifica el payload de un JWT (sin verificar la firma - solo para lectura de claims)
   */
  decodeToken: (token: string): any => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.warn("[AuthService] Token JWT inválido (no tiene 3 partes)");
        return null;
      }
      
      const payload = parts[1];
      const decoded = atob(payload);
      return JSON.parse(decoded);
    } catch (e) {
      console.warn("AuthService.decodeToken: error", e);
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
        console.warn("[AuthService] Token sin claim 'exp'");
        return true;
      }
      
      const now = Date.now() / 1000;
      const isExpired = decoded.exp < now;
      
      if (isExpired) {
        console.log("[AuthService] Token expirado:", {
          exp: new Date(decoded.exp * 1000).toISOString(),
          now: new Date(now * 1000).toISOString()
        });
      }
      
      return isExpired;
    } catch (e) {
      console.warn("[AuthService] Error verificando expiración:", e);
      return true;
    }
  },

  /**
   * Valida y limpia tokens expirados automáticamente
   */
  validateAndCleanup: () => {
    if (!hasWindow()) return;
    
    const token = AuthService.getToken();
    if (!token) {
      console.log("[AuthService] No hay token para validar");
      return;
    }
    
    if (AuthService.isTokenExpired(token)) {
      console.warn("[AuthService] Token expirado detectado, limpiando localStorage");
      AuthService.logout();
    }
  }
};