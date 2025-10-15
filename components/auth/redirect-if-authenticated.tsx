"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/auth/auth-provider";
import { AuthService } from "@/lib/auth";

interface RedirectIfAuthenticatedProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * Guard para páginas públicas (login, register)
 * Si el usuario ya está autenticado, lo redirige a la página principal
 */
export default function RedirectIfAuthenticated({ 
  children, 
  redirectTo = "/home"  // Cambiado de "/" a "/home"
}: RedirectIfAuthenticatedProps) {
  const router = useRouter();
  const { user, loading } = useAuthContext();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      console.log("[RedirectIfAuthenticated] Verificando autenticación...");
      console.log("[RedirectIfAuthenticated] Loading:", loading);
      
      // Esperar a que termine la carga del AuthProvider
      if (loading) {
        console.log("[RedirectIfAuthenticated] Esperando a que termine loading...");
        return;
      }
      
      // Limpiar tokens expirados
      AuthService.validateAndCleanup();
      
      const token = AuthService.getToken();
      const localUser = AuthService.getUser();
      
      console.log("[RedirectIfAuthenticated] Token:", token ? "SÍ" : "NO");
      console.log("[RedirectIfAuthenticated] User:", localUser ? "SÍ" : "NO");
      console.log("[RedirectIfAuthenticated] User from context:", user ? "SÍ" : "NO");

      // Si está autenticado y el token es válido, redirigir
      if (token && !AuthService.isTokenExpired(token) && (user || localUser)) {
        console.log("[RedirectIfAuthenticated] Usuario autenticado, redirigiendo a", redirectTo);
        router.push(redirectTo);
        return;
      }

      console.log("[RedirectIfAuthenticated] Usuario NO autenticado, mostrando página pública");
      setIsChecking(false);
    };

    checkAuth();
  }, [router, redirectTo, user, loading]);

  // Mostrar loading mientras verifica o mientras AuthProvider carga
  if (loading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}