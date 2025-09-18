"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { Shield, CheckCircle } from "lucide-react"
import { apiService } from "@/lib/api"

export function VerificationScreen() {
  const router = useRouter()
  const [cedula, setCedula] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsVerifying(true)
    setError("")

    try {
      const response = await apiService.verifyIdentity(cedula)

      if (response.success && response.data.verified) {
        setIsVerified(true)
        setTimeout(() => {
          router.push("/complete-profile")
        }, 2000)
      } else {
        setError("No se pudo verificar la cédula. Verifica el número ingresado.")
      }
    } catch (error) {
      setError("Error al verificar la identidad. Intenta nuevamente.")
      console.error("Verification error:", error)
    } finally {
      setIsVerifying(false)
    }
  }

  if (isVerified) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="text-center">
          <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">¡Verificación exitosa!</h1>
          <p className="text-gray-600 mb-8">Tu identidad ha sido confirmada. Bienvenido a Falta Uno.</p>
          <div className="animate-pulse text-green-600">Redirigiendo...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-20 pb-12 text-center">
        <Shield className="w-16 h-16 text-green-600 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Verificación de Identidad</h1>
        <p className="text-gray-600 px-6">Ingresa tu cédula para verificar tu identidad en el registro uruguayo</p>
      </div>

      <div className="flex-1 px-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Input
              type="text"
              placeholder="Número de cédula"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              className="w-full py-4 px-4 rounded-2xl border-gray-300 text-base"
              required
              maxLength={8}
              pattern="[0-9]{7,8}"
              disabled={isVerifying}
            />
            <p className="text-sm text-gray-500 mt-2 px-2">Ingresa tu número de cédula sin puntos ni guiones</p>
          </div>

          <Button
            type="submit"
            disabled={isVerifying}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-2xl min-h-[56px] touch-manipulation disabled:opacity-50"
          >
            {isVerifying ? "Verificando..." : "Verificar Identidad"}
          </Button>
        </form>

        {isVerifying && (
          <div className="mt-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Consultando registro uruguayo...</p>
          </div>
        )}

        <div className="mt-12 bg-gray-50 rounded-2xl p-6">
          <h3 className="font-semibold text-gray-900 mb-2">¿Por qué verificamos tu identidad?</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Garantizar la seguridad de todos los jugadores</li>
            <li>• Crear un ambiente de confianza en la comunidad</li>
            <li>• Cumplir con regulaciones locales</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
