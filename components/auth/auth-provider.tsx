// components/auth/auth-provider.tsx - VERSIÓN MEJORADA
"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { AuthService } from "@/lib/auth";
import { TokenPersistence } from "@/lib/token-persistence";
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

  // Wrapper para setUser que preserva firma del contexto
  const setUser = useCallback((u: Usuario | null) => {
    console.log("[AuthProvider] setUser llamado:", u?.email || "null");
    setUserState(u);
    if (u) {
      AuthService.setUser(u);
    }
  }, []);

  // refreshUser: valida token y actualiza user en contexto desde server
  const refreshUser = useCallback(async (): Promise<Usuario | null> => {
    console.log("[AuthProvider] refreshUser iniciado");
    
    // Evitar refresh durante logout
    if (isLoggingOut) {
      console.log("[AuthProvider] Logout en progreso, cancelando refresh");
      return null;
    }
    
    setLoading(true);
    
    try {
      // ⚡ CRÍTICO: Validar y limpiar token corrupto ANTES de usarlo
      AuthService.validateAndCleanup();

      const token = AuthService.getToken();
      if (!token) {
        console.log("[AuthProvider] refreshUser: no hay token");
        setUserState(null);
        return null;
      }
      
      // ⚡ PROTECCIÓN: Verificar que el token no esté corrupto
      if (AuthService.isTokenExpired(token)) {
        console.warn("[AuthProvider] Token expirado detectado - limpiando");
        AuthService.removeToken();
        AuthService.removeUser();
        setUserState(null);
        return null;
      }

      // Intentar obtener usuario desde el backend (me)
      console.log("[AuthProvider] Obteniendo usuario desde servidor...");
      const serverUser = await AuthService.fetchCurrentUser();
      
      if (serverUser) {
        console.log("[AuthProvider] Usuario actualizado desde servidor:", serverUser.email);
        setUserState(serverUser);
        return serverUser;
      }

      // Fallback: cargar desde localStorage si existe y token no expiró
      const localUser = AuthService.getUser();
      if (localUser && !AuthService.isTokenExpired(token)) {
        console.log("[AuthProvider] Usando usuario desde localStorage");
        setUserState(localUser);
        return localUser;
      } else {
        console.log("[AuthProvider] No hay usuario válido - limpiando sin hacer logout forzado");
        // Solo limpiar el usuario, NO hacer logout completo
        // Esto permite que el usuario pueda volver a intentar autenticarse
        AuthService.removeUser();
        setUserState(null);
        return null;
      }
    } catch (err) {
      console.error("[AuthProvider] refreshUser error:", err);
      
      // ⚡ RECUPERACIÓN INTELIGENTE: En caso de error, verificar si el token sigue siendo válido
      try {
        const token = AuthService.getToken();
        if (token && !AuthService.isTokenExpired(token)) {
          console.warn("[AuthProvider] Error temporal pero token válido - preservando sesión");
          // Intentar cargar usuario desde localStorage como fallback
          const localUser = AuthService.getUser();
          if (localUser) {
            console.log("[AuthProvider] Usando usuario desde cache local");
            setUserState(localUser);
            return localUser;
          } else {
            console.log("[AuthProvider] No hay usuario en cache - sin usuario pero token preservado");
            setUserState(null);
            return null;
          }
        } else {
          console.log("[AuthProvider] Error y token inválido/expirado - limpiando sesión");
          AuthService.removeToken();
          AuthService.removeUser();
          setUserState(null);
          return null;
        }
      } catch (fallbackErr) {
        console.error("[AuthProvider] Error en recuperación fallback:", fallbackErr);
        setUserState(null);
        return null;
      }
    } finally {
      setLoading(false);
    }
  }, [isLoggingOut]); // Agregar dependencias del useCallback

  // logout: limpiar storage, contexto y redirigir a login
  const logout = useCallback(() => {
    console.log("[AuthProvider] logout llamado");
    
    // Marcar que estamos en proceso de logout
    setIsLoggingOut(true);
    
    // Limpiar estado inmediatamente
    setUserState(null);
    
    // Limpiar storage
    AuthService.logout();
    
    // Redirigir a login de forma segura en client
    if (typeof window !== "undefined") {
      try {
        // Usar replace en lugar de href para evitar history
        window.location.replace("/login");
      } catch (e) {
        console.warn("[AuthProvider] redirect to login failed", e);
      }
    }
  }, []); // useCallback sin dependencias

  // Inicialización: validar token y restaurar user si procede
  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      console.log("[AuthProvider] Inicializando...");
      
      // CRÍTICO: Intentar recuperar token desde backups si es necesario
      const recoveredToken = TokenPersistence.recoverToken();
      if (recoveredToken) {
        console.log("[AuthProvider] Token recuperado exitosamente desde backup");
      }
      
      // Verificar consistencia del token
      const consistency = TokenPersistence.verifyTokenConsistency();
      if (consistency.repaired) {
        console.log("[AuthProvider] Token reparado durante inicialización");
      }
      
      // Limpiar tokens expirados
      AuthService.validateAndCleanup();

      // Intentar restaurar user desde localStorage
      const token = AuthService.getToken();
      const localUser = AuthService.getUser();

      if (!token) {
        console.log("[AuthProvider] No hay token en localStorage");
        if (mountedRef.current) {
          setUserState(null);
          setLoading(false);
        }
        return;
      }

      // ⚡ OPTIMIZACIÓN: Si hay token y user local y token no expiró -> setear INMEDIATAMENTE
      // No esperar validación del servidor para mostrar UI
      if (localUser && !AuthService.isTokenExpired(token)) {
        console.log("[AuthProvider] Restaurando sesión desde localStorage:", localUser.email);
        if (mountedRef.current) {
          setUserState(localUser);
          setLoading(false); // ⚡ Desbloquear UI inmediatamente
        }
        
        // ⚡ CRÍTICO: Revalidar desde servidor en background para sincronizar datos
        // Usar requestIdleCallback para no bloquear la renderización inicial
        const revalidate = async () => {
          console.log("[AuthProvider] Revalidando usuario desde servidor en background...");
          try {
            const serverUser = await AuthService.fetchCurrentUser();
            if (serverUser && mountedRef.current) {
              console.log("[AuthProvider] ✅ Usuario actualizado desde servidor:", serverUser.email);
              setUserState(serverUser);
            }
          } catch (err) {
            console.warn("[AuthProvider] Error revalidando usuario (manteniendo cache local):", err);
            // No hacer nada - mantener usuario local
          }
        }
        
        // Use requestIdleCallback if available, otherwise setTimeout
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          (window as any).requestIdleCallback(revalidate, { timeout: 2000 });
        } else {
          setTimeout(revalidate, 100);
        }
        
        return;
      }

      // Si hay token pero no user local, intentar validar con servidor
      try {
        const serverUser = await AuthService.fetchCurrentUser();
        if (serverUser) {
          console.log("[AuthProvider] Usuario restaurado desde servidor:", serverUser.email);
          if (mountedRef.current) setUserState(serverUser);
        } else {
          console.log("[AuthProvider] Token no validado por servidor, limpiando");
          AuthService.logout();
          if (mountedRef.current) setUserState(null);
        }
      } catch (err) {
        console.warn("[AuthProvider] Error al validar token con servidor:", err);
        AuthService.logout();
        if (mountedRef.current) setUserState(null);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    init();

    // ✅ NUEVO: Escuchar eventos personalizados
    const handleUserUpdated = ((e: CustomEvent) => {
      console.log("[AuthProvider] Usuario actualizado desde evento");
      setUserState(e.detail);
    }) as EventListener;
    
    const handleUserLoggedOut = () => {
      console.log("[AuthProvider] Logout detectado desde evento");
      setUserState(null);
    };

    window.addEventListener('userUpdated', handleUserUpdated);
    window.addEventListener('userLoggedOut', handleUserLoggedOut);

    // Escuchar cambios en localStorage (sync entre pestañas)
    const onStorage = (e: StorageEvent) => {
      console.log("[AuthProvider] Storage event:", e.key);
      
      if (e.key === "authToken") {
        if (!e.newValue) {
          console.log("[AuthProvider] Token eliminado en otra pestaña");
          setUserState(null);
        } else if (AuthService.isTokenExpired(e.newValue)) {
          console.log("[AuthProvider] Token expirado detectado via storage event");
          AuthService.logout();
          setUserState(null);
        }
      }
      
      if (e.key === "user") {
        try {
          const newUser = e.newValue ? JSON.parse(e.newValue) : null;
          console.log("[AuthProvider] Usuario actualizado desde otra pestaña:", newUser?.email ?? null);
          setUserState(newUser);
        } catch {
          setUserState(null);
        }
      }
    };

    window.addEventListener("storage", onStorage);
    
    // ⚡ NUEVO: Revalidación periódica cada 10 minutos (aumentado de 5)
    // Esto asegura que el perfil esté siempre sincronizado sin sobrecarga
    const revalidationInterval = setInterval(async () => {
      if (!mountedRef.current) return; // ⚡ FIX: Verificar si el componente está montado
      
      const token = AuthService.getToken();
      if (!token || isLoggingOut) return;
      
      console.log("[AuthProvider] Revalidación periódica del usuario...");
      try {
        const serverUser = await AuthService.fetchCurrentUser();
        if (serverUser && mountedRef.current) {
          console.log("[AuthProvider] Usuario revalidado exitosamente");
          setUserState(serverUser);
        }
      } catch (err) {
        console.warn("[AuthProvider] Error en revalidación periódica:", err);
      }
    }, 10 * 60 * 1000); // 10 minutos (aumentado de 5)

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