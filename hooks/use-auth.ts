// hooks/use-auth.ts
"use client";

import { useAuthContext } from "@/components/auth/auth-provider";

/**
 * Hook personalizado para acceder a la autenticación.
 * Usa el contexto de AuthProvider para mantener estado sincronizado.
 * 
 * IMPORTANTE: Usa este hook en lugar de leer directamente de AuthService
 * para asegurar que el estado esté sincronizado en toda la app.
 */
export function useAuth() {
  const context = useAuthContext();
  
  return {
    user: context.user,
    loading: context.loading,
    setUser: context.setUser,
    refreshUser: context.refreshUser,
    logout: context.logout,
    isAuthenticated: !!context.user && !context.loading
  };
}