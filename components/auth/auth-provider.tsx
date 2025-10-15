// components/auth/auth-provider.tsx
"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthService } from "@/lib/auth";
import type { Usuario } from "@/lib/api";

type AuthCtx = {
  user: Usuario | null;
  loading: boolean;
  setUser: (u: Usuario | null) => void;
  refreshUser: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  // Inicializar desde localStorage al montar
  useEffect(() => {
    console.log("[AuthProvider] Inicializando...");
    
    // Limpiar tokens expirados
    AuthService.validateAndCleanup();
    
    const token = AuthService.getToken();
    const localUser = AuthService.getUser();
    
    console.log("[AuthProvider] Token en localStorage:", token ? "SÍ" : "NO");
    console.log("[AuthProvider] User en localStorage:", localUser ? "SÍ" : "NO");

    if (token && !AuthService.isTokenExpired(token) && localUser) {
      console.log("[AuthProvider] Restaurando sesión desde localStorage");
      setUser(localUser);
    } else if (token && AuthService.isTokenExpired(token)) {
      console.log("[AuthProvider] Token expirado, limpiando");
      AuthService.logout();
    }

    setLoading(false);
  }, []);

  const refreshUser = async () => {
    setLoading(true);
    try {
      // Validar token
      const token = AuthService.getToken();
      if (!token || AuthService.isTokenExpired(token)) {
        console.log("[AuthProvider] Token inválido en refreshUser");
        setUser(null);
        AuthService.logout();
        return;
      }

      // Si necesitas revalidar contra backend, puedes llamar a un endpoint /auth/me aquí
      const u = AuthService.getUser();
      setUser(u);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Escuchar cambios de storage (logout/login en otra pestaña)
    const onStorage = (e: StorageEvent) => {
      console.log("[AuthProvider] Storage event:", e.key);
      
      if (e.key === "authToken") {
        const newToken = e.newValue;
        if (!newToken) {
          console.log("[AuthProvider] Token eliminado en otra pestaña");
          setUser(null);
        } else if (AuthService.isTokenExpired(newToken)) {
          console.log("[AuthProvider] Token expirado detectado");
          AuthService.logout();
          setUser(null);
        }
      }
      
      if (e.key === "user") {
        console.log("[AuthProvider] User actualizado en otra pestaña");
        const newUser = e.newValue ? JSON.parse(e.newValue) : null;
        setUser(newUser);
      }
    };
    
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const logout = () => {
    console.log("[AuthProvider] Logout");
    AuthService.logout();
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext debe usarse dentro de AuthProvider");
  return ctx;
}