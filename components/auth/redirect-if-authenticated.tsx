"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  redirectTo = "/" 
}: RedirectIfAuthenticatedProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      console.log("[RedirectIfAuthenticated] Verificando autenticación...");
      
      // Limpiar tokens expirados
      AuthService.validateAndCleanup();
      
      const token = AuthService.getToken();
      const user = AuthService.getUser();
      
      console.log("[RedirectIfAuthenticated] Token:", token ? "SÍ" : "NO");
      console.log("[RedirectIfAuthenticated] User:", user ? "SÍ" : "NO");

      // Si está autenticado y el token es válido, redirigir
      if (token && !AuthService.isTokenExpired(token) && user) {
        console.log("[RedirectIfAuthenticated] Usuario autenticado, redirigiendo a", redirectTo);
        router.push(redirectTo);
        return;
      }

      setIsChecking(false);
    };

    checkAuth();
  }, [router, redirectTo]);

  // Mostrar loading mientras verifica
  if (isChecking) {
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