"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/lib/auth";

interface RedirectIfAuthenticatedProps {
  children: React.ReactNode;
}

/**
 * Guard para páginas públicas (login, register)
 * Si el usuario ya está autenticado, lo redirige a /
 */
export default function RedirectIfAuthenticated({ children }: RedirectIfAuthenticatedProps) {
  const router = useRouter();
  const [shouldShow, setShouldShow] = useState<boolean | null>(null);

  useEffect(() => {
    console.log("[RedirectIfAuthenticated] Verificando autenticación...");
    
    // Limpiar tokens expirados
    AuthService.validateAndCleanup();
    
    const token = AuthService.getToken();
    const user = AuthService.getUser();
    
    console.log("[RedirectIfAuthenticated] Token:", token ? "SÍ" : "NO");
    console.log("[RedirectIfAuthenticated] User:", user ? "SÍ" : "NO");

    // Si está autenticado con token válido, redirigir a /
    if (token && !AuthService.isTokenExpired(token) && user) {
      console.log("[RedirectIfAuthenticated] Usuario autenticado, redirigiendo a /");
      setShouldShow(false);
      router.replace("/");
      return;
    }

    // No está autenticado, mostrar la página
    console.log("[RedirectIfAuthenticated] Usuario no autenticado, mostrando página");
    setShouldShow(true);
  }, [router]);

  // Mientras verifica, mostrar loading
  if (shouldShow === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando...</p>
        </div>
      </div>
    );
  }

  // Si no debe mostrar (está autenticado), loading mientras redirige
  if (!shouldShow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}