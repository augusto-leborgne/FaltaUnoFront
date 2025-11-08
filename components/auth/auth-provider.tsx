// components/auth/auth-provider.tsx - VERSIÓN MEJORADA
"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { AuthService } from "@/lib/auth";
import { TokenPersistence } from "@/lib/token-persistence";
import { logger } from "@/lib/logger";
import type { Usuario } from "@/lib/api";

export type AuthCtx = {
  user: Usuario | null;
  loading: boolean;
  setUser: (u: Usuario | null) => void;
  refreshUser: () => Promise<Usuario | null>;
  logout: () => void;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const mountedRef = useRef(true);
  const fetchInProgressRef = useRef(false); // ⚡ Prevent duplicate fetches

  // Wrapper para setUser que preserva firma del contexto
  const setUser = useCallback((u: Usuario | null) => {
    logger.debug("[AuthProvider] setUser llamado:", u?.email || "null");
    setUserState(u);
    if (u) {
      AuthService.setUser(u);
    }
  }, []);

  // refreshUser: valida token y actualiza user en contexto desde server
  const refreshUser = useCallback(async (): Promise<Usuario | null> => {
    logger.log("[AuthProvider] refreshUser iniciado");
    
    // ⚡ CRITICAL: Prevent duplicate concurrent fetches
    if (fetchInProgressRef.current) {
      logger.log("[AuthProvider] Fetch already in progress, skipping");
      return user; // Return current user instead of null
    }
    
    // Evitar refresh durante logout
    if (isLoggingOut) {
      logger.log("[AuthProvider] Logout en progreso, cancelando refresh");
      return null;
    }
    
    fetchInProgressRef.current = true;
    setLoading(true);
    
    try {
      // ⚡ CRÍTICO: Validar y limpiar token corrupto ANTES de usarlo
      AuthService.validateAndCleanup();

      const token = AuthService.getToken();
      if (!token) {
        logger.log("[AuthProvider] refreshUser: no hay token");
        setUserState(null);
        return null;
      }
      
      // ⚡ PROTECCIÓN: Verificar que el token no esté corrupto
      if (AuthService.isTokenExpired(token)) {
        logger.warn("[AuthProvider] Token expirado detectado - limpiando");
        AuthService.removeToken();
        AuthService.removeUser();
        setUserState(null);
        return null;
      }

      // Intentar obtener usuario desde el backend (me)
      logger.log("[AuthProvider] Fetching user from server...");
      const serverUser = await AuthService.fetchCurrentUser();
      
      if (serverUser) {
        logger.log("[AuthProvider] User updated from server:", serverUser.email);
        setUserState(serverUser);
        return serverUser;
      }

      // Fallback: cargar desde localStorage si existe y token no expiró
      const localUser = AuthService.getUser();
      if (localUser && !AuthService.isTokenExpired(token)) {
        logger.log("[AuthProvider] Using cached user");
        setUserState(localUser);
        return localUser;
      } else {
        logger.log("[AuthProvider] No valid user - cleaning up");
        // Solo limpiar el usuario, NO hacer logout completo
        AuthService.removeUser();
        setUserState(null);
        return null;
      }
    } catch (err) {
      logger.error("[AuthProvider] refreshUser error:", err);
      
      // ⚡ RECUPERACIÓN INTELIGENTE: En caso de error, verificar si el token sigue siendo válido
      try {
        const token = AuthService.getToken();
        if (token && !AuthService.isTokenExpired(token)) {
          logger.warn("[AuthProvider] Error temporal pero token válido - preservando sesión");
          // Intentar cargar usuario desde localStorage como fallback
          const localUser = AuthService.getUser();
          if (localUser) {
            logger.log("[AuthProvider] Using cached user as fallback");
            setUserState(localUser);
            return localUser;
          } else {
            logger.log("[AuthProvider] No cached user available");
            setUserState(null);
            return null;
          }
        } else {
          logger.log("[AuthProvider] Error y token inválido/expirado - limpiando sesión");
          AuthService.removeToken();
          AuthService.removeUser();
          setUserState(null);
          return null;
        }
      } catch (fallbackErr) {
        logger.error("[AuthProvider] Error en recuperación fallback:", fallbackErr);
        setUserState(null);
        return null;
      }
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false; // ⚡ Reset fetch flag
    }
  }, [isLoggingOut]); // ⚡ REMOVED user from dependencies to prevent infinite loops

  // logout: limpiar storage, contexto y redirigir a login
  const logout = useCallback(() => {
    logger.log("[AuthProvider] logout llamado");
    
    // Marcar que estamos en proceso de logout
    setIsLoggingOut(true);
    
    // Limpiar estado inmediatamente
    setUserState(null);
    
    // AuthService.logout() ya maneja:
    // - Limpieza de tokens y storage
    // - Disparo del evento userLoggedOut
    // - Redirección a /login
    // NO necesitamos hacer nada más aquí
    AuthService.logout();
    
  }, []); // useCallback sin dependencias

  // Inicialización: validar token y restaurar user si procede
  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      // CRÍTICO: Si estamos en proceso de logout, no inicializar nada
      if (typeof window !== "undefined" && sessionStorage.getItem("isLoggingOut") === "true") {
        logger.log("[AuthProvider] Logout en progreso, saltando inicialización");
        sessionStorage.removeItem("isLoggingOut"); // Limpiar flag
        if (mountedRef.current) {
          setUserState(null);
          setLoading(false);
        }
        return;
      }
      
      logger.log("[AuthProvider] Inicializando...");
      
      // CRÍTICO: Intentar recuperar token desde backups si es necesario
      const recoveredToken = TokenPersistence.recoverToken();
      if (recoveredToken) {
        logger.log("[AuthProvider] Token recuperado exitosamente desde backup");
      }
      
      // Verificar consistencia del token
      const consistency = TokenPersistence.verifyTokenConsistency();
      if (consistency.repaired) {
        logger.log("[AuthProvider] Token reparado durante inicialización");
      }
      
      // Limpiar tokens expirados
      AuthService.validateAndCleanup();

      // Intentar restaurar user desde localStorage
      const token = AuthService.getToken();
      const localUser = AuthService.getUser();

      if (!token) {
        logger.log("[AuthProvider] No hay token en localStorage");
        if (mountedRef.current) {
          setUserState(null);
          setLoading(false);
        }
        return;
      }

      // ⚡ OPTIMIZACIÓN: Si hay token y user local y token no expiró -> setear INMEDIATAMENTE
      // No esperar validación del servidor para mostrar UI
      if (localUser && !AuthService.isTokenExpired(token)) {
        logger.log("[AuthProvider] Restoring session from cache:", localUser.email);
        if (mountedRef.current) {
          setUserState(localUser);
          setLoading(false); // ⚡ Desbloquear UI inmediatamente
        }
        
        // ⚡ Revalidar desde servidor en background solo si es necesario
        // Usar requestIdleCallback para no bloquear la renderización inicial
        const revalidate = async () => {
          try {
            const serverUser = await AuthService.fetchCurrentUser();
            if (serverUser && mountedRef.current) {
              // Solo actualizar si hubo cambios
              if (JSON.stringify(serverUser) !== JSON.stringify(localUser)) {
                setUserState(serverUser);
              }
            }
          } catch (err) {
            // Mantener usuario local en caso de error
          }
        }
        
        // Esperar 2 segundos antes de revalidar en background
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          (window as any).requestIdleCallback(revalidate, { timeout: 3000 });
        } else {
          setTimeout(revalidate, 2000);
        }
        
        return;
      }

      // Si hay token pero no user local, intentar validar con servidor
      try {
        const serverUser = await AuthService.fetchCurrentUser();
        if (serverUser) {
          logger.log("[AuthProvider] User restored from server:", serverUser.email);
          if (mountedRef.current) setUserState(serverUser);
        } else {
          logger.log("[AuthProvider] Token not validated, cleaning up");
          AuthService.logout();
          if (mountedRef.current) setUserState(null);
        }
      } catch (err) {
        logger.warn("[AuthProvider] Validation error:", err);
        AuthService.logout();
        if (mountedRef.current) setUserState(null);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    init();

    // ✅ Listen to custom events for user updates
    const handleUserUpdated = ((e: CustomEvent) => {
      logger.log("[AuthProvider] User updated via event");
      setUserState(e.detail);
    }) as EventListener;
    
    const handleUserLoggedOut = () => {
      logger.log("[AuthProvider] Logout detected via event");
      setUserState(null);
    };

    window.addEventListener('userUpdated', handleUserUpdated);
    window.addEventListener('userLoggedOut', handleUserLoggedOut);

    // Escuchar cambios en localStorage (sync entre pestañas)
    const onStorage = (e: StorageEvent) => {
      logger.log("[AuthProvider] Storage event:", e.key);
      
      if (e.key === "authToken") {
        if (!e.newValue) {
          logger.log("[AuthProvider] Token eliminado en otra pestaña");
          setUserState(null);
        } else if (AuthService.isTokenExpired(e.newValue)) {
          logger.log("[AuthProvider] Token expirado detectado via storage event");
          AuthService.logout();
          setUserState(null);
        }
      }
      
      if (e.key === "user") {
        try {
          const newUser = e.newValue ? JSON.parse(e.newValue) : null;
          logger.log("[AuthProvider] Usuario actualizado desde otra pestaña:", newUser?.email ?? null);
          setUserState(newUser);
        } catch {
          setUserState(null);
        }
      }
    };

    window.addEventListener("storage", onStorage);
    
    // ⚡ Revalidación periódica cada 15 minutos
    // Esto asegura que el perfil esté siempre sincronizado sin sobrecarga
    const revalidationInterval = setInterval(async () => {
      if (!mountedRef.current) return;
      
      // No revalidar si estamos en proceso de logout
      if (typeof window !== "undefined" && sessionStorage.getItem("isLoggingOut") === "true") {
        return;
      }
      
      const token = AuthService.getToken();
      if (!token || isLoggingOut) return;
      
      try {
        const serverUser = await AuthService.fetchCurrentUser();
        if (serverUser && mountedRef.current) {
          setUserState(serverUser);
        }
      } catch (err) {
        // Silently fail - mantener usuario local
      }
    }, 15 * 60 * 1000); // 15 minutos

    return () => {
      mountedRef.current = false;
      clearInterval(revalidationInterval);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener('userUpdated', handleUserUpdated);
      window.removeEventListener('userLoggedOut', handleUserLoggedOut);
    };
  }, [isLoggingOut]);

  const ctx: AuthCtx = {
    user,
    loading,
    setUser,
    refreshUser,
    logout,
  };

  return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext debe usarse dentro de AuthProvider");
  return ctx;
}
