"use client"

import { useState, useEffect, useRef, Suspense, useCallback } from 'react'
import type { ClipboardEvent as ReactClipboardEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
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

const CODE_LENGTH = 6
const CODE_EXPIRATION_MS = 5 * 60 * 1000
const RESEND_COOLDOWN_MS = 60 * 1000

const getStoredTimestamp = (key: string | null, fallback: number) => {
  if (!key || typeof window === 'undefined') {
    return fallback
  }
  const raw = window.sessionStorage.getItem(key)
  const parsed = raw ? parseInt(raw, 10) : NaN
  return Number.isFinite(parsed) ? parsed : fallback
}

const persistTimestamp = (key: string | null, value: number) => {
  if (!key || typeof window === 'undefined') {
    return
  }
  window.sessionStorage.setItem(key, value.toString())
}

const createEmptyCode = () => Array(CODE_LENGTH).fill('') as string[]

const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const { setUser } = useAuth(); // ✅ Para actualizar el contexto después de verificar

  const expirationKey = email ? `verify-email:expires:${email}` : null;
  const resendKey = email ? `verify-email:resend:${email}` : null;
  
  // Si el código está expirado, resetear al entrar
  const storedExpiration = getStoredTimestamp(expirationKey, 0);
  const now = Date.now();
  const isExpired = storedExpiration > 0 && storedExpiration < now;
  const initialExpiresAt = isExpired ? now + CODE_EXPIRATION_MS : getStoredTimestamp(expirationKey, now + CODE_EXPIRATION_MS);
  const initialResendAvailableAt = getStoredTimestamp(resendKey, now);

  const [code, setCode] = useState<string[]>(createEmptyCode);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, Math.floor((initialExpiresAt - Date.now()) / 1000)));
  const [resendAvailableAt, setResendAvailableAt] = useState(initialResendAvailableAt);
  const [resendCooldown, setResendCooldown] = useState(() => Math.max(0, Math.floor((initialResendAvailableAt - Date.now()) / 1000)));

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const canResend = resendCooldown <= 0 && !isResending;

  // ✅ Detectar si el usuario viene de login (ya tiene token)
  const isFromLogin = useRef(!!AuthService.getToken());
  const resendSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resendSuccessTimeoutRef.current) {
        clearTimeout(resendSuccessTimeoutRef.current);
      }
    }
  }, [])

  const focusInput = useCallback((index: number) => {
    const targetIndex = Math.min(Math.max(index, 0), CODE_LENGTH - 1);
    const input = inputRefs.current[targetIndex];
    if (!input) return;
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }, []);

  // Redirect si no hay email
  useEffect(() => {
    if (!email) {
      router.push('/register');
    }
  }, [email, router]);

  // Timer de expiración persistente
  useEffect(() => {
    if (typeof window === 'undefined') return
    const tick = () => {
      setTimeLeft(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)))
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [expiresAt])

  useEffect(() => {
    persistTimestamp(expirationKey, expiresAt)
  }, [expiresAt, expirationKey])

  useEffect(() => {
    persistTimestamp(resendKey, resendAvailableAt)
  }, [resendAvailableAt, resendKey])

  // Cooldown de reenvío persistente
  useEffect(() => {
    if (typeof window === 'undefined') return
    const tick = () => {
      setResendCooldown(Math.max(0, Math.floor((resendAvailableAt - Date.now()) / 1000)))
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [resendAvailableAt])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const syncTimers = () => {
      setTimeLeft(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)))
      setResendCooldown(Math.max(0, Math.floor((resendAvailableAt - Date.now()) / 1000)))
    }

    window.addEventListener('focus', syncTimers)
    document.addEventListener('visibilitychange', syncTimers)
    return () => {
      window.removeEventListener('focus', syncTimers)
      document.removeEventListener('visibilitychange', syncTimers)
    }
  }, [expiresAt, resendAvailableAt])

  // Verificar código
  const handleVerify = useCallback(async () => {
      const codeString = code.join('');

      if (codeString.length !== CODE_LENGTH) {
        setError('Por favor ingresa el código completo');
        return;
      }

      if (!email) {
        setError('No encontramos tu solicitud de verificación. Regresa al registro para obtener un nuevo código.');
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
          setResendSuccess(false);
          setError('');

          const returnedToken = data.data.token as string | undefined;
          const returnedUser = data.data.usuario || data.data.user;

          if (returnedToken) {
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

          if (isFromLogin.current && !returnedUser) {
            const currentUser = AuthService.getUser();
            if (currentUser) {
              const updatedUser = { ...currentUser, emailVerified: true };
              AuthService.setUser(updatedUser);
              setUser(updatedUser);
              logger.log('[VerifyEmail] Usuario actualizado con emailVerified=true');
            }
          }

          setTimeout(() => {
            if (returnedUser) {
              const { decidePostAuthRoute } = require('@/lib/navigation');
              const nextRoute = decidePostAuthRoute(returnedUser);
              router.push(nextRoute);
            } else {
              router.push('/profile-setup');
            }
          }, 2500);
        } else {
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
          setCode(createEmptyCode());
          focusInput(0);
        }
      } catch (err: any) {
        logger.error('Error verificando código:', err);

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
    }, [code, email, focusInput, router, setUser]);

  // Reenviar código
  const handleResend = async () => {
    if (!email || isResending || resendCooldown > 0) {
      return;
    }

    setIsResending(true);
    setResendSuccess(false);
    setError('');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

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
        const now = Date.now();
        const nextExpiresAt = now + CODE_EXPIRATION_MS;
        const nextResendAvailable = now + RESEND_COOLDOWN_MS;

        setExpiresAt(nextExpiresAt);
        setTimeLeft(Math.max(0, Math.ceil((nextExpiresAt - now) / 1000)));
        setResendAvailableAt(nextResendAvailable);
        setResendCooldown(Math.max(0, Math.ceil((nextResendAvailable - now) / 1000)));
        setCode(createEmptyCode());
        focusInput(0);

        setResendSuccess(true);
        if (resendSuccessTimeoutRef.current) {
          clearTimeout(resendSuccessTimeoutRef.current);
        }
        resendSuccessTimeoutRef.current = setTimeout(() => setResendSuccess(false), 3500);
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

      if (err.name === 'AbortError') {
        setError('La conexión tardó demasiado. Verifica tu internet e intenta nuevamente.');
      } else if (err.message?.toLowerCase().includes('network') || err.message?.toLowerCase().includes('failed to fetch')) {
        setError('No se pudo conectar al servidor. Verifica tu conexión a internet.');
      } else {
        setError('Error al reenviar el código. Por favor intenta nuevamente en unos momentos.');
      }
      setResendSuccess(false);
    } finally {
      setIsResending(false);
    }
  };

  const handleCodeChange = useCallback((index: number, rawValue: string) => {
    if (isVerifying || success) {
      return;
    }

    const sanitized = rawValue.replace(/\D/g, '');

    if (!sanitized) {
      setCode((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
      return;
    }

    // Tomar solo el último dígito ingresado
    const lastDigit = sanitized.slice(-1);
    
    const newCode = [...code];
    newCode[index] = lastDigit;
    setCode(newCode);

    // Auto-avanzar inmediatamente usando ref
    if (index < CODE_LENGTH - 1) {
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  }, [code, isVerifying, success]);

  const handleKeyDown = useCallback((index: number, event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (code[index]) {
        const next = [...code];
        next[index] = '';
        setCode(next);
      } else if (index > 0) {
        const next = [...code];
        next[index - 1] = '';
        setCode(next);
        focusInput(index - 1);
      }
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
      return;
    }

    if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      event.preventDefault();
      focusInput(index + 1);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (code.every((digit) => digit !== '') && !isVerifying && !success) {
        handleVerify();
      }
    }
  }, [code, focusInput, handleVerify, isVerifying, success]);

  const handlePaste = useCallback((event: ReactClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (isVerifying || success) {
      return;
    }

    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) {
      return;
    }

    const nextCode = createEmptyCode();
    pasted.split('').forEach((digit, idx) => {
      nextCode[idx] = digit;
    });

    setCode(nextCode);
    focusInput(Math.min(pasted.length, CODE_LENGTH) - 1);
  }, [focusInput, isVerifying, success]);

  // Auto-verificar cuando se completen los 6 dígitos
  useEffect(() => {
    if (code.every(digit => digit !== '') && !isVerifying && !success) {
      handleVerify();
    }
  }, [code, handleVerify, isVerifying, success]);

  if (!email) {
    return null; // Se redirigirá automáticamente
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-all ${success
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
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8 space-y-4 sm:space-y-6">
          {/* Inputs de código */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3 text-center">
              Ingresa el código de verificación
            </label>
            <div
              className="flex gap-1.5 sm:gap-2 justify-center items-center"
              onPaste={handlePaste}
            >
              {code.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onFocus={(e) => e.target.select()}
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  enterKeyHint={index === CODE_LENGTH - 1 ? 'done' : 'next'}
                  aria-label={`Dígito ${index + 1} del código`}
                  className={`w-11 h-12 sm:w-14 sm:h-16 flex-shrink-0 text-center text-xl sm:text-3xl font-bold border-2 rounded-lg sm:rounded-xl transition-all shadow-sm p-0 leading-none ${success
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : digit
                      ? 'border-green-500 bg-green-50 text-green-700 scale-105'
                      : 'border-gray-300 hover:border-green-400 focus:border-green-500 focus:ring-2 focus:ring-green-200'
                    }`}
                  disabled={isVerifying || success}
                />
              ))}
            </div>
          </div>

          {/* Timer */}
          <div className="text-center">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full ${timeLeft < 60
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
              }`}>
              <div className={`w-2 h-2 rounded-full ${timeLeft < 60 ? 'bg-red-500 animate-pulse' : 'bg-green-500'
                }`} />
              <span className="text-xs sm:text-sm font-medium">
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

          {resendSuccess && !success && (
            <Alert className="border-green-200 bg-green-50 text-green-800 animate-in fade-in-50 slide-in-from-top-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                ¡Enviamos un nuevo código a{' '}
                <span className="font-semibold">{email}</span>!
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
                disabled={!canResend}
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
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-1.5 sm:space-y-2">
            <p className="text-[10px] sm:text-xs font-medium text-gray-700">💡 Consejos:</p>
            <ul className="text-[10px] sm:text-xs text-gray-600 space-y-0.5 sm:space-y-1">
              <li>• Revisa tu bandeja de spam si no ves el email</li>
              <li>• El código es válido por 5 minutos</li>
              <li>• Puedes pegar el código directamente</li>
            </ul>
          </div>
        </div>

        {/* Botón volver */}
        <div className="mt-4 sm:mt-6 text-center">
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
