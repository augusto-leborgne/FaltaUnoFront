"use client"

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { API_URL } from '@/lib/api'
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Mail, ArrowLeft } from 'lucide-react';
import { InlineSpinner, LoadingSpinner } from '@/components/ui/loading-spinner';
import { logger } from '@/lib/logger';
import { AuthService } from '@/lib/auth';
import { useAuth } from '@/hooks/use-auth';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const { setUser } = useAuth(); // ✅ Para actualizar el contexto después de verificar

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutos en segundos
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ✅ Detectar si el usuario viene de login (ya tiene token)
  const isFromLogin = useRef(!!AuthService.getToken());

  // Redirect si no hay email
  useEffect(() => {
    if (!email) {
      router.push('/register');
    }
  }, [email, router]);

  // Timer de expiración
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Cooldown de reenvío
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Formatear tiempo restante
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Manejar cambio en input de código
  const handleCodeChange = (index: number, value: string) => {
    // Solo permitir números
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Auto-focus al siguiente input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Manejar teclas especiales
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      // Si está vacío y presiona backspace, ir al anterior
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Manejar paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    // Solo aceptar 6 dígitos
    if (!/^\d{6}$/.test(pastedData)) return;

    const newCode = pastedData.split('');
    setCode(newCode);
    inputRefs.current[5]?.focus();
  };

  // Verificar código
  const handleVerify = async () => {
    const codeString = code.join('');
    
    if (codeString.length !== 6) {
      setError('Por favor ingresa el código completo');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seg timeout

      const response = await fetch(`${API_URL}/verification/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code: codeString,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data?.verified) {
        setSuccess(true);
        setError(''); // Limpiar cualquier error previo

        // If backend returned a token + usuario we can auto-login
        const returnedToken = data.data.token as string | undefined;
        const returnedUser = data.data.usuario || data.data.user;

        if (returnedToken) {
          // Persist token and user in AuthService and context
          try {
            AuthService.setToken(returnedToken);
          } catch (e) {
            logger.warn('[VerifyEmail] Failed to set token in AuthService', e);
          }
        }

        if (returnedUser) {
          try {
            AuthService.setUser(returnedUser);
            setUser(returnedUser);
            logger.log('[VerifyEmail] Usuario recibido desde backend y almacenado en contexto');
          } catch (e) {
            logger.warn('[VerifyEmail] Failed to set user in AuthService/context', e);
          }
        }

        // If user came from login flow, prefer updating existing user flag when no usuario was returned
        if (isFromLogin.current && !returnedUser) {
          const currentUser = AuthService.getUser();
          if (currentUser) {
            const updatedUser = { ...currentUser, emailVerified: true };
            AuthService.setUser(updatedUser);
            setUser(updatedUser);
            logger.log('[VerifyEmail] Usuario actualizado con emailVerified=true');
          }
        }

        // Redirect: if we have a user object prefer to read perfilCompleto from it
        setTimeout(() => {
          const userForRedirect = returnedUser || AuthService.getUser();
          if (userForRedirect?.perfilCompleto) {
            router.push('/home');
          } else {
            // Fallback: if we don't have a token/usuario (older backend), keep compatibility
            if (!returnedToken && !returnedUser) {
              // ✅ Si viene de registro, usar sessionStorage (se limpia al cerrar pestaña)
              sessionStorage.setItem('pendingVerification', JSON.stringify({
                email: email!,
                passwordHash: data.data.passwordHash,
                timestamp: Date.now()
              }));
            }
            router.push('/profile-setup');
          }
        }, 2500);
      } else {
        // Mensajes de error específicos del backend
        const errorMsg = data.message || 'Código inválido o expirado'
        
        if (errorMsg.toLowerCase().includes('expirado') || errorMsg.toLowerCase().includes('expired')) {
          setError('El código ha expirado. Por favor solicita uno nuevo haciendo clic en "Reenviar código".')
        } else if (errorMsg.toLowerCase().includes('incorrecto') || errorMsg.toLowerCase().includes('incorrect') || errorMsg.toLowerCase().includes('invalid')) {
          setError('El código ingresado es incorrecto. Verifica los 6 dígitos y vuelve a intentar.')
        } else if (errorMsg.toLowerCase().includes('no encontrado') || errorMsg.toLowerCase().includes('not found')) {
          setError('No se encontró una solicitud de verificación. Por favor regístrate nuevamente.')
        } else {
          setError(errorMsg)
        }
        
        setSuccess(false);
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      logger.error('Error verificando código:', err);
      
      // ✅ Mensajes de error mejorados
      if (err.name === 'AbortError') {
        setError('La conexión tardó demasiado. Verifica tu internet e intenta nuevamente.');
      } else if (err.message?.toLowerCase().includes('network') || err.message?.toLowerCase().includes('failed to fetch')) {
        setError('No se pudo conectar al servidor. Verifica tu conexión a internet.');
      } else {
        setError('Error al verificar el código. Por favor intenta nuevamente o solicita un código nuevo.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // Reenviar código
  const handleResend = async () => {
    setIsResending(true);
    setError('');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seg timeout

      const response = await fetch(`${API_URL}/verification/resend-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        // Reset timer y código
        setTimeLeft(15 * 60);
        setCanResend(false);
        setResendCooldown(60); // 60 segundos de cooldown
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        
        // Mostrar mensaje de éxito brevemente
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const errorMsg = data.message || 'Error al reenviar el código'
        
        if (errorMsg.toLowerCase().includes('no encontrado') || errorMsg.toLowerCase().includes('not found')) {
          setError('No se encontró tu solicitud de registro. Por favor regístrate nuevamente.');
        } else if (errorMsg.toLowerCase().includes('cooldown') || errorMsg.toLowerCase().includes('wait')) {
          setError('Debes esperar antes de solicitar otro código. Por favor intenta en unos momentos.');
        } else {
          setError(errorMsg);
        }
      }
    } catch (err: any) {
      logger.error('Error reenviando código:', err);
      
      // ✅ Mensajes de error mejorados
      if (err.name === 'AbortError') {
        setError('La conexión tardó demasiado. Verifica tu internet e intenta nuevamente.');
      } else if (err.message?.toLowerCase().includes('network') || err.message?.toLowerCase().includes('failed to fetch')) {
        setError('No se pudo conectar al servidor. Verifica tu conexión a internet.');
      } else {
        setError('Error al reenviar el código. Por favor intenta nuevamente en unos momentos.');
      }
    } finally {
      setIsResending(false);
    }
  };

  // Auto-verificar cuando se completen los 6 dígitos
  useEffect(() => {
    if (code.every(digit => digit !== '') && !isVerifying) {
      handleVerify();
    }
  }, [code]);

  if (!email) {
    return null; // Se redirigirá automáticamente
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-all ${
            success 
              ? 'bg-green-500 animate-in zoom-in-50' 
              : 'bg-green-100'
          }`}>
            {success ? (
              <CheckCircle2 className="w-8 h-8 text-white" />
            ) : (
              <Mail className="w-8 h-8 text-green-600" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {success ? '¡Verificado!' : 'Verifica tu email'}
          </h1>
          <p className="text-gray-600">
            {success ? (
              'Tu email ha sido confirmado exitosamente'
            ) : isFromLogin.current ? (
              <>
                Para continuar, verifica tu email con el código enviado a
                <span className="block text-green-600 font-semibold mt-1">
                  {email}
                </span>
              </>
            ) : (
              <>
                Hemos enviado un código de 6 dígitos a
                <span className="block text-green-600 font-semibold mt-1">
                  {email}
                </span>
              </>
            )}
          </p>
        </div>

        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Inputs de código */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
              Ingresa el código de verificación
            </label>
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`w-12 h-14 text-center text-2xl font-bold border-2 transition-all ${
                    success 
                      ? 'border-green-500 bg-green-50 text-green-700' 
                      : 'focus:border-green-500 focus:ring-green-500'
                  }`}
                  disabled={isVerifying || success}
                />
              ))}
            </div>
          </div>

          {/* Timer */}
          <div className="text-center">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
              timeLeft < 60 
                ? 'bg-red-100 text-red-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                timeLeft < 60 ? 'bg-red-500 animate-pulse' : 'bg-green-500'
              }`} />
              <span className="text-sm font-medium">
                {timeLeft > 0 ? (
                  <>Expira en {formatTime(timeLeft)}</>
                ) : (
                  <>Código expirado</>
                )}
              </span>
            </div>
          </div>

          {/* Mensajes de error/éxito */}
          {error && !success && (
            <Alert variant="destructive" className="animate-in fade-in-50 slide-in-from-top-2">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="font-medium">{error}</AlertDescription>
            </Alert>
          )}

          {success && !error && !isResending && (
            <Alert className="border-green-500 bg-green-50 text-green-900 shadow-lg animate-in fade-in-50 slide-in-from-top-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <AlertDescription className="space-y-1">
                <div className="font-bold text-base">¡Email verificado correctamente! ✨</div>
                <div className="text-sm text-green-700">Redirigiendo a configurar tu perfil...</div>
              </AlertDescription>
            </Alert>
          )}

          {success && !error && isResending && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                ¡Código reenviado! Revisa tu email.
              </AlertDescription>
            </Alert>
          )}

          {/* Botón de verificar manual (solo si no auto-verifica) */}
          <Button
            onClick={handleVerify}
            disabled={code.some(d => d === '') || isVerifying || success}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {isVerifying ? (
              <div className="flex items-center">
                <InlineSpinner variant="white" />
                <span className="ml-2">Verificando...</span>
              </div>
            ) : success ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                ¡Verificado!
              </>
            ) : (
              'Verificar código'
            )}
          </Button>

          {/* Botón de reenviar */}
          {!success && (
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                ¿No recibiste el código?
              </p>
              <Button
                onClick={handleResend}
                disabled={!canResend && resendCooldown === 0 || isResending || resendCooldown > 0}
                variant="outline"
                size="sm"
              >
                {isResending ? (
                  <div className="flex items-center">
                    <InlineSpinner />
                    <span className="ml-2">Reenviando...</span>
                  </div>
                ) : resendCooldown > 0 ? (
                  <>Reenviar en {resendCooldown}s</>
                ) : (
                  'Reenviar código'
                )}
              </Button>
            </div>
          )}

          {/* Consejos */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="text-xs font-medium text-gray-700">💡 Consejos:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Revisa tu bandeja de spam si no ves el email</li>
              <li>• El código es válido por 15 minutos</li>
              <li>• Puedes pegar el código directamente</li>
            </ul>
          </div>
        </div>

        {/* Botón volver */}
        <div className="mt-6 text-center">
          <Button
            onClick={() => router.push('/register')}
            variant="ghost"
            size="sm"
            disabled={isVerifying}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al registro
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center">
        <LoadingSpinner size="xl" variant="green" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
