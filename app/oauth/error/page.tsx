'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'

export default function OAuthErrorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [errorMessage, setErrorMessage] = useState('Error al autenticar con Google')

  useEffect(() => {
    const reason = searchParams.get('reason')
    const message = searchParams.get('message')

    logger.error('[OAuth Error] Reason:', reason, 'Message:', message)

    // Map error reasons to user-friendly messages
    switch (reason) {
      case 'no_email':
        setErrorMessage('No se pudo obtener tu email de Google. Por favor verifica que hayas dado permiso para acceder a tu email.')
        break
      case 'server_error':
        setErrorMessage(message ? decodeURIComponent(message) : 'Error del servidor al procesar tu autenticación')
        break
      default:
        setErrorMessage('Error inesperado al autenticar con Google. Por favor intenta nuevamente.')
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <svg 
              className="w-12 h-12 text-red-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </div>
        </div>

        {/* Error Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Error de Autenticación
        </h1>

        {/* Error Message */}
        <p className="text-gray-600 mb-8">
          {errorMessage}
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={() => router.push('/login')}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            Volver al inicio de sesión
          </Button>
          
          <Button
            onClick={() => router.push('/register')}
            variant="outline"
            className="w-full"
          >
            Crear cuenta con email
          </Button>
        </div>

        {/* Help Text */}
        <p className="text-sm text-gray-500 mt-6">
          ¿Necesitas ayuda? <a href="/help" className="text-green-600 hover:underline">Contacta soporte</a>
        </p>
      </div>
    </div>
  )
}
