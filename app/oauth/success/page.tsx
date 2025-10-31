"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { TokenPersistence } from "@/lib/token-persistence"
import { logger } from "@/lib/logger"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

// Inline SVG icons
const CheckIcon = () => (
  <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const ErrorIcon = () => (
  <svg className="w-16 h-16 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

export default function OAuthSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("Procesando autenticación...")

  useEffect(() => {
    const processOAuth = async () => {
      try {
        const token = searchParams.get("token")
        
        logger.info("[OAuth] Token recibido:", token ? `SI (${token.length} chars)` : "NO")
        
        if (!token) {
          setStatus("error")
          setMessage("❌ No se recibió el token de autenticación")
          await new Promise(resolve => setTimeout(resolve, 3000))
          router.push("/login")
          return
        }

        // Guardar token inmediatamente
        TokenPersistence.saveTokenWithBackup(token)
        logger.info("[OAuth] ✅ Token guardado")
        
        // Obtener usuario con reintentos rápidos
        setMessage("Verificando tu cuenta...")
        
        let user = null
        for (let attempt = 1; attempt <= 3; attempt++) {
          logger.info(`[OAuth] Intento ${attempt}/3`)
          
          try {
            user = await AuthService.fetchCurrentUser()
            if (user) {
              logger.info(`[OAuth] ✅ Usuario obtenido: ${user.email}`)
              break
            }
          } catch (err) {
            logger.warn(`[OAuth] Intento ${attempt} falló:`, err)
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 500))
            }
          }
        }
        
        if (!user) {
          setStatus("error")
          setMessage("❌ No pudimos verificar tu cuenta. Limpiá el navegador.")
          
          TokenPersistence.clearAllTokens()
          AuthService.removeToken()
          AuthService.removeUser()
          
          await new Promise(resolve => setTimeout(resolve, 3000))
          router.push("/debug-clear")
          return
        }

        // Éxito!
        setStatus("success")
        
        if (!user.perfilCompleto) {
          setMessage("✅ ¡Bienvenido! Completemos tu perfil")
          await new Promise(resolve => setTimeout(resolve, 2000))
          router.push("/profile-setup")
        } else if (!user.cedulaVerificada) {
          setMessage("✅ ¡Bienvenido! Verificá tu cédula")
          await new Promise(resolve => setTimeout(resolve, 2000))
          router.push("/verification")
        } else {
          setMessage(`✅ ¡Bienvenido, ${user.nombre || user.email}!`)
          await new Promise(resolve => setTimeout(resolve, 2000))
          router.push("/home")
        }

      } catch (error) {
        logger.error("[OAuth] Error:", error)
        
        setStatus("error")
        setMessage(`❌ ${error instanceof Error ? error.message : "Error desconocido"}`)
        
        TokenPersistence.clearAllTokens()
        AuthService.removeToken()
        AuthService.removeUser()
        
        await new Promise(resolve => setTimeout(resolve, 3000))
        router.push("/debug-clear")
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
                <CheckIcon />
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
                <ErrorIcon />
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
