"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UsuarioAPI, Usuario } from "@/lib/api"
import { AuthService } from "@/lib/auth"
import { useAuth } from "@/hooks/use-auth"
import { usePostAuthRedirect } from "@/lib/navigation" // ← decide /profile-setup o /home

export function LoginScreen() {
  const router = useRouter()
  const search = useSearchParams()
  const returnTo = search.get("returnTo") ?? null

  const { setUser } = useAuth()
  const postAuthRedirect = usePostAuthRedirect()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const res = await UsuarioAPI.login(email, password)

      if (res?.success) {
        const token = res.data?.token
        const user = res.data?.user as Usuario | undefined

        if (token) {
          AuthService.setToken(token)
          console.log("[LoginScreen] Token guardado")
        }

        if (user) {
          AuthService.setUser(user)
          setUser(user)
          console.log("[LoginScreen] Usuario guardado y contexto actualizado")
        }

        // Redirección correcta:
        if (returnTo) {
          console.log("[LoginScreen] Redirigiendo a returnTo:", returnTo)
          router.push(returnTo)
        } else {
          console.log("[LoginScreen] Redirección post-auth (profile-setup/home)")
          postAuthRedirect(user)
        }
      } else {
        setError(res?.message ?? "Credenciales inválidas")
      }
    } catch (err) {
      console.error("[LoginScreen] Error login:", err)
      setError("Error al iniciar sesión. Verifica tus credenciales.")
    } finally {
      setIsLoading(false)
    }
  }

  // Social OAuth (deja tu implementación actual de backend/redirects)
  const handleSocialAuth = (provider: "google" | "facebook" | "apple") => {
    try {
      // Si ya tenés utilidades en AuthService para OAuth, usalas:
      // const url = AuthService.getOAuthUrl(provider)
      // window.location.href = url

      // Fallback genérico (ajusta si tu backend usa otra ruta/param):
      const base = process.env.NEXT_PUBLIC_API_URL ?? ""
      const redirect = encodeURIComponent(`${window.location.origin}/oauth2/redirect`)
      window.location.href = `${base}/oauth2/authorization/${provider}?redirect_uri=${redirect}`
    } catch (e) {
      console.error("[LoginScreen] OAuth error:", e)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white">
      <div className="w-full max-w-md px-6">
        {/* Encabezado */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Iniciar sesión</h1>
          <p className="text-sm text-gray-500 mt-1">Accede para organizar y sumarte a partidos</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="rounded-2xl py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
              className="rounded-2xl py-3"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 mt-2">{error}</div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-2xl"
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        {/* Separador */}
        <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="px-3 text-xs uppercase tracking-wider text-gray-400">o continúa con</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Botones sociales (diseño intacto) */}
        <div className="grid grid-cols-1 gap-3">
          <Button onClick={() => handleSocialAuth("google")} variant="outline" className="w-full py-4 rounded-2xl">
            Google
          </Button>
          <Button onClick={() => handleSocialAuth("facebook")} variant="outline" className="w-full py-4 rounded-2xl">
            Facebook
          </Button>
          <Button onClick={() => handleSocialAuth("apple")} variant="outline" className="w-full py-4 rounded-2xl">
            Apple
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