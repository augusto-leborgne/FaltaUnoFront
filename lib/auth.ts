// lib/auth.ts
import { Usuario } from "./api";

const STORAGE_TOKEN_KEY = "authToken";
const STORAGE_USER_KEY = "user";
const API_BASE = "/api/auth"; // ajustar según tu backend

function hasWindow(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return atob(str);
}

export const AuthService = {
  logout: () => {
    if (!hasWindow()) return;
    console.log("[AuthService] Ejecutando logout");
    try {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_USER_KEY);
    } catch (e) {
      console.warn("[AuthService] logout: localStorage inaccesible", e);
    }
  },

  getToken: (): string | null => {
    if (!hasWindow()) return null;
    try {
      return localStorage.getItem(STORAGE_TOKEN_KEY);
    } catch (e) {
      console.warn("[AuthService] getToken: error", e);
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
      console.warn("[AuthService] getUser: error parsing user from localStorage", err);
      return null;
    }
  },

  setToken: (token: string) => {
    if (!hasWindow()) return;
    console.log("[AuthService] Guardando token");
    try {
      localStorage.setItem(STORAGE_TOKEN_KEY, token);
    } catch (e) {
      console.warn("[AuthService] setToken: error", e);
    }
  },

  setUser: (u: Usuario) => {
    if (!hasWindow()) return;
    console.log("[AuthService] Guardando usuario:", u.email);
    try {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(u));
    } catch (e) {
      console.warn("[AuthService] setUser: error", e);
    }
  },

  decodeToken: (token: string): any => {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        console.warn("[AuthService] decodeToken: Token JWT inválido (no tiene 3 partes)");
        return null;
      }
      const payload = parts[1];
      const decoded = base64UrlDecode(payload);
      return JSON.parse(decoded);
    } catch (e) {
      console.warn("[AuthService] decodeToken: error", e);
      return null;
    }
  },

  isTokenExpired: (token: string): boolean => {
    try {
      const decoded = AuthService.decodeToken(token);
      if (!decoded || !decoded.exp) {
        console.warn("[AuthService] isTokenExpired: Token sin claim 'exp'");
        return true;
      }
      const now = Date.now() / 1000;
      const isExpired = decoded.exp < now;
      if (isExpired) {
        console.log("[AuthService] Token expirado:", {
          exp: new Date(decoded.exp * 1000).toISOString(),
          now: new Date(now * 1000).toISOString(),
        });
      }
      return isExpired;
    } catch (e) {
      console.warn("[AuthService] isTokenExpired: error verificando expiración", e);
      return true;
    }
  },

  isLoggedIn: (): boolean => {
    if (!hasWindow()) return false;
    try {
      const token = AuthService.getToken();
      const user = AuthService.getUser();
      if (!token || !user) return false;
      if (AuthService.isTokenExpired(token)) {
        console.log("[AuthService] Token expirado en isLoggedIn");
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  validateAndCleanup: () => {
    if (!hasWindow()) return;
    const token = AuthService.getToken();
    if (!token) {
      console.log("[AuthService] validateAndCleanup: No hay token para validar");
      return;
    }
    if (AuthService.isTokenExpired(token)) {
      console.warn("[AuthService] Token expirado detectado, limpiando localStorage");
      AuthService.logout();
    }
  },

  fetchCurrentUser: async (): Promise<Usuario | null> => {
    const token = AuthService.getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE}/me`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) return null;

      const data = await res.json();
      return data?.data ?? null;
    } catch (err) {
      console.warn("[AuthService] fetchCurrentUser error", err);
      return null;
    }
  },

  // ---------- NEW HELPERS ----------
  getAuthHeaders: (): Record<string, string> => {
    const token = AuthService.getToken();
    const base: Record<string, string> = { "Content-Type": "application/json" };
    if (token) base["Authorization"] = `Bearer ${token}`;
    return base;
  },

  authFetch: async (input: RequestInfo, init: RequestInit = {}) => {
    // wrapper that injects auth header if token exists
    const headers = { ...(init.headers ?? {}), ...AuthService.getAuthHeaders() };
    return fetch(input, { ...init, headers });
  },
};