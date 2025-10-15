"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter, useSearchParams } from "next/navigation"
import { UsuarioAPI, Usuario } from "@/lib/api"
import { AuthService } from "@/lib/auth"

export function LoginScreen() {
  const router = useRouter()
  const search = useSearchParams()
  const returnTo = search.get("returnTo") ?? null

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    console.log("[LoginScreen] handleSubmit llamado", { email })

    try {
      const res = await UsuarioAPI.login(email, password)
      console.log("[LoginScreen] respuesta login:", res)

      if (res && res.success) {
        const token = res.data?.token
        const user = res.data?.user as Usuario | undefined

        if (token) {
          AuthService.setToken(token)
          console.log("[LoginScreen] token guardado")
        }
        if (user) {
          AuthService.setUser(user)
          console.log("[LoginScreen] usuario guardado:", user.email)
        }

        if (returnTo) {
          console.log("[LoginScreen] redirigiendo a returnTo:", returnTo)
          router.push(returnTo)
          return
        }

        const currentUser = user ?? AuthService.getUser()
        if (currentUser) {
          console.log("[LoginScreen] redirigiendo a /home")
          router.push("/home")
        } else {
          setError("No se pudo iniciar sesión correctamente")
        }
      } else {
        setError(res.message ?? "Credenciales inválidas")
      }
    } catch (err: any) {
      console.error("[LoginScreen] Error login:", err)
      setError("Error al iniciar sesión. Verifica tus credenciales.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialAuth = (provider: string) => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/oauth2/authorization/${provider}`
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="pt-20 pb-12 text-center">
        <div className="w-24 h-24 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg bg-green-600">
          <span className="text-white text-2xl font-bold">FU</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Falta Uno</h1>
        <p className="text-gray-600">Encuentra tu partido de fútbol</p>
      </div>

      <div className="flex-1 px-6">
        {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6 mb-8">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
          <Input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
          <Button type="submit" disabled={isLoading} className="w-full bg-green-600 text-white py-4 rounded-2xl">
            {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </Button>
        </form>

        <div className="flex items-center my-8">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-4 text-gray-500 text-sm">o continúa con</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        <Button onClick={() => handleSocialAuth("google")} variant="outline" className="w-full py-4 rounded-2xl">Google</Button>
        <Button onClick={() => handleSocialAuth("facebook")} variant="outline" className="w-full py-4 rounded-2xl">Facebook</Button>
        <Button onClick={() => handleSocialAuth("apple")} variant="outline" className="w-full py-4 rounded-2xl">Apple</Button>

        <div className="text-center mt-8 pb-8">
          <p className="text-sm text-gray-500">
            ¿No tienes cuenta?{" "}
            <button onClick={() => router.push("/register")} className="text-green-600 font-medium">Regístrate aquí</button>
          </p>
        </div>
      </div>
    </div>
  )
}