"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

interface RedirectIfAuthenticatedProps {
  children: React.ReactNode;
}

/**
 * Guard para páginas públicas (login, register)
 * Si el usuario ya está autenticado, lo redirige a /
 */
export default function RedirectIfAuthenticated({ children }: RedirectIfAuthenticatedProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    console.log("[RedirectIfAuthenticated] Checking - Loading:", loading, "User:", user ? "YES" : "NO");
    
    // Esperar a que termine de cargar
    if (loading) {
      setShouldRender(false);
      return;
    }

    // Si hay usuario autenticado → redirigir a home
    if (user) {
      console.log("[RedirectIfAuthenticated] User authenticated, redirecting to /");
      setShouldRender(false);
      router.replace("/");
      return;
    }

    // No hay usuario → permitir acceso a página pública
    console.log("[RedirectIfAuthenticated] No user, showing public page");
    setShouldRender(true);
  }, [user, loading, router]);

  // Mientras carga o redirige, mostrar loading
  if (!shouldRender) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">
            {loading ? "Verificando..." : "Redirigiendo..."}
          </p>
        </div>
      </div>
    );
  }

  // Renderizar página pública
  return <>{children}</>;
}