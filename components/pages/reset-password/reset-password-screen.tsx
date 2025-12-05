"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { LogoAuth } from "@/components/ui/logo"
import { BRANDING } from "@/lib/branding"
import logger from "@/lib/logger"

export function ResetPasswordScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get("token") || ""

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [tokenValido, setTokenValido] = useState(false)

  // Validar token al cargar
  useEffect(() => {
    const validarToken = async () => {
      if (!token) {
        setError("Token no proporcionado")
        setIsValidating(false)
        return
      }

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://faltauno-backend-169771742214.us-central1.run.app'
        const response = await fetch(
          `${API_URL}/api/auth/password/validate-token?token=${encodeURIComponent(token)}`
        )
        const data = await response.json()

        if (response.ok && data.success && data.data) {
          setTokenValido(true)
        } else {
          setError("El enlace de recuperación es inválido o ha expirado")
        }
      } catch (err) {
        logger.error("[ResetPassword] Error validando token:", err)
        setError("El enlace de recuperación es inválido o ha expirado")
      } finally {
        setIsValidating(false)
      }
    }

    validarToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validaciones
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres")
      return
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    setIsLoading(true)

    try {
      logger.info("[ResetPassword] Restableciendo contraseña...")

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://faltauno-backend-169771742214.us-central1.run.app'
      const response = await fetch(`${API_URL}/api/auth/password/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          newPassword: password
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al restablecer la contraseña')
      }

      setSuccess(true)
      logger.info("[ResetPassword] ✅ Contraseña restablecida")

      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        router.push("/login")
      }, 3000)

    } catch (err: any) {
      logger.error("[ResetPassword] ❌ Error:", err)
      setError(err.message || "Error al restablecer la contraseña")
    } finally {
      setIsLoading(false)
    }
  }

  // Loading
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 px-3 xs:px-4 safe-top safe-bottom">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 xs:h-12 xs:w-12 border-b-2 border-green-600 mx-auto mb-3 xs:mb-4"></div>
          <p className="text-xs xs:text-sm sm:text-base text-gray-600">Verificando enlace...</p>
        </div>
      </div>
    )
  }

  // Token inválido o expirado
  if (!tokenValido) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 px-3 xs:px-4 sm:px-6 safe-top safe-bottom">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl xs:rounded-2xl sm:rounded-3xl shadow-xl p-6 xs:p-8 sm:p-10 text-center">
            <div className="w-14 h-14 xs:w-16 xs:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 xs:mb-4">
              <svg className="w-7 h-7 xs:w-8 xs:h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-900 mb-1.5 xs:mb-2">
              Enlace Inválido
            </h2>
            <p className="text-xs xs:text-sm sm:text-base text-gray-600 mb-5 xs:mb-6">
              {error}
            </p>
            <Link
              href="/forgot-password"
              className="inline-block bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-3 xs:py-3.5 min-h-[48px] px-5 xs:px-6 rounded-lg xs:rounded-xl transition-colors touch-manipulation active:scale-[0.98]"
            >
              Solicitar Nuevo Enlace
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Success
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 px-3 xs:px-4 sm:px-6 safe-top safe-bottom">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl xs:rounded-2xl sm:rounded-3xl shadow-xl p-6 xs:p-8 sm:p-10 text-center">
            <div className="w-14 h-14 xs:w-16 xs:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 xs:mb-4">
              <svg className="w-7 h-7 xs:w-8 xs:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-900 mb-1.5 xs:mb-2">
              ¡Contraseña Restablecida!
            </h2>
            <p className="text-xs xs:text-sm sm:text-base text-gray-600 mb-5 xs:mb-6">
              Tu contraseña ha sido actualizada exitosamente.
            </p>
            <p className="text-xs xs:text-sm text-gray-500">
              Redirigiendo al login...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 px-3 xs:px-4 sm:px-6 safe-top safe-bottom">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl xs:rounded-2xl sm:rounded-3xl shadow-xl p-6 xs:p-8 sm:p-10">
          {/* Logo */}
          <div className="flex justify-center mb-5 xs:mb-6">
            <LogoAuth />
          </div>

          {/* Header */}
          <div className="text-center mb-6 xs:mb-8">
            <h1 className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-900 mb-1.5 xs:mb-2">
              Nueva Contraseña
            </h1>
            <p className="text-xs xs:text-sm sm:text-base text-gray-600">
              Ingresa tu nueva contraseña
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 xs:mb-6 p-3 xs:p-4 bg-red-50 border border-red-200 rounded-lg xs:rounded-xl">
              <p className="text-xs xs:text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 xs:space-y-5 sm:space-y-6">
            <div>
              <label htmlFor="password" className="block text-xs xs:text-sm font-medium text-gray-700 mb-1.5 xs:mb-2">
                Nueva Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 xs:px-4 py-2.5 xs:py-3 min-h-[48px] text-base border border-gray-300 rounded-lg xs:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors touch-manipulation"
                placeholder="Mínimo 8 caracteres"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs xs:text-sm font-medium text-gray-700 mb-1.5 xs:mb-2">
                Confirmar Contraseña
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 xs:px-4 py-2.5 xs:py-3 min-h-[48px] text-base border border-gray-300 rounded-lg xs:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors touch-manipulation"
                placeholder="Repetir contraseña"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-3 xs:py-3.5 min-h-[48px] px-4 rounded-lg xs:rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-[0.98]"
            >
              {isLoading ? "Restableciendo..." : "Restablecer Contraseña"}
            </button>
          </form>

          {/* Link */}
          <div className="mt-5 xs:mt-6 text-center">
            <Link
              href="/login"
              className="block text-xs xs:text-sm text-green-600 hover:text-green-700 active:text-green-800 font-medium min-h-[44px] flex items-center justify-center touch-manipulation"
            >
              ← Volver al Login
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 xs:mt-8 text-center">
          <p className="text-xs xs:text-sm text-gray-600">
            © 2025 {BRANDING.name}. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}
