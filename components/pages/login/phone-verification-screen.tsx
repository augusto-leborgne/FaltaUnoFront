"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Smartphone, CheckCircle, AlertCircle, Shield, Users, ArrowLeft } from "lucide-react";
import { UsuarioAPI, API_URL } from "@/lib/api";
import { AuthService } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { logger } from "@/lib/logger";
import { withRetry, formatErrorMessage } from "@/lib/api-utils";
import { ProfileSetupStorage } from "@/lib/profile-setup-storage";
import { useClickOutside } from "@/hooks/use-click-outside";

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
  const [isCheckingPhone, setIsCheckingPhone] = React.useState(false);
  const [phoneCheckDebounce, setPhoneCheckDebounce] = React.useState<NodeJS.Timeout | null>(null);
  const [canGoBack, setCanGoBack] = React.useState(false);
  
  // Phone verification with SMS code states
  const [step, setStep] = React.useState<'phone' | 'code'>('phone');
  const [verificationCode, setVerificationCode] = React.useState("");
  const [resendCooldown, setResendCooldown] = React.useState(0);
  const [attempts, setAttempts] = React.useState(0);
  
  // Ref para el dropdown
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  
  // Cerrar dropdown al hacer click fuera
  useClickOutside(dropdownRef, () => setShowCountryDropdown(false), showCountryDropdown);

  // Verificar si hay datos guardados para permitir volver atrás
  React.useEffect(() => {
    setCanGoBack(ProfileSetupStorage.hasData());
  }, []);

  // Manejar el botón back del navegador
  React.useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      if (canGoBack) {
        router.push('/profile-setup');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [canGoBack, router]);

  // Verificar si el teléfono ya está registrado
  const checkPhoneAvailability = React.useCallback(async (fullPhone: string) => {
    if (!fullPhone || fullPhone.length < 10) return;

    setIsCheckingPhone(true);
    try {
      const response = await fetch(`${API_URL}/auth/check-phone?phone=${encodeURIComponent(fullPhone)}`);
      const data = await response.json();

      if (data.success && data.data) {
        if (data.data.exists) {
          setFieldError("Este número ya está registrado por otro usuario");
        } else {
          // Teléfono disponible, limpiar error de existencia
          if (fieldError === "Este número ya está registrado por otro usuario") {
            setFieldError("");
          }
        }
      }
    } catch (err) {
      logger.error("[PhoneVerification] Error checking phone:", err);
    } finally {
      setIsCheckingPhone(false);
    }
  }, [fieldError]);

  // Cleanup debounce
  React.useEffect(() => {
    return () => {
      if (phoneCheckDebounce) {
        clearTimeout(phoneCheckDebounce);
      }
    };
  }, [phoneCheckDebounce]);

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

    // Verificar disponibilidad con debounce
    if (phoneCheckDebounce) {
      clearTimeout(phoneCheckDebounce);
    }

    if (!validationError && cleaned) {
      const timeout = setTimeout(() => {
        const fullPhone = `${countryCode}${cleaned.replace(/\s/g, '')}`;
        checkPhoneAvailability(fullPhone);
      }, 800);
      setPhoneCheckDebounce(timeout);
    }
  };

  // Resend cooldown timer
  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleGoBack = () => {
    if (step === 'code') {
      setStep('phone');
      setVerificationCode("");
      setError("");
    } else {
      router.push('/profile-setup');
    }
  };

  // Step 1: Send SMS verification code
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    
    try {
      const fullPhone = `${countryCode}${phoneNumber.replace(/\s/g, '')}`;
      logger.log("[PhoneVerification] Sending code to:", fullPhone);
      
      const response = await fetch(`${API_URL}/phone-verification/send`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`
        },
        body: JSON.stringify({ phoneNumber: fullPhone }),
      });

      const data = await response.json();
      
      if (data.success) {
        logger.log("[PhoneVerification] Code sent successfully");
        setStep('code');
        setResendCooldown(60); // 60 second cooldown for resend
        setError("");
      } else {
        setError(data.message || "Error al enviar el código");
      }
    } catch (err: any) {
      logger.error("[PhoneVerification] Error sending code:", err);
      setError(formatErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend SMS code
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    
    setIsSubmitting(true);
    setError("");
    
    try {
      const fullPhone = `${countryCode}${phoneNumber.replace(/\s/g, '')}`;
      
      const response = await fetch(`${API_URL}/phone-verification/resend`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`
        },
        body: JSON.stringify({ phoneNumber: fullPhone }),
      });

      const data = await response.json();
      
      if (data.success) {
        logger.log("[PhoneVerification] Code resent successfully");
        setResendCooldown(60);
        setError("");
      } else {
        setError(data.message || "Error al reenviar el código");
      }
    } catch (err: any) {
      logger.error("[PhoneVerification] Error resending code:", err);
      setError(formatErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify SMS code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    
    try {
      const fullPhone = `${countryCode}${phoneNumber.replace(/\s/g, '')}`;
      logger.log("[PhoneVerification] Verifying code for:", fullPhone);
      
      const response = await fetch(`${API_URL}/phone-verification/verify`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`
        },
        body: JSON.stringify({ 
          phoneNumber: fullPhone,
          code: verificationCode 
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        logger.log("[PhoneVerification] Code verified successfully");
        
        // Update phone in user profile
        const res = await withRetry(
          () => UsuarioAPI.actualizarPerfil({ celular: fullPhone }),
          {
            maxRetries: 2,
            delayMs: 1500,
            shouldRetry: (error) => {
              return error.name === 'AbortError' || 
                     error.message?.includes('timeout') ||
                     (error.status >= 500 && error.status < 600)
            }
          }
        );
        
        if (res.success && res.data) {
          logger.log("[PhoneVerification] Phone updated successfully");
          
          // Refresh user from server
          const refreshed = await refreshUser();
          
          if (refreshed && refreshed.celular) {
            setUser(refreshed);
            setIsSuccess(true);
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const isComplete = refreshed.perfilCompleto === true;
            
            if (isComplete) {
              logger.log("[PhoneVerification] Profile complete, redirecting to /home");
              ProfileSetupStorage.clear();
              router.replace("/home");
            } else {
              logger.warn("[PhoneVerification] Phone updated but profile incomplete, redirecting to /profile-setup");
              router.replace("/profile-setup");
            }
          } else {
            throw new Error("No se pudo verificar la actualización");
          }
        } else {
          throw new Error(res.message ?? "No se pudo actualizar el número de celular");
        }
      } else {
        setAttempts(prev => prev + 1);
        setError(data.message || "Código incorrecto");
        
        if (attempts >= 2) {
          setError("Demasiados intentos fallidos. Por favor solicita un nuevo código.");
          setStep('phone');
          setVerificationCode("");
          setAttempts(0);
        }
      }
    } catch (err: any) {
      logger.error("[PhoneVerification] Error verifying code:", err);
      setError(formatErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
        <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 mb-4">¡Celular verificado!</h1>
        <p className="text-gray-600 mb-8 text-center">
          Tu número de celular ha sido verificado correctamente.
        </p>
        <div className="animate-pulse text-green-600">Redirigiendo...</div>
      </div>
    );
  }

  // Step 2: Verification code input
  if (step === 'code') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-6 py-6">
            <div className="text-center">
              <Smartphone className="w-12 h-12 text-primary mx-auto mb-3" />
              <h1 className="text-3xl font-bold text-gray-900">
                Ingresa el código
              </h1>
              <p className="text-sm text-gray-600 mt-2">
                Enviamos un código a {countryCode} {phoneNumber}
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-8 pb-20">
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Código de verificación</h2>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Código de 6 dígitos *
                  </label>
                  <Input
                    type="text"
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setVerificationCode(value);
                    }}
                    className="text-center text-2xl tracking-widest font-mono"
                    maxLength={6}
                    required
                    disabled={isSubmitting}
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Revisa tu mensaje de texto
                  </p>
                </div>

                {/* Resend button */}
                <div className="text-center">
                  {resendCooldown > 0 ? (
                    <p className="text-sm text-gray-500">
                      Reenviar código en {resendCooldown}s
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={isSubmitting}
                      className="text-sm text-primary hover:text-primary/80 font-medium disabled:opacity-50"
                    >
                      Reenviar código
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                type="button"
                onClick={handleGoBack}
                variant="outline"
                className="w-full py-5 sm:py-6 rounded-xl sm:rounded-2xl transition-all text-sm sm:text-base font-semibold border-2 border-gray-300 hover:border-primary hover:bg-primary/5 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                Cambiar número
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting || verificationCode.length !== 6}
                className="w-full bg-primary text-white py-5 sm:py-6 rounded-xl sm:rounded-2xl hover:bg-primary/90 transition-all text-sm sm:text-base font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verificando...
                  </span>
                ) : (
                  "Verificar código"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Step 1: Phone number input

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
        <form onSubmit={handleSendCode} className="space-y-6">
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
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-gray-300 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary transition-all text-left flex items-center justify-between text-sm sm:text-base"
                    disabled={isSubmitting}
                  >
                    <span className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-lg sm:text-xl">{COUNTRY_CODES.find(c => c.code === countryCode)?.flag}</span>
                      <span className="font-medium">{countryCode}</span>
                      <span className="text-gray-500 text-xs sm:text-sm truncate">- {COUNTRY_CODES.find(c => c.code === countryCode)?.country}</span>
                    </span>
                    <svg className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform flex-shrink-0 ${showCountryDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showCountryDropdown && (
                    <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl sm:rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                      {COUNTRY_CODES.map((item) => (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => {
                            setCountryCode(item.code);
                            setShowCountryDropdown(false);
                          }}
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 sm:gap-3 transition-colors first:rounded-t-xl first:sm:rounded-t-2xl last:rounded-b-xl last:sm:rounded-b-2xl text-sm sm:text-base"
                        >
                          <span className="text-lg sm:text-xl">{item.flag}</span>
                          <span className="font-medium">{item.code}</span>
                          <span className="text-gray-600 text-xs sm:text-sm">- {item.country}</span>
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
                <div className="relative">
                  <Input
                    type="tel"
                    placeholder="Ej: 099 123 456"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    className={`${fieldError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-primary'} ${isCheckingPhone ? 'pr-10' : ''}`}
                    maxLength={20}
                    required
                    disabled={isSubmitting}
                  />
                  {/* Indicador de verificación */}
                  {isCheckingPhone && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <svg className="animate-spin h-4 h-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                </div>
                {fieldError && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldError}
                  </p>
                )}
                {isCheckingPhone && !fieldError && (
                  <p className="text-xs text-gray-500 mt-1">
                    Verificando disponibilidad...
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
            {/* Botón volver - solo si hay datos guardados */}
            {canGoBack && (
              <Button
                type="button"
                onClick={handleGoBack}
                variant="outline"
                className="w-full py-5 sm:py-6 rounded-xl sm:rounded-2xl transition-all text-sm sm:text-base font-semibold border-2 border-gray-300 hover:border-primary hover:bg-primary/5 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                Volver y editar perfil
              </Button>
            )}
            
            <Button 
              type="submit" 
              disabled={isSubmitting || !!fieldError || !phoneNumber} 
              className="w-full bg-primary text-white py-5 sm:py-6 rounded-xl sm:rounded-2xl hover:bg-primary/90 transition-all text-sm sm:text-base font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enviando código...
                </span>
              ) : (
                "Enviar código de verificación"
              )}
            </Button>
            
            {/* Omitir eliminado: verificación de celular obligatoria */}
          </div>
        </form>
      </div>
    </div>
  );
}

export default PhoneVerificationScreen;
