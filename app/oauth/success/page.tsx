"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

export default function OAuthSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("Procesando autenticación...")

  useEffect(() => {
    const processOAuth = async () => {
      try {
        const token = searchParams.get("token")
        
        if (!token) {
          setStatus("error")
          setMessage("No se recibió el token de autenticación")
          setTimeout(() => router.push("/login"), 2000)
          return
        }

        // Guardar token en localStorage
        AuthService.setToken(token)
        
        // Obtener información completa del usuario desde el backend
        const user = await AuthService.fetchCurrentUser()
        
        if (!user) {
          setStatus("error")
          setMessage("Error al obtener información del usuario")
          setTimeout(() => router.push("/login"), 2000)
          return
        }

        setStatus("success")
        
        // Mensaje personalizado según si es registro o login
        if (user.perfilCompleto) {
          setMessage(`¡Bienvenido de nuevo, ${user.nombre || user.email}!`)
        } else {
          setMessage(`¡Bienvenido! Completemos tu perfil para comenzar`)
        }

        // Redirigir según el estado del perfil
        setTimeout(() => {
          if (user.perfilCompleto) {
            router.push("/home")
          } else {
            router.push("/profile-setup")
          }
        }, 1500)

      } catch (error) {
        console.error("[OAuthSuccess] Error procesando OAuth:", error)
        setStatus("error")
        setMessage("Error al procesar la autenticación")
        setTimeout(() => router.push("/login"), 2000)
      }
    }

    processOAuth()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a5f7a] via-[#159895] to-[#57c5b6] flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <div className="mb-6">
              <Loader2 className="w-16 h-16 text-[#159895] animate-spin mx-auto" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Autenticando...
            </h1>
            <p className="text-gray-600">
              {message}
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mb-6">
              <div className="bg-green-100 rounded-full p-4 inline-block">
                <CheckCircle2 className="w-16 h-16 text-green-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              ¡Autenticación exitosa!
            </h1>
            <p className="text-gray-600">
              {message}
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Redirigiendo...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mb-6">
              <div className="bg-red-100 rounded-full p-4 inline-block">
                <XCircle className="w-16 h-16 text-red-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Error de autenticación
            </h1>
            <p className="text-gray-600">
              {message}
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Redirigiendo al login...
            </p>
          </>
        )}
      </div>
    </div>
  )
}
