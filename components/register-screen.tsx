"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { UsuarioAPI } from "@/lib/api"

export function RegisterScreen() {
  const router = useRouter()
  const [registrationMethod, setRegistrationMethod] = useState<"email" | "social" | null>(null)
  const [socialProvider, setSocialProvider] = useState("")
  const [showSocialNameForm, setShowSocialNameForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
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
      const response = await UsuarioAPI.crear({
        nombre: formData.firstName,
        apellido: formData.lastName,
        email: formData.email,
        password: formData.password,
      })

      if (response.success) {
        localStorage.setItem("user", JSON.stringify(response.data)) // solo data
        // si quieres un token debes hacer login después
        const loginRes = await UsuarioAPI.login(formData.email, formData.password)
        if (loginRes.success) {
          localStorage.setItem("authToken", loginRes.data.token)
        }
        router.push("/complete-profile")
      }
    } catch (err) {
      setError("Error al crear la cuenta. Intenta nuevamente.")
      console.error("Registration error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialAuth = (provider: string) => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/oauth2/authorization/${provider}`
  }

  const handleSocialRegistrationComplete = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem("userRegistered", "true")
    localStorage.setItem("registrationMethod", socialProvider)
    localStorage.setItem("userName", `${formData.firstName} ${formData.lastName}`)
    router.push("/complete-profile")
  }

  if (showSocialNameForm) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="pt-20 pb-12 text-center">
          <div className="w-24 h-24 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg bg-green-600">
            <span className="text-white text-2xl font-bold">FU</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Completa tu Perfil</h1>
          <p className="text-gray-600">Ingresa tu nombre y apellido</p>
        </div>

        <div className="flex-1 px-6">
          <form onSubmit={handleSocialRegistrationComplete} className="space-y-6 mb-8">
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="text"
                placeholder="Nombre"
                value={formData.firstName}
                onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                required
              />
              <Input
                type="text"
                placeholder="Apellido"
                value={formData.lastName}
                onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-green-600 text-white py-4 rounded-2xl">
              Continuar
            </Button>
          </form>

          <div className="text-center pb-8">
            <button
              onClick={() => {
                setShowSocialNameForm(false)
                setRegistrationMethod(null)
              }}
              className="text-green-600 font-medium text-sm"
            >
              ← Volver a opciones de registro
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!registrationMethod) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="pt-20 pb-12 text-center">
          <div className="w-24 h-24 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg bg-green-600">
            <span className="text-white text-2xl font-bold">FU</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Crear Cuenta</h1>
          <p className="text-gray-600">Elige cómo quieres registrarte</p>
        </div>

        <div className="flex-1 px-6 space-y-4 mb-8">
          <Button onClick={() => handleSocialAuth("google")} variant="outline" className="w-full py-4 rounded-2xl">
            Continuar con Google
          </Button>
          <Button onClick={() => handleSocialAuth("facebook")} variant="outline" className="w-full py-4 rounded-2xl">
            Continuar con Facebook
          </Button>
          <Button onClick={() => handleSocialAuth("apple")} variant="outline" className="w-full py-4 rounded-2xl">
            Continuar con Apple
          </Button>
          <div className="flex items-center my-8">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-gray-500 text-sm">o</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>
          <Button onClick={() => setRegistrationMethod("email")} className="w-full bg-green-600 text-white py-4 rounded-2xl">
            Registrarse con Email
          </Button>
        </div>

        <div className="text-center mt-8 pb-8">
          <p className="text-sm text-gray-500">
            ¿Ya tienes cuenta?{" "}
            <button onClick={() => router.push("/login")} className="text-green-600 font-medium">
              Inicia sesión
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="pt-20 pb-12 text-center">
        <div className="w-24 h-24 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg bg-green-600">
          <span className="text-white text-2xl font-bold">FU</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Crear Cuenta</h1>
        <p className="text-gray-600">Completa tus datos</p>
      </div>

      <div className="flex-1 px-6">
        {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">{error}</div>}

        <form onSubmit={handleEmailRegistration} className="space-y-6 mb-8">
          <div className="grid grid-cols-2 gap-4">
            <Input type="text" placeholder="Nombre" value={formData.firstName} onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))} required disabled={isLoading} />
            <Input type="text" placeholder="Apellido" value={formData.lastName} onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))} required disabled={isLoading} />
          </div>
          <Input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} required disabled={isLoading} />
          <Input type="password" placeholder="Contraseña" value={formData.password} onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))} required disabled={isLoading} />
          <Input type="password" placeholder="Confirmar contraseña" value={formData.confirmPassword} onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))} required disabled={isLoading} />
          <Button type="submit" disabled={isLoading} className="w-full bg-green-600 text-white py-4 rounded-2xl">
            {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
          </Button>
        </form>

        <div className="text-center pb-8">
          <button onClick={() => setRegistrationMethod(null)} className="text-green-600 font-medium text-sm">
            ← Volver a opciones de registro
          </button>
        </div>
      </div>
    </div>
  )
}