"use client"

import { useEffect, useState, Suspense } from "react"
import dynamic from "next/dynamic"
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

function OAuthSuccessContent() {
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
          logger.error("[OAuth] ❌ No token received")
          setStatus("error")
          setMessage("❌ No se recibió el token de autenticación")
          await new Promise(resolve => setTimeout(resolve, 3000))
          router.push("/login")
          return
        }

        // Guardar token inmediatamente
        TokenPersistence.saveTokenWithBackup(token)
        logger.info("[OAuth] ✅ Token guardado en localStorage")
        
        // Esperar un poco para que el token se propague
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Obtener usuario con reintentos
        setMessage("Verificando tu cuenta...")
        
        let user = null
        let lastError = null
        
        for (let attempt = 1; attempt <= 3; attempt++) {
          logger.info(`[OAuth] Intento ${attempt}/3 de fetchCurrentUser`)
          
          try {
            user = await AuthService.fetchCurrentUser()
            if (user) {
              logger.info(`[OAuth] ✅ Usuario obtenido: ${user.email}`)
              break
            } else {
              logger.warn(`[OAuth] Intento ${attempt}: fetchCurrentUser retornó null/undefined`)
            }
          } catch (err) {
            lastError = err
            logger.error(`[OAuth] Intento ${attempt} falló:`, err)
            if (attempt < 3) {
              logger.info(`[OAuth] Esperando 1s antes del siguiente intento...`)
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
          }
        }
        
        if (!user) {
          const errorMsg = lastError instanceof Error ? lastError.message : "Error desconocido"
          logger.error("[OAuth] ❌ No se pudo obtener usuario después de 3 intentos. Último error:", errorMsg)
          
          setStatus("error")
          setMessage(`❌ Error al verificar cuenta: ${errorMsg}`)
          
          // Limpiar y redirigir
          await new Promise(resolve => setTimeout(resolve, 5000)) // Mostrar error más tiempo
          TokenPersistence.clearAllTokens()
          router.push("/login?error=oauth_failed")
          return
        }

        // Éxito!
        logger.info("[OAuth] ✅ Autenticación completa exitosamente")
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
        logger.error("[OAuth] ❌ Error crítico en processOAuth:", error)
        
        setStatus("error")
        const errorMsg = error instanceof Error ? error.message : "Error desconocido"
        setMessage(`❌ Error: ${errorMsg}`)
        
        // Mostrar error más tiempo antes de redirigir
        await new Promise(resolve => setTimeout(resolve, 5000))
        
        TokenPersistence.clearAllTokens()
        router.push("/login?error=oauth_error")
      }
    }

    processOAuth()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <LoadingSpinner size="xl" variant="green" className="mb-6" />
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

function OAuthSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner size="xl" variant="green" />
      </div>
    }>
      <OAuthSuccessContent />
    </Suspense>
  )
}

// ✅ CRÍTICO: Deshabilitar SSR para evitar error 500
// useSearchParams() requiere client-side rendering
const OAuthSuccessPageNoSSR = dynamic(() => Promise.resolve(OAuthSuccessPage), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <LoadingSpinner size="xl" variant="green" />
    </div>
  ),
})

export default OAuthSuccessPageNoSSR
