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

      console.log("[RegisterScreen] Respuesta crear usuario:", response)

      if (response && response.success) {
        // ✅ CORRECCIÓN: Manejar ambos formatos de respuesta
        const user = response.data?.user || response.data
        const token = response.data?.token

        console.log("[RegisterScreen] Usuario creado:", user?.email)
        console.log("[RegisterScreen] Token en respuesta:", token ? "SÍ" : "NO")

        // Si viene token en el registro, guardarlo
        if (token) {
          AuthService.setToken(token)
          console.log("[RegisterScreen] ✅ Token guardado desde registro")
        } else {
          // ✅ CORRECCIÓN: Si no viene token, hacer login automático
          console.log("[RegisterScreen] No hay token, haciendo login automático...")
          
          try {
            const loginRes = await UsuarioAPI.login(formData.email, formData.password)
            console.log("[RegisterScreen] Login automático exitoso:", loginRes.success)
            
            if (loginRes.success && loginRes.data?.token) {
              AuthService.setToken(loginRes.data.token)
              AuthService.setUser(loginRes.data.user)
              setUser(loginRes.data.user)
              console.log("[RegisterScreen] ✅ Token y usuario guardados desde login")
            }
          } catch (loginErr) {
            console.error("[RegisterScreen] ❌ Error en login automático:", loginErr)
            // Continuar de todas formas si el usuario fue creado
          }
        }

        // Guardar usuario
        if (user) {
          AuthService.setUser(user)
          setUser(user)
          console.log("[RegisterScreen] ✅ Usuario guardado en contexto")
        }

        // ✅ CORRECCIÓN: Verificar estado final antes de redirigir
        const finalToken = AuthService.getToken()
        const finalUser = AuthService.getUser()
        
        console.log("[RegisterScreen] Estado final:")
        console.log("  - Token:", finalToken ? "✅" : "❌")
        console.log("  - Usuario:", finalUser ? "✅" : "❌")
        console.log("  - Perfil completo:", finalUser?.perfilCompleto ? "✅" : "❌")

        if (!finalToken) {
          console.warn("[RegisterScreen] ⚠️ No se pudo obtener token, redirigiendo a login")
          setError("Cuenta creada. Por favor, inicia sesión.")
          setTimeout(() => router.push("/login"), 2000)
          return
        }

        // ✅ REDIRECCIÓN SEGÚN PERFIL
        if (finalUser && !finalUser.perfilCompleto) {
          console.log("[RegisterScreen] 🔄 Redirigiendo a profile-setup")
          router.push("/profile-setup")
        } else {
          console.log("[RegisterScreen] 🔄 Perfil completo, redirigiendo a home")
          postAuthRedirect(finalUser ?? undefined)
        }
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
    <div className="min-h-screen bg-white flex flex-col">
      <div className="pt-20 pb-12 text-center">
        <div className="w-24 h-24 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg bg-green-600">
          <span className="text-white text-2xl font-bold">FU</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Crear Cuenta</h1>
        <p className="text-gray-600">Ingresa tu email y contraseña</p>
      </div>

      <div className="flex-1 px-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailRegistration} className="space-y-6 mb-8">
          <Input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            required
            disabled={isLoading}
            autoComplete="email"
          />
          <Input
            type="password"
            placeholder="Contraseña"
            value={formData.password}
            onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
            required
            disabled={isLoading}
            autoComplete="new-password"
            minLength={6}
          />
          <Input
            type="password"
            placeholder="Confirmar contraseña"
            value={formData.confirmPassword}
            onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            required
            disabled={isLoading}
            autoComplete="new-password"
            minLength={6}
          />
          <Button 
            type="submit" 
            disabled={isLoading} 
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl"
          >
            {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
          </Button>
        </form>

        <div className="text-center mt-8 pb-8">
          <p className="text-sm text-gray-500">
            ¿Ya tienes cuenta?{" "}
            <button 
              onClick={() => router.push("/login")} 
              className="text-green-600 font-medium hover:underline"
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