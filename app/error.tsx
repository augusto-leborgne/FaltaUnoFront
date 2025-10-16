"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          ¡Algo salió mal!
        </h2>
        <p className="text-gray-600 mb-6">
          Ocurrió un error inesperado. Por favor, intenta nuevamente.
        </p>
        <div className="space-y-3">
          <Button
            onClick={reset}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            Intentar nuevamente
          </Button>
          <Button
            onClick={() => window.location.href = "/home"}
            variant="outline"
            className="w-full bg-transparent"
          >
            Volver al inicio
          </Button>
        </div>
      </div>
    </div>
  )
}