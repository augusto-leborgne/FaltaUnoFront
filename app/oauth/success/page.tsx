"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { TokenPersistence } from "@/lib/token-persistence"
import { logger } from "@/lib/logger"
import { CheckCircle2, XCircle } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

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

        // Decodificar el token para ver qué contiene (solo para debugging)
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          logger.info("[OAuthSuccess] Token payload:", payload)
          logger.info("[OAuthSuccess] UserID en token:", payload.userId)
          logger.info("[OAuthSuccess] Email en token:", payload.sub)
          logger.info("[OAuthSuccess] Expira en:", new Date(payload.exp * 1000).toISOString())
        } catch (e) {
          logger.error("[OAuthSuccess] Error decodificando token:", e)
        }

        // Guardar token en localStorage INMEDIATAMENTE con redundancia
        // Esto asegura que no perdemos el token si hay errores después
        TokenPersistence.saveTokenWithBackup(token)
        logger.info("[OAuthSuccess] ✅ Token guardado con redundancia en localStorage")
        
        // Verificar consistencia
        const consistency = TokenPersistence.verifyTokenConsistency()
        logger.info("[OAuthSuccess] Consistencia del token:", consistency)
        
        // Dar tiempo al backend para:
        // 1. Confirmar la transacción de base de datos
        // 2. Propagar el usuario a través del sistema
        logger.info("[OAuthSuccess] Esperando 2 segundos para que el backend termine de procesar...")
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Intentar obtener información del usuario desde el backend
        // El método fetchCurrentUser ahora tiene reintentos automáticos (3 intentos)
        logger.info("[OAuthSuccess] Intentando obtener usuario con reintentos automáticos...")
        setMessage("Verificando tu cuenta...")
        
        const user = await AuthService.fetchCurrentUser()
        
        if (!user) {
          logger.error("[OAuthSuccess] ❌ No se pudo obtener usuario después de todos los reintentos")
          logger.error("[OAuthSuccess] Posibles causas:")
          logger.error("[OAuthSuccess] 1. Usuario no creado en el backend")
          logger.error("[OAuthSuccess] 2. Token no contiene userId correcto")
          logger.error("[OAuthSuccess] 3. Problemas de latencia/sincronización con la BD")
          
          setStatus("error")
          setMessage("No pudimos verificar tu cuenta. Por favor, intentá iniciar sesión nuevamente.")
          
          // NO limpiar el token - dejarlo por si el problema se resuelve
          // El usuario puede intentar refrescar o navegar manualmente
          setTimeout(() => {
            router.push("/login")
          }, 5000)
          return
        }

        logger.info("[OAuthSuccess] ✅ Usuario obtenido exitosamente")
        logger.info("[OAuthSuccess] Email:", user.email)
        logger.info("[OAuthSuccess] Nombre:", user.nombre)
        logger.info("[OAuthSuccess] ID:", (user as any).id)
        logger.info("[OAuthSuccess] Perfil completo:", user.perfilCompleto)
        logger.info("[OAuthSuccess] Cédula verificada:", user.cedulaVerificada)
        
        setStatus("success")
        
        // Redirigir según el estado del usuario
        if (!user.perfilCompleto) {
          setMessage(`¡Bienvenido! Completemos tu perfil para comenzar`)
          setTimeout(() => router.push("/profile-setup"), 1500)
        } else if (!user.cedulaVerificada) {
          setMessage(`¡Bienvenido! Verificá tu cédula para continuar`)
          setTimeout(() => router.push("/verification"), 1500)
        } else {
          setMessage(`¡Bienvenido de nuevo, ${user.nombre || user.email}!`)
          setTimeout(() => router.push("/home"), 1500)
        }

      } catch (error) {
        logger.error("[OAuthSuccess] Error procesando OAuth:", error)
        setStatus("error")
        setMessage("Error al procesar la autenticación")
        
        // Limpiar y volver a login
        AuthService.logout()
        setTimeout(() => router.push("/login"), 2000)
      }
    }

    processOAuth()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <LoadingSpinner size="2xl" variant="primary" centered className="mb-6" />
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
