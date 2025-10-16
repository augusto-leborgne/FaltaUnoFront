"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    console.log("[RequireAuth] Checking auth - Loading:", loading, "User:", user ? user.email : "NO");
    
    // Esperar a que termine de cargar
    if (loading) {
      console.log("[RequireAuth] Still loading, waiting...");
      setShouldRender(false);
      return;
    }

    // Si no hay usuario → redirigir a login
    if (!user) {
      console.log("[RequireAuth] ❌ No user found, redirecting to /login");
      setShouldRender(false);
      router.replace("/login");
      return;
    }

    // Usuario autenticado → permitir acceso
    console.log("[RequireAuth] ✅ User authenticated:", user.email);
    setShouldRender(true);
  }, [user, loading, router]);

  // Mientras carga o redirige, mostrar loading
  if (!shouldRender) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">
            {loading ? "Verificando acceso..." : "Redirigiendo..."}
          </p>
        </div>
      </div>
    );
  }

  // Renderizar contenido protegido
  return <>{children}</>;
}