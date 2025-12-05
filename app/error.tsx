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
    <div className="min-h-screen bg-white flex items-center justify-center px-3 xs:px-4 sm:px-6 safe-top safe-bottom">
      <div className="text-center max-w-md w-full">
        <h2 className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-900 mb-3 xs:mb-4">
          ¡Algo salió mal!
        </h2>
        <p className="text-xs xs:text-sm sm:text-base text-gray-600 mb-5 xs:mb-6">
          Ocurrió un error inesperado. Por favor, intenta nuevamente.
        </p>
        <div className="space-y-2.5 xs:space-y-3">
          <Button
            onClick={reset}
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white min-h-[48px] rounded-lg xs:rounded-xl touch-manipulation active:scale-[0.98]"
          >
            Intentar nuevamente
          </Button>
          <Button
            onClick={() => window.location.href = "/home"}
            variant="outline"
            className="w-full bg-transparent min-h-[48px] rounded-lg xs:rounded-xl touch-manipulation active:scale-[0.98]"
          >
            Volver al inicio
          </Button>
        </div>
      </div>
    </div>
  )
}