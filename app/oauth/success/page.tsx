"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { logger } from "@/lib/logger"
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
        
        logger.info("[OAuthSuccess] Token recibido:", token ? "SI (length: " + token.length + ")" : "NO")
        
        if (!token) {
          setStatus("error")
          setMessage("No se recibió el token de autenticación")
          setTimeout(() => router.push("/login"), 2000)
          return
        }

        // Guardar token en localStorage
        AuthService.setToken(token)
        logger.info("[OAuthSuccess] Token guardado en localStorage")
        
        // Pequeña espera para asegurar que el backend haya procesado el usuario
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Intentar obtener información completa del usuario desde el backend
        logger.info("[OAuthSuccess] Intentando obtener usuario...")
        const user = await AuthService.fetchCurrentUser()
        
        if (!user) {
          logger.warn("[OAuthSuccess] No se pudo obtener el usuario, probablemente necesita completar perfil")
          
          // Si no se puede obtener el usuario, asumimos que necesita completar perfil
          // El token es válido, solo falta información
          setStatus("success")
          setMessage("¡Bienvenido! Completemos tu perfil para comenzar")
          
          setTimeout(() => {
            router.push("/profile-setup")
          }, 1500)
          return
        }

        logger.info("[OAuthSuccess] Usuario obtenido:", user.email)
        setStatus("success")
        
        // Mensaje personalizado según el estado del usuario
        if (!user.perfilCompleto) {
          setMessage(`¡Bienvenido! Completemos tu perfil para comenzar`)
        } else if (!user.cedulaVerificada) {
          setMessage(`¡Bienvenido! Verificá tu cédula para continuar`)
        } else {
          setMessage(`¡Bienvenido de nuevo, ${user.nombre || user.email}!`)
        }

        // Redirigir según el estado del perfil y verificación
        setTimeout(() => {
          if (!user.perfilCompleto) {
            router.push("/profile-setup")
          } else if (!user.cedulaVerificada) {
            router.push("/verification")
          } else {
            router.push("/home")
          }
        }, 1500)

      } catch (error) {
        logger.error("[OAuthSuccess] Error procesando OAuth:", error)
        setStatus("error")
        setMessage("Error al procesar la autenticación. Redirigiendo a completar perfil...")
        
        // En caso de error, intentar ir a profile-setup
        // El token podría ser válido pero faltar datos
        setTimeout(() => router.push("/profile-setup"), 2000)
      }
    }

    processOAuth()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
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
