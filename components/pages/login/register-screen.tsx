"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { UsuarioAPI, ApiResponse, Usuario } from "@/lib/api"
import { AuthService } from "@/lib/auth"

type FormData = {
  email: string
  password: string
  confirmPassword: string
}

export function RegisterScreen() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    confirmPassword: "",
  })

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

      const response: ApiResponse<Usuario> = await UsuarioAPI.crear(payload)

      if (response.success) {
        // Guardamos usuario recibido
        AuthService.setUser(response.data)

        try {
          // Login automático
          const loginRes = await UsuarioAPI.login(formData.email, formData.password)

          if (loginRes.success) {
            // Solo seteamos token si viene JWT; si no, sesión cookie ya está activa
            if (loginRes.data.token) {
              AuthService.setToken(loginRes.data.token)
            }
          } else {
            console.warn("Login automático falló:", loginRes.message)
          }
        } catch (loginErr: any) {
          console.warn("Login automático falló después del registro:", loginErr)
        }

        // Redirigir a completar perfil
        router.push("/complete-profile")
      } else {
        setError(response.message ?? "Error al crear la cuenta.")
      }
    } catch (err: any) {
      console.error("Error en registro:", err)
      setError(err.response?.data?.message ?? err.message ?? "Error al crear la cuenta.")
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
        {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">{error}</div>}

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