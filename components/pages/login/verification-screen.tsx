"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Shield, CheckCircle, AlertCircle } from "lucide-react";
import { UsuarioAPI } from "@/lib/api";
import { AuthService } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";

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
    
    try {
      console.log("[VerificationScreen] Verificando cédula:", cedula);
      const res = await UsuarioAPI.verificarCedula(cedula);
      console.log("[VerificationScreen] Respuesta:", res);

      if (res.success) {
        if (res.data?.verified) {
          console.log("[VerificationScreen] Cédula verificada exitosamente");

          // Actualizar usuario en localStorage primero
          const currentUser = AuthService.getUser();
          if (currentUser) {
            currentUser.cedulaVerificada = true;
            currentUser.cedula = cedula;
            AuthService.setUser(currentUser);
            console.log("[VerificationScreen] Usuario actualizado en localStorage");
          }

          // Refrescar contexto desde el servidor para obtener datos más recientes
          try {
            console.log("[VerificationScreen] Refrescando usuario desde servidor...");
            await refreshUser();
            console.log("[VerificationScreen] Usuario refrescado exitosamente");
          } catch (refreshError) {
            console.warn("[VerificationScreen] Error al refrescar usuario:", refreshError);
            // Continuar de todos modos, el usuario ya está actualizado en localStorage
          }

          // Mostrar mensaje de éxito
          setIsVerified(true);

          // Redirigir a home después de un delay
          console.log("[VerificationScreen] Redirigiendo a /home");
          setTimeout(() => {
            router.replace("/home");
          }, 1500);
        } else {
          console.log("[VerificationScreen] Cédula no verificada");
          setError(res.message ?? "Cédula inválida");
        }
      } else {
        console.log("[VerificationScreen] Error en verificación:", res.message);
        setError(res.message ?? "No se pudo verificar la cédula");
      }
    } catch (err) {
      console.error("[VerificationScreen] Error:", err);
      setError("Error al verificar la identidad. Intenta nuevamente.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (isVerified) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 mb-4">¡Verificación exitosa!</h1>
        <p className="text-gray-600 mb-8">Tu identidad ha sido confirmada. Bienvenido a Falta Uno.</p>
        <div className="animate-pulse text-green-600">Redirigiendo...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="pt-20 pb-12 text-center">
        <Shield className="w-16 h-16 text-green-600 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Verificación de Identidad</h1>
        <p className="text-gray-600 px-6">Ingresa tu cédula para verificar tu identidad</p>
      </div>

      <div className="flex-1 px-6">
        {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Input
              type="text"
              placeholder="Número de cédula (ej: 1.234.567-8)"
              value={cedula}
              onChange={handleCedulaChange}
              className={fieldError ? 'border-red-500' : ''}
              maxLength={10}
              required
              disabled={isVerifying}
            />
            {fieldError && (
              <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {fieldError}
              </p>
            )}
          </div>
          <Button 
            type="submit" 
            disabled={isVerifying || !!fieldError || !cedula} 
            className="w-full bg-green-600 text-white py-4 rounded-2xl"
          >
            {isVerifying ? "Verificando..." : "Verificar Identidad"}
          </Button>
        </form>
        {isVerifying && (
          <div className="mt-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Consultando registro uruguayo...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerificationScreen;