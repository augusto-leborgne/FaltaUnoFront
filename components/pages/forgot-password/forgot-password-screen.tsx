"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { LogoAuth } from "@/components/ui/logo"
import { BRANDING } from "@/lib/branding"
import logger from "@/lib/logger"

export function ForgotPasswordScreen() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [resetLink, setResetLink] = useState<string | null>(null) // ⚡ NUEVO: Para modo desarrollo

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      logger.info("[ForgotPassword] Solicitando recuperación para:", email)

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://faltauno-backend-169771742214.us-central1.run.app'
      const response = await fetch(`${API_URL}/api/auth/password/forgot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al enviar el email')
      }

      // ⚡ NUEVO: Si el backend devuelve resetLink, estamos en modo desarrollo
      if (data.data && data.data.resetLink) {
        logger.warn("[ForgotPassword] ⚠️ Modo desarrollo - Link recibido del backend")
        setResetLink(data.data.resetLink)
      }

      setSuccess(true)
      logger.info("[ForgotPassword] ✅ Email de recuperación enviado")

      // Solo redirigir automáticamente si NO hay link (modo producción)
      if (!data.data?.resetLink) {
        setTimeout(() => {
          router.push("/login")
        }, 5000)
      }

    } catch (err: any) {
      logger.error("[ForgotPassword] ❌ Error:", err)
      setError(err.message || "Error al enviar el email de recuperación")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 px-2 xs:px-3 sm:px-4 md:px-6 safe-top safe-bottom">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl xs:rounded-2xl sm:rounded-3xl shadow-xl p-6 xs:p-8 sm:p-10 text-center">
            <div className="mb-5 xs:mb-6">
              <div className="w-14 h-14 xs:w-16 xs:h-16 sm:w-18 sm:h-18 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 xs:mb-4">
                <svg className="w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                </svg>
              </div>
              <h2 className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1.5 xs:mb-2">
                ¡Email Enviado!
              </h2>
              <p className="text-xs xs:text-sm sm:text-base text-gray-600">
                Hemos enviado las instrucciones de recuperación a <strong>{email}</strong>
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg xs:rounded-xl p-3 xs:p-4 mb-5 xs:mb-6">
              <p className="text-xs xs:text-sm text-gray-700">
                Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.
              </p>
            </div>

            {/* ⚡ NUEVO: Mostrar link directo en modo desarrollo */}
            {resetLink && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg xs:rounded-xl p-3 xs:p-4 mb-5 xs:mb-6">
                <p className="text-xs xs:text-sm font-semibold text-yellow-800 mb-1.5 xs:mb-2">
                  🔧 Modo Desarrollo - Link directo:
                </p>
                <a
                  href={resetLink}
                  className="text-xs xs:text-sm text-blue-600 hover:text-blue-800 active:text-blue-900 underline break-all touch-manipulation"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {resetLink}
                </a>
                <p className="text-[10px] xs:text-xs text-yellow-700 mt-1.5 xs:mt-2">
                  Haz clic en el link o cópialo en tu navegador
                </p>
              </div>
            )}

            {!resetLink && (
              <p className="text-xs xs:text-sm text-gray-500">
                Redirigiendo al login...
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 px-2 xs:px-3 sm:px-4 md:px-6 safe-top safe-bottom">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl xs:rounded-2xl sm:rounded-3xl shadow-xl p-6 xs:p-8 sm:p-10">
          {/* Logo */}
          <div className="flex justify-center mb-5 xs:mb-6">
            <LogoAuth />
          </div>

          {/* Header */}
          <div className="text-center mb-6 xs:mb-8">
            <h1 className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1.5 xs:mb-2">
              Recuperar Contraseña
            </h1>
            <p className="text-xs xs:text-sm sm:text-base text-gray-600">
              Ingresa tu email y te enviaremos instrucciones para restablecer tu contraseña
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 xs:mb-6 p-3 xs:p-4 bg-red-50 border border-red-200 rounded-lg xs:rounded-xl">
              <p className="text-xs xs:text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 xs:space-y-3 xs:space-y-4 sm:space-y-5 sm:space-y-4 xs:space-y-3 xs:space-y-4 sm:space-y-5 sm:space-y-6">
            <div>
              <label htmlFor="email" className="block text-xs xs:text-sm font-medium text-gray-700 mb-1.5 xs:mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 xs:px-4 py-2.5 xs:py-3 min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] text-sm xs:text-base md:text-base border border-gray-300 rounded-lg xs:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors touch-manipulation"
                placeholder="tu@email.com"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-3 xs:py-3.5 min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] px-4 rounded-lg xs:rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-[0.98]"
            >
              {isLoading ? "Enviando..." : "Enviar Instrucciones"}
            </button>
          </form>

          {/* Links */}
          <div className="mt-5 xs:mt-6 text-center space-y-1.5 xs:space-y-2">
            <Link
              href="/login"
              className="block text-xs xs:text-sm text-green-600 hover:text-green-700 active:text-green-800 font-medium min-h-[40px] xxs:min-h-[42px] xs:min-h-[44px] sm:min-h-[46px] md:min-h-[48px] flex items-center justify-center touch-manipulation"
            >
              ← Volver al Login
            </Link>
            <p className="text-xs xs:text-sm text-gray-600">
              ¿No tienes cuenta?{" "}
              <Link href="/register" className="text-green-600 hover:text-green-700 active:text-green-800 font-medium touch-manipulation">
                Regístrate
              </Link>
            </p>
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
