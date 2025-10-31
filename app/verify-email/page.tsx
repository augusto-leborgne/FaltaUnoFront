'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Mail, ArrowLeft, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://faltauno-backend-pg4rwegknq-uc.a.run.app/api';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutos en segundos
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
      const response = await fetch(`${API_URL}/verification/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code: codeString,
        }),
      });

      const data = await response.json();

      if (data.success && data.data?.verified) {
        setSuccess(true);
        
        // Guardar info en localStorage para el siguiente paso
        localStorage.setItem('verifiedEmail', email!);
        localStorage.setItem('passwordHash', data.data.passwordHash);
        
        // Redirigir a completar perfil después de 1 segundo
        setTimeout(() => {
          router.push('/complete-profile');
        }, 1000);
      } else {
        setError(data.message || 'Código inválido o expirado');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      console.error('Error verificando código:', err);
      setError('Error al verificar el código. Por favor intenta de nuevo.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Reenviar código
  const handleResend = async () => {
    setIsResending(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/verification/resend-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

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
        setError(data.message || 'Error al reenviar el código');
      }
    } catch (err) {
      console.error('Error reenviando código:', err);
      setError('Error al reenviar el código. Por favor intenta de nuevo.');
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <Mail className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Verifica tu email
          </h1>
          <p className="text-gray-600">
            Hemos enviado un código de 6 dígitos a
          </p>
          <p className="text-green-600 font-semibold mt-1">
            {email}
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
                  className="w-12 h-14 text-center text-2xl font-bold border-2 focus:border-green-500 focus:ring-green-500"
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
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && !error && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                {isResending ? '¡Código reenviado! Revisa tu email.' : '¡Email verificado! Redirigiendo...'}
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
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
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
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Reenviando...
                </>
              ) : resendCooldown > 0 ? (
                <>Reenviar en {resendCooldown}s</>
              ) : (
                'Reenviar código'
              )}
            </Button>
          </div>

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
