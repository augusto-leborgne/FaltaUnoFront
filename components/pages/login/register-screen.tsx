"use client"


import { logger } from '@/lib/logger'
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { UsuarioAPI, API_BASE, API_URL } from "@/lib/api"
import { AuthService } from "@/lib/auth"
import { usePostAuthRedirect } from "@/lib/navigation"
import { useAuth } from "@/hooks/use-auth"

type FormData = {
  email: string
  password: string
  confirmPassword: string
}

export function RegisterScreen() {
  const router = useRouter()
  const { setUser } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    confirmPassword: "",
  })
  const postAuthRedirect = usePostAuthRedirect()

  // ✅ NUEVO: Validación en tiempo real
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    password?: string
    confirmPassword?: string
  }>({})

  // ✅ NUEVO: Estado de verificación de email
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [emailCheckDebounce, setEmailCheckDebounce] = useState<NodeJS.Timeout | null>(null)

  // ✅ NUEVO: Verificar si email ya existe
  const checkEmailAvailability = useCallback(async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return // No validar si email está vacío o mal formado
    }

    setIsCheckingEmail(true)
    try {
      const response = await fetch(`${API_URL}/auth/check-email?email=${encodeURIComponent(email)}`)
      const data = await response.json()

      if (data.success && data.data) {
        if (data.data.exists) {
          setFieldErrors(prev => ({ 
            ...prev, 
            email: "Este email ya está registrado. Intenta iniciar sesión." 
          }))
        } else if (data.data.hasDeletedRecoverable) {
          setFieldErrors(prev => ({ 
            ...prev, 
            email: "Cuenta eliminada disponible para recuperar. Contacta soporte." 
          }))
        } else {
          // Email disponible, limpiar error
          setFieldErrors(prev => {
            const { email, ...rest } = prev
            return rest
          })
        }
      }
    } catch (err) {
      logger.error("[RegisterScreen] Error checking email:", err)
      // No mostrar error al usuario, solo loggear
    } finally {
      setIsCheckingEmail(false)
    }
  }, [])

  // ✅ NUEVO: Validar campos individuales
  const validateField = (field: keyof FormData, value: string): string | null => {
    switch (field) {
      case 'email':
        if (!value) return "El email es requerido"
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) return "Email inválido"
        return null
      
      case 'password':
        if (!value) return "La contraseña es requerida"
        if (value.length < 8) return "Mínimo 8 caracteres"
        // Validaciones de mayúscula y número removidas para simplificar
        return null
      
      case 'confirmPassword':
        if (!value) return "Confirma tu contraseña"
        if (value !== formData.password) return "Las contraseñas no coinciden"
        return null
      
      default:
        return null
    }
  }

  // ✅ NUEVO: Detectar si el email es Gmail
  const isGmail = (email: string): boolean => {
    return email.toLowerCase().endsWith('@gmail.com')
  }

  const [showGmailWarning, setShowGmailWarning] = useState(false)

  const handleFieldChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    const fieldError = validateField(field, value)
    setFieldErrors(prev => ({ ...prev, [field]: fieldError || undefined }))
    
    // ✅ NUEVO: Verificar disponibilidad de email con debounce
    if (field === 'email') {
      setShowGmailWarning(isGmail(value))
      
      // Limpiar timeout anterior
      if (emailCheckDebounce) {
        clearTimeout(emailCheckDebounce)
      }
      
      // Verificar disponibilidad después de 800ms sin escribir
      if (value && !fieldError) {
        const timeout = setTimeout(() => {
          checkEmailAvailability(value)
        }, 800)
        setEmailCheckDebounce(timeout)
      }
    }
    
    // Re-validar confirmPassword si cambió password
    if (field === 'password' && formData.confirmPassword) {
      const confirmError = validateField('confirmPassword', formData.confirmPassword)
      setFieldErrors(prev => ({ ...prev, confirmPassword: confirmError || undefined }))
    }
    
    if (error) setError("")
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (emailCheckDebounce) {
        clearTimeout(emailCheckDebounce)
      }
    }
  }, [emailCheckDebounce])

  // Social OAuth - Registro con Google
  const handleSocialAuth = (provider: "google" | "facebook" | "apple") => {
    try {
      // URL completa del backend en Cloud Run (centralizada desde api.ts)
      const redirectUrl = `${API_BASE}/oauth2/authorization/${provider}`
      logger.log("[RegisterScreen] Redirigiendo a OAuth:", redirectUrl)
      window.location.href = redirectUrl
    } catch (err) {
      logger.error("[RegisterScreen] Error en OAuth:", err)
      setError("Error al iniciar sesión con " + provider)
    }
  }

  const handleEmailRegistration = async (e: React.FormEvent) => {
    e.preventDefault()

    // ✅ NUEVO: Prevenir submit si hay errores de validación
    if (fieldErrors.email) {
      setError("Por favor corrige los errores antes de continuar")
      return
    }

    // Validaciones
    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    if (formData.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      logger.log("[RegisterScreen] Iniciando pre-registro para:", formData.email)

      // ✅ NUEVO FLUJO: Pre-registro con verificación de email (usa API_URL centralizado)
      const response = await fetch(`${API_URL}/auth/pre-register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      })

      // ✅ Intentar parsear respuesta JSON siempre
      let data
      try {
        data = await response.json()
      } catch (parseError) {
        logger.error("[RegisterScreen] Error parseando JSON:", parseError)
        throw new Error("Error de comunicación con el servidor")
      }

      // ✅ Verificar si fue exitoso
      if (response.ok && data.success) {
        logger.log("[RegisterScreen] ✅ Pre-registro exitoso, redirigiendo a verificación")
        
        // Redirigir a página de verificación con el email
        router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`)
      } else {
        // Extraer mensaje de error
        const errorMsg = data.message || data.error || "Error al crear la cuenta"
        logger.error("[RegisterScreen] ❌ Error en respuesta:", {
          status: response.status,
          message: errorMsg,
          data,
          fullResponse: data
        })
        
        // ✅ Detectar casos específicos
        if (response.status === 409 || errorMsg.toLowerCase().includes("ya está registrado") || errorMsg.toLowerCase().includes("already registered")) {
          // Email ya existe - redirigir a verificación después de mostrar mensaje
          setError("Este email ya tiene una cuenta. Redirigiendo a verificación...")
          setTimeout(() => {
            router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`)
          }, 2000)
        } else if (response.status === 400) {
          // Error de validación del backend
          setError(errorMsg)
        } else if (response.status >= 500) {
          // Error del servidor - más detalles en consola
          logger.error("[RegisterScreen] Error 500 del servidor:", {
            status: response.status,
            data,
            errorMsg
          })
          setError(`Error del servidor: ${errorMsg}. Por favor intenta nuevamente.`)
        } else {
          // Otros errores
          setError(errorMsg)
        }
        
        return // No lanzar error, ya lo manejamos
      }
    } catch (err: any) {
      logger.error("[RegisterScreen] ❌ Error en registro:", err)
      
      // ✅ Mensajes de error mejorados y específicos
      let errorMessage = "Error de conexión. Verifica tu internet."
      
      const errMsg = err.message?.toLowerCase() || ""
      
      if (errMsg.includes("failed to fetch") || errMsg.includes("networkerror")) {
        errorMessage = "No se pudo conectar al servidor. Verifica tu conexión."
      } else if (errMsg.includes("timeout")) {
        errorMessage = "La conexión tardó demasiado. Intenta nuevamente."
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white px-2 xs:px-3 sm:px-4 md:px-6 py-8 xs:py-10 sm:py-12 safe-top safe-bottom">
      <div className="w-full max-w-md">
        {/* Logo + Encabezado */}
        <div className="text-center mb-5 xs:mb-6 sm:mb-8">
          <div className="flex justify-center mb-3 xs:mb-4 sm:mb-6">
            <img 
              src="/logo.png" 
              alt="Falta Uno" 
              className="w-auto max-h-14 xs:max-h-16 sm:max-h-20 md:max-h-24"
            />
          </div>
          <h1 className="text-base xs:text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">Crear cuenta</h1>
          <p className="text-xs xs:text-sm text-gray-500 mt-1">Regístrate para organizar y sumarte a partidos</p>
        </div>

        {error && (
          <div className="mb-3 xs:mb-4 p-3 xs:p-3.5 sm:p-4 bg-red-50 border border-red-200 rounded-lg xs:rounded-xl sm:rounded-2xl text-red-600 text-xs xs:text-sm">
            {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleEmailRegistration} className="space-y-3 xs:space-y-3.5 sm:space-y-4 mb-3 xs:mb-4 sm:mb-5 md:mb-6">
          <div>
            <label htmlFor="register-email" className="block text-xs xs:text-sm font-medium text-gray-700 mb-1 xs:mb-1.5">
              Email {isCheckingEmail && <span className="text-[10px] xs:text-xs text-gray-400">(verificando...)</span>}
            </label>
            <Input
              id="register-email"
              name="email"
              type="email"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              required
              disabled={isLoading}
              className={`rounded-lg xs:rounded-xl sm:rounded-2xl py-2.5 xs:py-3 text-sm xs:text-base md:text-base ${fieldErrors.email ? 'border-red-500' : ''}`}
              autoComplete="email"
            />
            {fieldErrors.email && (
              <p className="text-[10px] xs:text-xs text-red-600 mt-1 xs:mt-1.5 flex items-center gap-1">
                <span className="text-red-600">⚠️</span>
                {fieldErrors.email}
              </p>
            )}
            
            {/* ✅ NUEVO: Advertencia de Gmail */}
            {showGmailWarning && !fieldErrors.email && (
              <div className="mt-2 xs:mt-2.5 p-2 xs:p-2.5 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg xs:rounded-xl">
                <p className="text-[10px] xs:text-xs text-blue-700 font-medium mb-1">💡 ¿Usas Gmail?</p>
                <p className="text-[10px] xs:text-xs text-blue-600 mb-1.5 xs:mb-2">
                  Para una mejor experiencia, te recomendamos usar <strong>Continuar con Google</strong> en lugar de crear una contraseña.
                </p>
                <button
                  type="button"
                  onClick={() => handleSocialAuth('google')}
                  className="text-[10px] xs:text-xs text-blue-600 font-semibold underline active:text-blue-800 min-h-[40px] xxs:min-h-[42px] xs:min-h-[44px] sm:min-h-[46px] md:min-h-[48px] px-2 py-2 touch-manipulation"
                >
                  Ir a Continuar con Google
                </button>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="register-password" className="block text-xs xs:text-sm font-medium text-gray-700 mb-1 xs:mb-1.5">Contraseña</label>
            <Input
              id="register-password"
              name="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={formData.password}
              onChange={(e) => handleFieldChange('password', e.target.value)}
              required
              disabled={isLoading}
              autoComplete="new-password"
              minLength={8}
              className={`rounded-lg xs:rounded-xl sm:rounded-2xl py-2.5 xs:py-3 text-sm xs:text-base md:text-base ${fieldErrors.password ? 'border-red-500' : ''}`}
            />
            {fieldErrors.password && (
              <p className="text-[10px] xs:text-xs text-red-600 mt-1 xs:mt-1.5">{fieldErrors.password}</p>
            )}
          </div>

          <div>
            <label htmlFor="register-confirm-password" className="block text-xs xs:text-sm font-medium text-gray-700 mb-1 xs:mb-1.5">Confirmar contraseña</label>
            <Input
              id="register-confirm-password"
              name="confirmPassword"
              type="password"
              placeholder="Repite tu contraseña"
              value={formData.confirmPassword}
              onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
              required
              disabled={isLoading}
              autoComplete="new-password"
              minLength={8}
              className={`rounded-lg xs:rounded-xl sm:rounded-2xl py-2.5 xs:py-3 text-sm xs:text-base md:text-base ${fieldErrors.confirmPassword ? 'border-red-500' : ''}`}
            />
            {fieldErrors.confirmPassword && (
              <p className="text-[10px] xs:text-xs text-red-600 mt-1 xs:mt-1.5">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <Button 
            type="submit" 
            disabled={
              isLoading || 
              !!fieldErrors.email || 
              !!fieldErrors.password || 
              !!fieldErrors.confirmPassword ||
              !formData.email ||
              !formData.password ||
              !formData.confirmPassword
            }
            className="w-full py-3 xs:py-3.5 sm:py-4 rounded-lg xs:rounded-xl sm:rounded-2xl text-sm xs:text-base min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px]"
          >
            {isLoading ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </form>

        {/* Separador */}
        <div className="flex items-center my-3 xs:my-4 sm:my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="px-2 xs:px-2.5 sm:px-3 text-[10px] xs:text-xs uppercase tracking-wider text-gray-400">o regístrate con</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Botones sociales */}
        <div className="grid grid-cols-1 gap-2 xs:gap-2.5 sm:gap-3">
          <Button onClick={() => handleSocialAuth("google")} variant="outline" className="w-full py-2.5 xs:py-3 sm:py-4 rounded-lg xs:rounded-xl sm:rounded-2xl text-xs xs:text-sm sm:text-base min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] touch-manipulation active:scale-[0.98]">
            <svg className="w-4 h-4 xs:w-4.5 xs:h-4.5 sm:w-5 sm:h-5 mr-1.5 xs:mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Registrarse con Google
          </Button>
          <Button 
            onClick={() => handleSocialAuth("facebook")} 
            variant="outline" 
            className="w-full py-2.5 xs:py-3 sm:py-4 rounded-lg xs:rounded-xl sm:rounded-2xl opacity-50 cursor-not-allowed text-xs xs:text-sm sm:text-base min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px]"
            disabled
          >
            <svg className="w-4 h-4 xs:w-4.5 xs:h-4.5 sm:w-5 sm:h-5 mr-1.5 xs:mr-2" fill="#1877F2" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook (Próximamente)
          </Button>
          <Button 
            onClick={() => handleSocialAuth("apple")} 
            variant="outline" 
            className="w-full py-2.5 xs:py-3 sm:py-4 rounded-lg xs:rounded-xl sm:rounded-2xl opacity-50 cursor-not-allowed text-xs xs:text-sm sm:text-base min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px]"
            disabled
          >
            <svg className="w-4 h-4 xs:w-4.5 xs:h-4.5 sm:w-5 sm:h-5 mr-1.5 xs:mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Apple (Próximamente)
          </Button>
        </div>

        {/* Link a login */}
        <div className="text-center mt-5 xs:mt-6 sm:mt-8 pb-5 xs:pb-6 sm:pb-8">
          <p className="text-xs xs:text-sm text-gray-500">
            ¿Ya tienes cuenta?{" "}
            <button 
              onClick={() => router.push("/login")} 
              className="text-green-600 font-medium text-xs xs:text-sm min-h-[40px] xxs:min-h-[42px] xs:min-h-[44px] sm:min-h-[46px] md:min-h-[48px] px-2 py-2 touch-manipulation inline-flex items-center"
              disabled={isLoading}
            >
              Inicia sesión aquí
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterScreen