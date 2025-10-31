"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { UsuarioAPI } from "@/lib/api"
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
        if (value.length < 6) return "Mínimo 6 caracteres"
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

  const handleFieldChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    const fieldError = validateField(field, value)
    setFieldErrors(prev => ({ ...prev, [field]: fieldError || undefined }))
    
    // Re-validar confirmPassword si cambió password
    if (field === 'password' && formData.confirmPassword) {
      const confirmError = validateField('confirmPassword', formData.confirmPassword)
      setFieldErrors(prev => ({ ...prev, confirmPassword: confirmError || undefined }))
    }
    
    if (error) setError("")
  }

  // Social OAuth - Registro con Google
  const handleSocialAuth = (provider: "google" | "facebook" | "apple") => {
    try {
      // URL completa del backend en Cloud Run
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://faltauno-backend-pg4rwegknq-uc.a.run.app'
      const redirectUrl = `${backendUrl}/oauth2/authorization/${provider}`
      console.log("[RegisterScreen] Redirigiendo a OAuth:", redirectUrl)
      window.location.href = redirectUrl
    } catch (err) {
      console.error("[RegisterScreen] Error en OAuth:", err)
      setError("Error al iniciar sesión con " + provider)
    }
  }

  const handleEmailRegistration = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    if (formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const payload = {
        email: formData.email,
        password: formData.password,
      }

      console.log("[RegisterScreen] Creando usuario con email:", formData.email)

      // ✅ CORRECCIÓN: Tipar correctamente la respuesta
      const response = await UsuarioAPI.crear(payload)

      console.log("[RegisterScreen] Respuesta crear usuario:", response);

      if (response && response.success) {
        // ✅ CORRECCIÓN: Manejar formato de respuesta del backend
        const responseData = response.data
        const user = responseData?.user
        const token = responseData?.token

        console.log("[RegisterScreen] Usuario creado:", user?.email)
        console.log("[RegisterScreen] Token en respuesta:", token ? "SÍ" : "NO")

        // Si viene token en el registro, guardarlo (lo más común)
        if (token) {
          AuthService.setToken(token)
          console.log("[RegisterScreen] ✅ Token guardado desde registro")
          
          // Guardar usuario
          if (user) {
            AuthService.setUser(user)
            setUser(user)
            console.log("[RegisterScreen] ✅ Usuario guardado en contexto")
          }
        } else {
          // ✅ Fallback: Si no viene token, hacer login automático
          console.log("[RegisterScreen] No hay token, haciendo login automático...")
          
          try {
            const loginRes = await UsuarioAPI.login(formData.email, formData.password)
            console.log("[RegisterScreen] Login automático:", loginRes.success ? "✅" : "❌")
            
            if (loginRes.success && loginRes.data?.token) {
              AuthService.setToken(loginRes.data.token)
              AuthService.setUser(loginRes.data.user)
              setUser(loginRes.data.user)
              console.log("[RegisterScreen] ✅ Token y usuario guardados desde login")
            } else {
              throw new Error("No se pudo obtener token en login automático")
            }
          } catch (loginErr) {
            console.error("[RegisterScreen] ❌ Error en login automático:", loginErr)
            // Si falló el login automático, redirigir a login manual
            setError("Cuenta creada exitosamente. Por favor, inicia sesión.")
            setTimeout(() => router.push("/login"), 2000)
            return
          }
        }

        // ✅ Verificar estado final antes de redirigir
        const finalToken = AuthService.getToken()
        const finalUser = AuthService.getUser()
        
        console.log("[RegisterScreen] Estado final:")
        console.log("  - Token:", finalToken ? "✅" : "❌")
        console.log("  - Usuario:", finalUser ? "✅" : "❌")
        console.log("  - Email:", finalUser?.email)
        console.log("  - Perfil completo:", finalUser?.perfilCompleto)
        console.log("  - Cédula verificada:", finalUser?.cedulaVerificada)

        if (!finalToken || !finalUser) {
          console.error("[RegisterScreen] ⚠️ Estado inválido después del registro")
          setError("Error al completar el registro. Por favor, inicia sesión.")
          setTimeout(() => router.push("/login"), 2000)
          return
        }

        // ✅ REDIRECCIÓN SEGÚN PERFIL
        // Siempre redirigir a profile-setup después del registro
        // (El usuario recién creado NUNCA tiene perfil completo)
        console.log("[RegisterScreen] 🔄 Redirigiendo a /profile-setup")
        router.push("/profile-setup")
        
      } else {
        const errorMsg = response?.message || "Error al crear la cuenta"
        console.error("[RegisterScreen] ❌ Error en respuesta:", errorMsg)
        setError(errorMsg)
      }
    } catch (err: any) {
      console.error("[RegisterScreen] ❌ Error en registro:", err)
      
      // ✅ CORRECCIÓN: Mensajes de error más específicos
      let errorMessage = "Error al crear la cuenta"
      
      if (err.message?.includes("Failed to fetch")) {
        errorMessage = "No se pudo conectar con el servidor. Verifica tu conexión."
      } else if (err.message?.includes("409") || err.message?.includes("email ya está registrado")) {
        errorMessage = "Este email ya está registrado. Intenta iniciar sesión."
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white">
      <div className="w-full max-w-md px-6">
        {/* Encabezado */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Crear cuenta</h1>
          <p className="text-sm text-gray-500 mt-1">Regístrate para organizar y sumarte a partidos</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleEmailRegistration} className="space-y-4 mb-6">
          <div>
            <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <Input
              id="register-email"
              name="email"
              type="email"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              required
              disabled={isLoading}
              autoComplete="email"
              className={`rounded-2xl py-3 ${fieldErrors.email ? 'border-red-500' : ''}`}
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <Input
              id="register-password"
              name="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={formData.password}
              onChange={(e) => handleFieldChange('password', e.target.value)}
              required
              disabled={isLoading}
              autoComplete="new-password"
              minLength={6}
              className={`rounded-2xl py-3 ${fieldErrors.password ? 'border-red-500' : ''}`}
            />
            {fieldErrors.password && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.password}</p>
            )}
          </div>

          <div>
            <label htmlFor="register-confirm-password" className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
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
              minLength={6}
              className={`rounded-2xl py-3 ${fieldErrors.confirmPassword ? 'border-red-500' : ''}`}
            />
            {fieldErrors.confirmPassword && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.confirmPassword}</p>
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
            className="w-full py-4 rounded-2xl"
          >
            {isLoading ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </form>

        {/* Separador */}
        <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="px-3 text-xs uppercase tracking-wider text-gray-400">o regístrate con</span>
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
            Registrarse con Google
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

        {/* Link a login */}
        <div className="text-center mt-8 pb-8">
          <p className="text-sm text-gray-500">
            ¿Ya tienes cuenta?{" "}
            <button 
              onClick={() => router.push("/login")} 
              className="text-green-600 font-medium"
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