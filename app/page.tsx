"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/lib/auth";
import { logger } from "@/lib/logger";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
  logger.debug("[RootPage v2.3] Decidiendo redirección...");
    
    // Limpiar tokens expirados
    AuthService.validateAndCleanup();
    
    const token = AuthService.getToken();
    const user = AuthService.getUser();
    
    logger.debug("[RootPage] Token:", token ? "SÍ" : "NO");
    logger.debug("[RootPage] User:", user ? "SÍ" : "NO");

    // Si no hay token o está expirado → login
    if (!token || AuthService.isTokenExpired(token)) {
      logger.debug("[RootPage] No autenticado, redirigiendo a /login");
      router.replace("/login");
      return;
    }

    // Si hay token válido y user → decidir según estado del perfil
    if (user) {
      logger.debug("[RootPage] Usuario completo:", {
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
        logger.debug("[RootPage] Perfil incompleto, redirigiendo a /profile-setup");
        router.replace("/profile-setup");
        return;
      }

      // Si la cédula no está verificada → verification
      if (user.cedulaVerificada === false || !user.cedulaVerificada) {
        logger.debug("[RootPage] Cédula no verificada, redirigiendo a /verification");
        router.replace("/verification");
        return;
      }

      // Todo completo → home
      logger.debug("[RootPage] Usuario completo, redirigiendo a /home");
      router.replace("/home");
      return;
    }

    // Fallback: si hay token pero no user → login (caso raro)
    logger.debug("[RootPage] Token sin user, redirigiendo a /login");
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