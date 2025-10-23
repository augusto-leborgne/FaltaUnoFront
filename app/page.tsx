"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/lib/auth";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    console.log("[RootPage v2.2] Decidiendo redirección...");
    
    // Limpiar tokens expirados
    AuthService.validateAndCleanup();
    
    const token = AuthService.getToken();
    const user = AuthService.getUser();
    
    console.log("[RootPage] Token:", token ? "SÍ" : "NO");
    console.log("[RootPage] User:", user ? "SÍ" : "NO");

    // Si no hay token o está expirado → login
    if (!token || AuthService.isTokenExpired(token)) {
      console.log("[RootPage] No autenticado, redirigiendo a /login");
      router.replace("/login");
      return;
    }

    // Si hay token válido y user → decidir según estado del perfil
    if (user) {
      console.log("[RootPage] Usuario completo:", {
        email: user.email,
        perfilCompleto: user.perfilCompleto,
        cedulaVerificada: user.cedulaVerificada,
        nombre: user.nombre,
        apellido: user.apellido,
        celular: user.celular,
        fechaNacimiento: user.fechaNacimiento,
        cedula: user.cedula
      });
      
      // Si el perfil no está completo → profile-setup
      if (user.perfilCompleto === false || !user.perfilCompleto) {
        console.log("[RootPage] Perfil incompleto, redirigiendo a /profile-setup");
        router.replace("/profile-setup");
        return;
      }

      // Si la cédula no está verificada → verification
      if (user.cedulaVerificada === false || !user.cedulaVerificada) {
        console.log("[RootPage] Cédula no verificada, redirigiendo a /verification");
        router.replace("/verification");
        return;
      }

      // Todo completo → home
      console.log("[RootPage] Usuario completo, redirigiendo a /home");
      router.replace("/home");
      return;
    }

    // Fallback: si hay token pero no user → login (caso raro)
    console.log("[RootPage] Token sin user, redirigiendo a /login");
    router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando...</p>
      </div>
    </div>
  );
}