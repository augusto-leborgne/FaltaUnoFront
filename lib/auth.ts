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
      return localStorage.getItem(STORAGE_TOKEN_KEY);
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
      return localStorage.getItem(STORAGE_TOKEN_KEY) != null;
    } catch {
      return false;
    }
  },

  setToken: (token: string) => {
    if (!hasWindow()) return;
    try { localStorage.setItem(STORAGE_TOKEN_KEY, token); } catch {}
  },

  setUser: (u: Usuario) => {
    if (!hasWindow()) return;
    try { localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(u)); } catch {}
  }
};