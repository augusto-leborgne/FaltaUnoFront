// components/AuthProvider.tsx
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
  const [user, setUser] = useState<Usuario | null>(AuthService.getUser());
  const [loading, setLoading] = useState(false);

  const refreshUser = async () => {
    setLoading(true);
    try {
      // Si necesitás validar token contra backend, llamá a un endpoint /auth/me aquí.
      const u = AuthService.getUser();
      setUser(u);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // escuchar cambios de storage (logout/login en otra pestaña)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "authToken" || e.key === "user") {
        setUser(AuthService.getUser());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const logout = () => {
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
