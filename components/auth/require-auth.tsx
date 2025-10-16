"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/lib/auth";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    console.log("[RequireAuth] Verificando autenticación...");
    
    // Limpiar tokens expirados
    AuthService.validateAndCleanup();
    
    const token = AuthService.getToken();
    const user = AuthService.getUser();
    
    console.log("[RequireAuth] Token:", token ? "SÍ" : "NO");
    console.log("[RequireAuth] User:", user ? "SÍ" : "NO");

    // Si no hay token o está expirado → no autenticado
    if (!token || AuthService.isTokenExpired(token)) {
      console.log("[RequireAuth] No autenticado, redirigiendo a /login");
      setIsAuthenticated(false);
      router.replace("/login");
      return;
    }

    // Si hay token válido → autenticado
    console.log("[RequireAuth] Autenticado ✓");
    setIsAuthenticated(true);
  }, [router]);

  // Mientras verifica, mostrar loading
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, mostrar loading (mientras redirige)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Redirigiendo a login...</p>
        </div>
      </div>
    );
  }

  // Autenticado: mostrar contenido
  return <>{children}</>;
}