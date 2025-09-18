"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { apiService } from "@/lib/api"

export function RegisterScreen() {
  const router = useRouter()
  const [registrationMethod, setRegistrationMethod] = useState<"email" | "social" | null>(null)
  const [socialProvider, setSocialProvider] = useState<string>("")
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
      const response = await apiService.register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
      })

      if (response.success) {
        localStorage.setItem("authToken", response.data.token)
        localStorage.setItem("user", JSON.stringify(response.data.user))
        localStorage.setItem("userRegistered", "true")
        localStorage.setItem("registrationMethod", "email")
        router.push("/verification")
      }
    } catch (error) {
      setError("Error al crear la cuenta. Intenta nuevamente.")
      console.error("Registration error:", error)
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
    router.push("/verification")
  }

  if (showSocialNameForm) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Logo Section */}
        <div className="pt-20 pb-12 text-center">
          <div
            className="w-24 h-24 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg"
            style={{ backgroundColor: "#16a34a" }}
          >
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
                className="w-full py-4 px-4 rounded-2xl border-gray-300 text-base"
                required
              />
              <Input
                type="text"
                placeholder="Apellido"
                value={formData.lastName}
                onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                className="w-full py-4 px-4 rounded-2xl border-gray-300 text-base"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-2xl min-h-[56px] touch-manipulation"
            >
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
        {/* Logo Section */}
        <div className="pt-20 pb-12 text-center">
          <div
            className="w-24 h-24 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg"
            style={{ backgroundColor: "#16a34a" }}
          >
            <span className="text-white text-2xl font-bold">FU</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Crear Cuenta</h1>
          <p className="text-gray-600">Elige cómo quieres registrarte</p>
        </div>

        <div className="flex-1 px-6">
          <div className="space-y-4 mb-8">
            <Button
              onClick={() => handleSocialAuth("google")}
              variant="outline"
              className="w-full py-4 text-lg font-semibold rounded-2xl min-h-[56px] touch-manipulation border-gray-300 bg-transparent"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuar con Google
            </Button>

            <Button
              onClick={() => handleSocialAuth("facebook")}
              variant="outline"
              className="w-full py-4 text-lg font-semibold rounded-2xl min-h-[56px] touch-manipulation border-gray-300 bg-transparent"
            >
              <svg className="w-5 h-5 mr-3" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Continuar con Facebook
            </Button>

            <Button
              onClick={() => handleSocialAuth("apple")}
              variant="outline"
              className="w-full py-4 text-lg font-semibold rounded-2xl min-h-[56px] touch-manipulation border-gray-300 bg-transparent"
            >
              <svg className="w-5 h-5 mr-3" fill="#000000" viewBox="0 0 24 24">
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
              </svg>
              Continuar con Apple
            </Button>
          </div>

          {/* Divider */}
          <div className="flex items-center my-8">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-gray-500 text-sm">o</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          <Button
            onClick={() => setRegistrationMethod("email")}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-2xl min-h-[56px] touch-manipulation"
          >
            Registrarse con Email
          </Button>

          <div className="text-center mt-8 pb-8">
            <p className="text-sm text-gray-500">
              ¿Ya tienes cuenta?{" "}
              <button onClick={() => router.push("/login")} className="text-green-600 font-medium">
                Inicia sesión
              </button>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Logo Section */}
      <div className="pt-20 pb-12 text-center">
        <div
          className="w-24 h-24 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg"
          style={{ backgroundColor: "#16a34a" }}
        >
          <span className="text-white text-2xl font-bold">FU</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Crear Cuenta</h1>
        <p className="text-gray-600">Completa tus datos</p>
      </div>

      <div className="flex-1 px-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleEmailRegistration} className="space-y-6 mb-8">
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="text"
              placeholder="Nombre"
              value={formData.firstName}
              onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
              className="w-full py-4 px-4 rounded-2xl border-gray-300 text-base"
              required
              disabled={isLoading}
            />
            <Input
              type="text"
              placeholder="Apellido"
              value={formData.lastName}
              onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
              className="w-full py-4 px-4 rounded-2xl border-gray-300 text-base"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <Input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full py-4 px-4 rounded-2xl border-gray-300 text-base"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <Input
              type="password"
              placeholder="Contraseña"
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full py-4 px-4 rounded-2xl border-gray-300 text-base"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <Input
              type="password"
              placeholder="Confirmar contraseña"
              value={formData.confirmPassword}
              onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full py-4 px-4 rounded-2xl border-gray-300 text-base"
              required
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-2xl min-h-[56px] touch-manipulation disabled:opacity-50"
          >
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
