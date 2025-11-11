"use client"

import { logger } from '@/lib/logger'
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Shield, Smartphone, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api"
import { AuthService } from "@/lib/auth"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export function PhoneVerificationScreen() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [phoneNumber, setPhoneNumber] = useState("")
  const [code, setCode] = useState("")
  const [step, setStep] = useState<'check' | 'send' | 'verify'>('check') // check, send, verify
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [verified, setVerified] = useState(false)

  const currentUser = AuthService.getUser()

  useEffect(() => {
    checkVerificationStatus()
  }, [])

  useEffect(() => {
    // Cooldown timer para reenvío
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const checkVerificationStatus = async () => {
    try {
      setLoading(true)
      
      // Obtener estado de verificación
      const response = await apiClient<{ verified: boolean }>('/api/phone-verification/status')
      
      if (response.success && response.data?.verified) {
        setVerified(true)
        setStep('verify')
      } else {
        // Obtener número de celular del usuario
        if (currentUser?.celular) {
          setPhoneNumber(currentUser.celular)
          setStep('send')
        } else {
          toast({
            title: "Error",
            description: "Debes agregar un número de celular en tu perfil primero",
            variant: "destructive"
          })
          router.push('/profile')
        }
      }
    } catch (error) {
      logger.error("[PhoneVerification] Error checking status:", error)
      setStep('send')
    } finally {
      setLoading(false)
    }
  }

  const handleSendCode = async () => {
    try {
      setSending(true)
      
      const response = await apiClient<void>('/api/phone-verification/send', {
        method: 'POST'
      })
      
      if (!response.success) {
        throw new Error(response.message || "Error al enviar código")
      }
      
      toast({
        title: "Código enviado",
        description: "Revisa tu celular para ver el código de verificación"
      })
      
      setStep('verify')
      setResendCooldown(60) // 1 minuto de cooldown
      
    } catch (error) {
      logger.error("[PhoneVerification] Error sending code:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo enviar el código",
        variant: "destructive"
      })
    } finally {
      setSending(false)
    }
  }

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      toast({
        title: "Código inválido",
        description: "El código debe tener 6 dígitos",
        variant: "destructive"
      })
      return
    }

    try {
      setVerifying(true)
      
      const response = await apiClient<{ verified: boolean }>('/api/phone-verification/verify', {
        method: 'POST',
        body: JSON.stringify({ code })
      })
      
      if (!response.success) {
        throw new Error(response.message || "Código incorrecto")
      }
      
      setVerified(true)
      
      toast({
        title: "¡Verificado!",
        description: "Tu celular ha sido verificado exitosamente"
      })
      
      // Esperar 2 segundos y redirigir
      setTimeout(() => router.push('/profile'), 2000)
      
    } catch (error) {
      logger.error("[PhoneVerification] Error verifying code:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Código incorrecto",
        variant: "destructive"
      })
    } finally {
      setVerifying(false)
    }
  }

  const handleResendCode = async () => {
    try {
      setSending(true)
      
      const response = await apiClient<void>('/api/phone-verification/resend', {
        method: 'POST'
      })
      
      if (!response.success) {
        throw new Error(response.message || "Error al reenviar código")
      }
      
      toast({
        title: "Código reenviado",
        description: "Se ha enviado un nuevo código a tu celular"
      })
      
      setCode("")
      setResendCooldown(60)
      
    } catch (error) {
      logger.error("[PhoneVerification] Error resending code:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo reenviar el código",
        variant: "destructive"
      })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Verificación de Celular</h1>
            <p className="text-sm text-gray-500">Verifica tu número para mayor seguridad</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          
          {verified ? (
            // Estado verificado
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Celular Verificado!
              </h2>
              <p className="text-gray-600 mb-6">
                Tu número de celular {phoneNumber} ha sido verificado exitosamente
              </p>
              <Button 
                onClick={() => router.push('/profile')}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Volver al Perfil
              </Button>
            </div>
          ) : step === 'send' ? (
            // Paso 1: Enviar código
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                Verifica tu Celular
              </h2>
              <p className="text-gray-600 mb-6 text-center">
                Te enviaremos un código de 6 dígitos por SMS a tu número registrado
              </p>

              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex items-center space-x-3">
                  <Smartphone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Número registrado</p>
                    <p className="text-lg font-semibold text-gray-900">{phoneNumber}</p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleSendCode}
                disabled={sending}
                className="w-full bg-blue-600 hover:bg-blue-700 mb-4"
              >
                {sending ? "Enviando..." : "Enviar Código"}
              </Button>

              <p className="text-xs text-center text-gray-500">
                ¿Número incorrecto?{" "}
                <button
                  onClick={() => router.push('/profile')}
                  className="text-blue-600 hover:underline"
                >
                  Actualiza tu perfil
                </button>
              </p>
            </div>
          ) : (
            // Paso 2: Verificar código
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                Ingresa el Código
              </h2>
              <p className="text-gray-600 mb-6 text-center">
                Enviamos un código de 6 dígitos a {phoneNumber}
              </p>

              <div className="mb-6">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="text-center text-2xl font-bold tracking-widest h-14"
                  autoFocus
                />
              </div>

              <Button 
                onClick={handleVerifyCode}
                disabled={verifying || code.length !== 6}
                className="w-full bg-green-600 hover:bg-green-700 mb-4"
              >
                {verifying ? "Verificando..." : "Verificar"}
              </Button>

              <div className="text-center">
                {resendCooldown > 0 ? (
                  <p className="text-sm text-gray-500">
                    Reenviar código en {resendCooldown}s
                  </p>
                ) : (
                  <button
                    onClick={handleResendCode}
                    disabled={sending}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {sending ? "Enviando..." : "Reenviar código"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Info adicional */}
          {!verified && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900 text-sm mb-1">
                    ¿Por qué verificar?
                  </h3>
                  <p className="text-xs text-blue-700">
                    La verificación de celular aumenta la seguridad de tu cuenta 
                    y nos permite contactarte en caso necesario.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
