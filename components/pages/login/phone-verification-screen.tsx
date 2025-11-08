"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Smartphone, CheckCircle, AlertCircle, Shield, Users } from "lucide-react";
import { UsuarioAPI } from "@/lib/api";
import { AuthService } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { logger } from "@/lib/logger";
import { withRetry, formatErrorMessage } from "@/lib/api-utils";

// Códigos de país comunes en la región
const COUNTRY_CODES = [
  { code: "+598", country: "Uruguay", flag: "🇺🇾" },
  { code: "+54", country: "Argentina", flag: "🇦🇷" },
  { code: "+55", country: "Brasil", flag: "🇧🇷" },
  { code: "+56", country: "Chile", flag: "🇨🇱" },
  { code: "+595", country: "Paraguay", flag: "🇵🇾" },
  { code: "+1", country: "USA/Canadá", flag: "🌎" },
  { code: "+34", country: "España", flag: "🇪🇸" },
];

export function PhoneVerificationScreen() {
  const router = useRouter();
  const { refreshUser, setUser } = useAuth();
  const [countryCode, setCountryCode] = React.useState("+598");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [error, setError] = React.useState("");
  const [fieldError, setFieldError] = React.useState("");
  const [showCountryDropdown, setShowCountryDropdown] = React.useState(false);

  // Validar número de teléfono
  const validatePhoneNumber = (value: string): string | null => {
    if (!value) return "El número es requerido";
    
    // Eliminar espacios
    const cleanPhone = value.replace(/\s/g, '');
    
    // Debe tener entre 6 y 15 dígitos
    if (!/^\d{6,15}$/.test(cleanPhone)) {
      return "Número inválido (6-15 dígitos)";
    }
    
    return null;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Solo permitir números y espacios
    const cleaned = value.replace(/[^\d\s]/g, '');
    setPhoneNumber(cleaned);
    const validationError = validatePhoneNumber(cleaned);
    setFieldError(validationError || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    
    try {
      const fullPhone = `${countryCode} ${phoneNumber.replace(/\s/g, '')}`;
      logger.log("[PhoneVerification] Updating phone:", fullPhone);
      
      // ⚡ IMPROVED: Use retry logic for critical phone update
      const res = await withRetry(
        () => UsuarioAPI.actualizarPerfil({ celular: fullPhone }),
        {
          maxRetries: 2,
          delayMs: 1500,
          shouldRetry: (error) => {
            // Retry on network errors or 5xx
            return error.name === 'AbortError' || 
                   error.message?.includes('timeout') ||
                   (error.status >= 500 && error.status < 600)
          }
        }
      )
      
      logger.log("[PhoneVerification] Update response:", res);

      if (res.success && res.data) {
        logger.log("[PhoneVerification] Phone updated successfully");
        
        // ⚡ CRITICAL: Refresh user IMMEDIATELY from server to get updated state
        logger.log("[PhoneVerification] Refreshing user from server...");
        const refreshed = await refreshUser();
        
        if (refreshed && refreshed.celular) {
          logger.log("[PhoneVerification] User refreshed successfully:", { 
            email: refreshed.email, 
            celular: refreshed.celular,
            perfilCompleto: refreshed.perfilCompleto 
          });
          
          // Update context with server data
          setUser(refreshed);
          
          // Show success message
          setIsSuccess(true);
          
          // Small delay for user to see success message
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // ⚡ CRITICAL FIX: Only redirect to /home if profile is COMPLETE
          const isComplete = refreshed.perfilCompleto === true
          
          if (isComplete) {
            logger.log("[PhoneVerification] Profile complete, redirecting to /home");
            router.replace("/home");
          } else {
            logger.warn("[PhoneVerification] Phone updated but profile incomplete, redirecting to /profile-setup");
            router.replace("/profile-setup");
          }
        } else {
          logger.error("[PhoneVerification] Failed to refresh user from server");
          throw new Error("No se pudo verificar la actualización. Por favor, intenta nuevamente.");
        }
      } else {
        logger.log("[PhoneVerification] Update failed:", res.message);
        setError(res.message ?? "No se pudo actualizar el número de celular");
      }
    } catch (err: any) {
      logger.error("[PhoneVerification] Error:", err);
      const userMessage = formatErrorMessage(err)
      setError(userMessage);
      setIsSuccess(false);
    } finally {
      // ⚡ IMPROVED: Always reset submitting state, even on error
      setIsSubmitting(false);
    }
  };

  // Nota: se eliminó la opción de "Omitir". La verificación de celular es obligatoria en el flujo de onboarding.

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
        <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 mb-4">¡Celular agregado!</h1>
        <p className="text-gray-600 mb-8 text-center">
          Tu número de celular ha sido guardado correctamente.
        </p>
        <div className="animate-pulse text-green-600">Redirigiendo...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header fijo - mismo estilo que profile-setup */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-6">
          <div className="text-center">
            <Smartphone className="w-12 h-12 text-primary mx-auto mb-3" />
            <h1 className="text-3xl font-bold text-gray-900">
              Verifica tu celular
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Para una mejor experiencia y comunidad más segura
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 pb-20">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cards de explicación - diseño modernizado */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1 text-lg">Comunidad más segura</h3>
                  <p className="text-sm text-gray-600">
                    Ayuda a crear un entorno de confianza para todos los jugadores.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1 text-lg">Mejor experiencia</h3>
                  <p className="text-sm text-gray-600">
                    Conecta fácilmente con tus contactos que también usan Falta Uno.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Formulario de celular - mismo estilo que profile-setup */}
          <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                <Smartphone className="w-4 h-4 text-primary" />
              </div>
              Tu número de celular
            </h2>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <div className="space-y-4">
              {/* Selector de código de país */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Código de país *
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary transition-all text-left flex items-center justify-between"
                    disabled={isSubmitting}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-xl">{COUNTRY_CODES.find(c => c.code === countryCode)?.flag}</span>
                      <span>{countryCode}</span>
                      <span className="text-gray-500">- {COUNTRY_CODES.find(c => c.code === countryCode)?.country}</span>
                    </span>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showCountryDropdown && (
                    <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                      {COUNTRY_CODES.map((item) => (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => {
                            setCountryCode(item.code);
                            setShowCountryDropdown(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                        >
                          <span className="text-xl">{item.flag}</span>
                          <span className="font-medium">{item.code}</span>
                          <span className="text-gray-600">- {item.country}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Input de número */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Número de celular *
                </label>
                <Input
                  type="tel"
                  placeholder="Ej: 099 123 456"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  className={`${fieldError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-primary'}`}
                  maxLength={20}
                  required
                  disabled={isSubmitting}
                />
                {fieldError && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldError}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Formato final: {countryCode} {phoneNumber || "XXXXXXXXX"}
                </p>
              </div>
            </div>
          </div>

          {/* Botones - mismo estilo que profile-setup */}
          <div className="space-y-3">
            <Button 
              type="submit" 
              disabled={isSubmitting || !!fieldError || !phoneNumber} 
              className="w-full bg-primary text-white py-6 rounded-2xl hover:bg-primary/90 transition-all text-base font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </span>
              ) : (
                "Agregar número"
              )}
            </Button>
            
            {/* Omitir eliminado: verificación de celular obligatoria */}
          </div>
          
          <p className="text-xs text-gray-500 text-center mt-4">
            Podrás agregar o cambiar tu número más tarde desde la configuración.
          </p>
        </form>
      </div>
    </div>
  );
}

export default PhoneVerificationScreen;
