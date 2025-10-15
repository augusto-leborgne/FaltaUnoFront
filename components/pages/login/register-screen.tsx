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

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const payload = {
        email: formData.email,
        password: formData.password,
      }

      console.log("[RegisterScreen] Creando usuario...")
      const response = await UsuarioAPI.crear(payload) as any

      console.log("[RegisterScreen] Respuesta crear usuario:", response)

      if (response && response.success) {
        const user = response.data?.user
        const token = response.data?.token

        console.log("[RegisterScreen] Usuario recibido:", user)
        console.log("[RegisterScreen] Token recibido:", token ? "SÍ" : "NO")

        // Guardar token si viene del registro
        if (token) {
          AuthService.setToken(token)
          console.log("[RegisterScreen] Token guardado desde registro")
        }

        // Guardar usuario
        if (user) {
          AuthService.setUser(user)
          setUser(user) // IMPORTANTE: Actualizar contexto
          console.log("[RegisterScreen] Usuario guardado y contexto actualizado")
        }

        // Si no hay token del registro, intentar login
        if (!token) {
          console.log("[RegisterScreen] No hay token, intentando login automático...")
          try {
            const loginRes = await UsuarioAPI.login(formData.email, formData.password)
            console.log("[RegisterScreen] Resultado login:", loginRes)
            
            if (loginRes && loginRes.success) {
              if (loginRes.data?.token) {
                AuthService.setToken(loginRes.data.token)
                console.log("[RegisterScreen] Token guardado desde login")
              }
              if (loginRes.data?.user) {
                AuthService.setUser(loginRes.data.user)
                setUser(loginRes.data.user) // Actualizar contexto
                console.log("[RegisterScreen] Usuario actualizado desde login y contexto sincronizado")
              }
            }
          } catch (loginErr: any) {
            console.warn("[RegisterScreen] Login automático falló:", loginErr)
          }
        }

        // Verificar que tengamos token antes de continuar
        const finalToken = AuthService.getToken()
        const finalUser = AuthService.getUser()
        
        console.log("[RegisterScreen] Estado final - Token:", finalToken ? "SÍ" : "NO")
        console.log("[RegisterScreen] Estado final - User:", finalUser ? "SÍ" : "NO")

        if (!finalToken) {
          console.error("[RegisterScreen] No se pudo obtener token, redirigiendo a login")
          setError("Error en autenticación. Por favor, inicia sesión.")
          router.push("/login")
          return
        }

        // REDIRECCIÓN SEGÚN PERFIL
        if (finalUser && !finalUser.perfilCompleto) {
          console.log("[RegisterScreen] Redirigiendo a profile-setup")
          router.push("/profile-setup")
        } else {
          console.log("[RegisterScreen] Perfil completo, usando postAuthRedirect")
          postAuthRedirect(finalUser ?? undefined)
        }
      } else {
        setError(response.message ?? "Error al crear la cuenta.")
      }
    } catch (err: any) {
      console.error("[RegisterScreen] Error en registro:", err)
      setError(err?.response?.data?.message ?? err?.message ?? "Error al crear la cuenta.")
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
        {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600">{error}</div>}

        <form onSubmit={handleEmailRegistration} className="space-y-6 mb-8">
          <Input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            required
            disabled={isLoading}
          />
          <Input
            type="password"
            placeholder="Contraseña"
            value={formData.password}
            onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
            required
            disabled={isLoading}
          />
          <Input
            type="password"
            placeholder="Confirmar contraseña"
            value={formData.confirmPassword}
            onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            required
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading} className="w-full bg-green-600 text-white py-4 rounded-2xl">
            {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default RegisterScreen