"use client"


import { logger } from '@/lib/logger'
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UsuarioAPI, Usuario, API_BASE } from "@/lib/api"
import { AuthService } from "@/lib/auth"
import { useAuth } from "@/hooks/use-auth"
import { usePostAuthRedirect } from "@/lib/navigation" // ← decide /profile-setup o /home
import { InlineSpinner, LoadingSpinner } from "@/components/ui/loading-spinner"

export function LoginScreen() {
  const router = useRouter()
  const search = useSearchParams()
  const returnTo = search.get("returnTo") ?? null

  const { setUser } = useAuth()
  const postAuthRedirect = usePostAuthRedirect()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isOAuthLoading, setIsOAuthLoading] = useState(false)
  const [error, setError] = useState("")
  
  // ✅ NUEVO: Validación en tiempo real
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    password?: string
  }>({})

  // ✅ NUEVO: Validar campos individuales
  const validateField = (field: 'email' | 'password', value: string): string | null => {
    switch (field) {
      case 'email':
        if (!value) return "El email es requerido"
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) return "Email inválido"
        return null
      
      case 'password':
        if (!value) return "La contraseña es requerida"
        if (value.length < 6) return "Mínimo 6 caracteres"
        return null
      
      default:
        return null
    }
  }

  const handleEmailChange = (value: string) => {
    setEmail(value)
    const emailError = validateField('email', value)
    setFieldErrors(prev => ({ ...prev, email: emailError || undefined }))
    if (error) setError("")
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    const passwordError = validateField('password', value)
    setFieldErrors(prev => ({ ...prev, password: passwordError || undefined }))
    if (error) setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const res = await UsuarioAPI.login(email, password)

      if (res?.success && res.data) {
        const token = res.data.token
        const user = res.data.user

        if (token) {
          AuthService.setToken(token)
          logger.log("[LoginScreen] Token guardado")
        }

        if (user) {
          AuthService.setUser(user)
          setUser(user)
          logger.log("[LoginScreen] Usuario guardado y contexto actualizado")
        }

        // Redirección correcta: validar returnTo contra estado del usuario
        if (returnTo) {
          // Solo redirigir a returnTo si el usuario tiene perfil completo y verificado
          const canAccessReturnTo = user?.perfilCompleto && (user?.cedulaVerificada || true) // cedulaVerificada es opcional
          
          if (canAccessReturnTo) {
            logger.log("[LoginScreen] Redirigiendo a returnTo:", returnTo)
            router.push(returnTo)
          } else {
            logger.log("[LoginScreen] Usuario no puede acceder a returnTo, redirigiendo según estado")
            postAuthRedirect(user)
          }
        } else {
          logger.log("[LoginScreen] Redirección post-auth (profile-setup/home)")
          postAuthRedirect(user)
        }
      } else {
        setError(res?.message || res?.error || "Credenciales inválidas")
      }
    } catch (err) {
      logger.error("[LoginScreen] Error login:", err)
      const errorMessage = err instanceof Error ? err.message : "Error al iniciar sesión. Verifica tus credenciales."
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Social OAuth - Login con Google
  const handleSocialAuth = (provider: "google" | "facebook" | "apple") => {
    try {
      // Solo Google está implementado por ahora
      if (provider !== "google") {
        setError(`Login con ${provider} aún no está disponible`)
        return
      }

      // Mostrar spinner antes de redirigir
      setIsOAuthLoading(true)
      setError("")

      // URL completa del backend en Cloud Run (centralizada desde api.ts)
      const oauthUrl = `${API_BASE}/oauth2/authorization/${provider}`
      
      logger.log(`[LoginScreen] Redirigiendo a OAuth ${provider}:`, oauthUrl)
      
      // Pequeño delay para que el spinner sea visible
      setTimeout(() => {
        window.location.href = oauthUrl
      }, 300)
    } catch (e) {
      logger.error("[LoginScreen] OAuth error:", e)
      setError(`Error al iniciar sesión con ${provider}. Por favor intenta nuevamente.`)
      setIsOAuthLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white">
      {/* ✅ Overlay de loading para OAuth */}
      {isOAuthLoading && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-4">
              <LoadingSpinner size="xl" variant="green" text="Iniciando sesión..." />
            </div>
            <p className="text-lg font-medium text-gray-900">Redirigiendo a Google...</p>
            <p className="text-sm text-gray-500 mt-1">Por favor espera</p>
          </div>
        </div>
      )}
      
      <div className="w-full max-w-md px-6">
        {/* Logo + Encabezado */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img 
              src="/logo.png" 
              alt="Falta Uno" 
              className="w-auto max-h-20 sm:max-h-24 md:max-h-28"
            />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Iniciar sesión</h1>
          <p className="text-sm text-gray-500 mt-1">Accede para organizar y sumarte a partidos</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <Input
              id="login-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              required
              className={`rounded-2xl py-3 ${fieldErrors.email ? 'border-red-500' : ''}`}
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <Input
              id="login-password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="********"
              autoComplete="current-password"
              required
              className={`rounded-2xl py-3 ${fieldErrors.password ? 'border-red-500' : ''}`}
            />
            {fieldErrors.password && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.password}</p>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600 mt-2">{error}</div>
          )}

          <Button
            type="submit"
            disabled={isLoading || !!fieldErrors.email || !!fieldErrors.password || !email || !password}
            className="w-full py-4 rounded-2xl"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <InlineSpinner variant="white" />
                <span>Entrando...</span>
              </div>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>

        {/* Separador */}
        <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="px-3 text-xs uppercase tracking-wider text-gray-400">o continúa con</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Botones sociales */}
        <div className="grid grid-cols-1 gap-3">
          <Button onClick={() => handleSocialAuth("google")} variant="outline" className="w-full py-4 rounded-2xl">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </Button>
          <Button 
            onClick={() => handleSocialAuth("facebook")} 
            variant="outline" 
            className="w-full py-4 rounded-2xl opacity-50 cursor-not-allowed"
            disabled
          >
            <svg className="w-5 h-5 mr-2" fill="#1877F2" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook (Próximamente)
          </Button>
          <Button 
            onClick={() => handleSocialAuth("apple")} 
            variant="outline" 
            className="w-full py-4 rounded-2xl opacity-50 cursor-not-allowed"
            disabled
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Apple (Próximamente)
          </Button>
        </div>

        {/* Link a registro */}
        <div className="text-center mt-8 pb-8">
          <p className="text-sm text-gray-500">
            ¿No tienes cuenta?{" "}
            <button
              onClick={() => router.push("/register")}
              className="text-green-600 font-medium"
            >
              Regístrate aquí
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginScreen