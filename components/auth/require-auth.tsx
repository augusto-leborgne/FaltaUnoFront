"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuthContext } from "@/components/auth/auth-provider";
import { AuthService } from "@/lib/auth";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, setUser } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const validateAuth = async () => {
      console.log("[RequireAuth] Validando autenticación...");
      console.log("[RequireAuth] Path:", pathname);
      console.log("[RequireAuth] Loading:", loading);
      
      // Esperar a que termine la carga inicial del AuthProvider
      if (loading) {
        console.log("[RequireAuth] Esperando a que termine loading...");
        return;
      }
      
      // Validar y limpiar tokens expirados
      AuthService.validateAndCleanup();
      
      const token = AuthService.getToken();
      const localUser = AuthService.getUser();
      
      console.log("[RequireAuth] Token:", token ? "SÍ" : "NO");
      console.log("[RequireAuth] User:", localUser ? "SÍ" : "NO");
      console.log("[RequireAuth] User from context:", user ? "SÍ" : "NO");

      // Si no hay token o está expirado, redirigir a login
      if (!token) {
        console.log("[RequireAuth] No hay token, redirigiendo a /login");
        const returnTo = pathname + (search ? "?" + search.toString() : "");
        router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
        setIsValidating(false);
        return;
      }

      // Si el token está expirado, limpiar y redirigir
      if (AuthService.isTokenExpired(token)) {
        console.log("[RequireAuth] Token expirado, redirigiendo a /login");
        AuthService.logout();
        const returnTo = pathname + (search ? "?" + search.toString() : "");
        router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
        setIsValidating(false);
        return;
      }

      // Si no hay user en contexto pero sí hay token y user local, cargar user
      if (!user && localUser) {
        console.log("[RequireAuth] Cargando user desde localStorage al contexto");
        setUser(localUser);
      }

      // Todo OK - dejar pasar
      console.log("[RequireAuth] Autenticación válida, permitiendo acceso");
      console.log("[RequireAuth] User final:", user);
      setIsValidating(false);
    };

    validateAuth();
  }, [user, loading, router, pathname, search, setUser]);

  // Mostrar loading mientras valida o mientras AuthProvider está cargando
  if (loading || isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si no hay user después de validar, mostrar loading (mientras redirige)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Redirigiendo a login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}