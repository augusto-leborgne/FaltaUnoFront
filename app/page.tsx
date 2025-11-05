"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // ⚡ OPTIMIZACIÓN: Validar y redirigir lo más rápido posible
    // No hacer logging excesivo en producción
    const shouldLog = process.env.NODE_ENV !== 'production';
    
    if (shouldLog) {
      logger.debug("[RootPage v2.4] Decidiendo redirección rápida...");
    }
    
    // Limpiar tokens expirados
    AuthService.validateAndCleanup();
    
    const token = AuthService.getToken();
    const user = AuthService.getUser();
    
    if (shouldLog) {
      logger.debug("[RootPage] Token:", token ? "SÍ" : "NO");
      logger.debug("[RootPage] User:", user ? "SÍ" : "NO");
    }

    // Si no hay token o está expirado → login (INMEDIATO)
    if (!token || AuthService.isTokenExpired(token)) {
      if (shouldLog) logger.debug("[RootPage] No autenticado → /login");
      router.replace("/login");
      return;
    }

    // Si hay token válido y user → decidir según estado del perfil
    if (user) {
      // ⚡ CRÍTICO: Validación mejorada de perfil completo
      // Considerar incompleto si perfilCompleto no es true O faltan campos básicos
      const hasBasicFields = user.nombre && user.apellido
      const isProfileComplete = user.perfilCompleto === true
      
      if (!isProfileComplete || !hasBasicFields) {
        if (shouldLog) logger.debug("[RootPage] Perfil incompleto → /profile-setup", {
          perfilCompleto: user.perfilCompleto,
          hasBasicFields
        });
        router.replace("/profile-setup");
        return;
      }

      // TODO: Verificación de cédula deshabilitada temporalmente
      /*
      if (!user.cedulaVerificada) {
        if (shouldLog) logger.debug("[RootPage] Cédula no verificada → /verification");
        router.replace("/verification");
        return;
      }
      */

      // Todo completo → home
      if (shouldLog) logger.debug("[RootPage] Usuario completo → /home");
      router.replace("/home");
      return;
    }

    // Fallback: si hay token pero no user → login
    if (shouldLog) logger.debug("[RootPage] Token sin user → /login");
    router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <LoadingSpinner size="xl" variant="green" />
    </div>
  );
}