"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Shield, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { UsuarioAPI } from "@/lib/api";
import { AuthService } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { logger } from "@/lib/logger";

export function VerificationScreen() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [cedula, setCedula] = React.useState("");
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isVerified, setIsVerified] = React.useState(false);
  const [error, setError] = React.useState("");
  
  // ✅ NUEVO: Validación en tiempo real
  const [fieldError, setFieldError] = React.useState("");

  // ✅ NUEVO: Validar cédula uruguaya (formato: 1.234.567-8 o 12345678)
  const validateCedula = (value: string): string | null => {
    if (!value) return "La cédula es requerida";
    
    // Eliminar puntos y guiones
    const cleanCedula = value.replace(/[.-]/g, '');
    
    // Debe tener 7 u 8 dígitos
    if (!/^\d{7,8}$/.test(cleanCedula)) {
      return "Formato inválido (7-8 dígitos)";
    }
    
    return null;
  };

  const describeBackendCedulaError = (message?: string) => {
    if (!message) {
      return {} as { inlineMessage?: string; globalMessage?: string };
    }

    const normalized = message
      .normalize("NFD")
      .replace(/[^\u0000-\u007E]/g, "")
      .toLowerCase();

    if (normalized.includes("ya esta registr")) {
      return {
        inlineMessage: "Esta cédula ya está asociada a otra cuenta.",
        globalMessage: "Ya existe una cuenta verificada con esta cédula. Si crees que es un error, contáctanos para ayudarte."
      };
    }

    if (normalized.includes("cedula invalida")) {
      return {
        inlineMessage: "No pudimos validar esta cédula con el registro oficial.",
        globalMessage: message
      };
    }

    return { globalMessage: message };
  };

  const applyCedulaErrorFeedback = (message?: string, fallback?: string) => {
    const { inlineMessage, globalMessage } = describeBackendCedulaError(message);

    if (inlineMessage) {
      setFieldError(inlineMessage);
    }

    setError(globalMessage || message || fallback || "No se pudo verificar la cédula");
  };

  const handleCedulaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCedula(value);
    const validationError = validateCedula(value);
    setFieldError(validationError || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError("");
    setFieldError("");
    
    try {
      logger.log("[VerificationScreen] Verificando cédula:", cedula);
      const res = await UsuarioAPI.verificarCedula(cedula);
      logger.log("[VerificationScreen] Respuesta:", res);

      if (res.success) {
        if (res.data?.verified) {
          logger.log("[VerificationScreen] Cédula verificada exitosamente");

          // Actualizar usuario en localStorage primero
          const currentUser = AuthService.getUser();
          if (currentUser) {
            currentUser.cedulaVerificada = true;
            currentUser.cedula = cedula;
            AuthService.setUser(currentUser);
            logger.log("[VerificationScreen] Usuario actualizado en localStorage");
          }

          // Mostrar mensaje de éxito inmediatamente
          setIsVerified(true);

          // Refrescar contexto desde el servidor para obtener datos más recientes
          try {
            logger.log("[VerificationScreen] Refrescando usuario desde servidor...");
            await refreshUser();
            
            // Verificar qué devolvió el refresh
            const refreshedUser = AuthService.getUser();
            logger.log("[VerificationScreen] Usuario después del refresh:", {
              email: refreshedUser?.email,
              cedulaVerificada: refreshedUser?.cedulaVerificada,
              perfilCompleto: refreshedUser?.perfilCompleto
            });
            
            if (!refreshedUser?.cedulaVerificada) {
              logger.error("[VerificationScreen] ⚠️ PROBLEMA: El backend no devolvió cedulaVerificada=true después del refresh");
            } else {
              logger.log("[VerificationScreen] ✅ Usuario refrescado correctamente con cedulaVerificada=true");
            }
          } catch (refreshError) {
            logger.warn("[VerificationScreen] Error al refrescar usuario:", refreshError);
            // Continuar de todos modos, el usuario ya está actualizado en localStorage
          }

          // Esperar 1.5 segundos mostrando el mensaje de éxito antes de redirigir
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Redirigir a home con push en vez de replace para mejor transición
          logger.log("[VerificationScreen] Redirigiendo a /home");
          router.push("/home");
        } else {
          logger.log("[VerificationScreen] Cédula no verificada");
          applyCedulaErrorFeedback(res.message, "Cédula inválida");
        }
      } else {
        logger.log("[VerificationScreen] Error en verificación:", res.message);
        applyCedulaErrorFeedback(res.message, "No se pudo verificar la cédula");
      }
    } catch (err) {
      logger.error("[VerificationScreen] Error:", err);
      const fallback = err instanceof Error ? err.message : undefined;
      applyCedulaErrorFeedback(fallback, "Error al verificar la identidad. Intenta nuevamente.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (isVerified) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-2 xs:px-3 sm:px-4 md:px-6 safe-top safe-bottom max-w-md mx-auto">
        <CheckCircle className="w-20 h-20 xs:w-24 xs:h-24 sm:w-28 sm:h-28 md:w-20 md:h-20 text-green-500 mx-auto mb-5 xs:mb-6 md:mb-4" />
        <h1 className="text-base xs:text-lg sm:text-xl md:text-2xl md:text-xl font-bold text-gray-900 mb-3 xs:mb-4 md:mb-3">¡Verificación exitosa!</h1>
        <p className="text-xs xs:text-sm sm:text-base md:text-sm text-gray-600 mb-6 xs:mb-8 md:mb-6 text-center">Tu identidad ha sido confirmada. Bienvenido a Falta Uno.</p>
        <div className="animate-pulse text-green-600 text-xs xs:text-sm">Redirigiendo...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col safe-top safe-bottom max-w-md mx-auto w-full">
      <div className="pt-16 xs:pt-20 sm:pt-24 md:pt-16 pb-10 xs:pb-12 md:pb-8 text-center safe-top">
        <Shield className="w-14 h-14 xs:w-16 xs:h-16 sm:w-18 sm:h-18 md:w-14 md:h-14 text-green-600 mx-auto mb-5 xs:mb-6 md:mb-4" />
        <h1 className="text-base xs:text-lg sm:text-xl md:text-2xl md:text-xl font-bold text-gray-900 mb-1.5 xs:mb-2">Verificación de Identidad</h1>
        <p className="text-xs xs:text-sm sm:text-base md:text-sm text-gray-600 px-2 xs:px-3 sm:px-4 md:px-6">Ingresá tu cédula para verificar tu identidad</p>
      </div>

      <div className="flex-1 px-2 xs:px-3 sm:px-4 md:px-6 pb-18 xs:pb-20 sm:pb-22 md:pb-24 safe-bottom">
        {error && <div className="mb-3 xs:mb-4 p-3 xs:p-4 bg-red-50 border border-red-200 rounded-xl xs:rounded-2xl text-xs xs:text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3 xs:space-y-4 sm:space-y-5 xs:space-y-4 xs:space-y-3 xs:space-y-4 sm:space-y-5 sm:space-y-6">
          <div>
            <label className="block text-xs xs:text-sm font-medium text-gray-700 mb-1.5 xs:mb-2">
              Número de cédula
            </label>
            <Input
              type="text"
              placeholder="12345678 (sin puntos ni guiones)"
              value={cedula}
              onChange={handleCedulaChange}
              className={`min-h-[48px] text-sm xs:text-base md:text-base ${fieldError ? 'border-red-500' : ''}`}
              maxLength={8}
              required
              disabled={isVerifying}
            />
            <p className="text-[10px] xs:text-xs text-gray-500 mt-1 xs:mt-1.5">
              Ingresá solo números, sin puntos ni guiones
            </p>
            {fieldError && (
              <p className="text-xs xs:text-sm text-red-500 mt-1 xs:mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                {fieldError}
              </p>
            )}
          </div>
          <Button 
            type="submit" 
            disabled={isVerifying || !!fieldError || !cedula} 
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white py-3.5 xs:py-4 min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] rounded-xl xs:rounded-2xl touch-manipulation active:scale-[0.98]"
          >
            {isVerifying ? "Verificando..." : "Verificar Identidad"}
          </Button>
        </form>
        {isVerifying && (
          <div className="mt-6 xs:mt-8 text-center">
            <LoadingSpinner size="xl" variant="green" text="Consultando registro uruguayo..." />
          </div>
        )}

        {/* Botón volver */}
        <div className="mt-5 xs:mt-6 text-center">
          <Button
            onClick={() => router.push('/profile-setup')}
            variant="ghost"
            size="sm"
            disabled={isVerifying}
            className="min-h-[40px] xxs:min-h-[42px] xs:min-h-[44px] sm:min-h-[46px] md:min-h-[48px] touch-manipulation text-xs xs:text-sm"
          >
            <ArrowLeft className="mr-1.5 xs:mr-2 h-3.5 w-3.5 xs:h-4 xs:w-4" />
            Volver al perfil
          </Button>
        </div>
      </div>
    </div>
  );
}

export default VerificationScreen;