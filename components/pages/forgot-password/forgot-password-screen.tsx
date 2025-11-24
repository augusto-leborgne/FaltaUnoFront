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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Email Enviado!
              </h2>
              <p className="text-gray-600">
                Hemos enviado las instrucciones de recuperación a <strong>{email}</strong>
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700">
                Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.
              </p>
            </div>

            {/* ⚡ NUEVO: Mostrar link directo en modo desarrollo */}
            {resetLink && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-yellow-800 mb-2">
                  🔧 Modo Desarrollo - Link directo:
                </p>
                <a
                  href={resetLink}
                  className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {resetLink}
                </a>
                <p className="text-xs text-yellow-700 mt-2">
                  Haz clic en el link o cópialo en tu navegador
                </p>
              </div>
            )}

            {!resetLink && (
              <p className="text-sm text-gray-500">
                Redirigiendo al login...
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <LogoAuth />
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Recuperar Contraseña
            </h1>
            <p className="text-gray-600">
              Ingresa tu email y te enviaremos instrucciones para restablecer tu contraseña
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                placeholder="tu@email.com"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Enviando..." : "Enviar Instrucciones"}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center space-y-2">
            <Link
              href="/login"
              className="block text-sm text-green-600 hover:text-green-700 font-medium"
            >
              ← Volver al Login
            </Link>
            <p className="text-sm text-gray-600">
              ¿No tienes cuenta?{" "}
              <Link href="/register" className="text-green-600 hover:text-green-700 font-medium">
                Regístrate
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            © 2025 {BRANDING.name}. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}
