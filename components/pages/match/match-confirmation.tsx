"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { MapPin, Clock, CreditCard, Users, ArrowLeft, Shield } from "lucide-react"
import { useRouter } from "next/navigation"

interface MatchConfirmationProps {
  matchId: string
}

export function MatchConfirmation({ matchId }: MatchConfirmationProps) {
  const router = useRouter()
  const [isConfirming, setIsConfirming] = useState(false)

  const handleConfirm = async () => {
    setIsConfirming(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))
    router.push(`/matches/${matchId}/confirmed`)
  }

  const handleBack = () => {
    router.back()
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-6 px-6 border-b border-gray-100">
        <div className="flex items-center space-x-4">
          <button onClick={handleBack} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Confirmar asistencia</h1>
        </div>
      </div>

      <div className="flex-1 px-6 py-6">
        {/* Profile Section */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src="/placeholder.svg?height=64&width=64" />
                <AvatarFallback className="bg-gray-200">TU</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-gray-900">Tu perfil</h3>
                <p className="text-sm text-gray-500">Listo para unirte</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="bg-orange-50 border-orange-200 text-gray-700">
              Editar
            </Button>
          </div>

          {/* Match Details */}
          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Jueves 19:30</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>Polideportivo Norte</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <CreditCard className="w-4 h-4" />
              <span>$8 / jugador</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>90 min</span>
            </div>
          </div>

          {/* Map Placeholder */}
          <div className="mt-4 bg-gradient-to-br from-green-100 to-blue-100 rounded-xl h-32 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-gray-600" />
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Método de pago</h3>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Visa terminada en 42</p>
                <p className="text-sm text-gray-500">Se cobrará al confirmar</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="bg-orange-50 border-orange-200 text-gray-700">
              Cambiar
            </Button>
          </div>
        </div>

        {/* Confirmed Players */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Jugadores confirmados</h3>
            </div>
            <Button variant="outline" size="sm" className="bg-orange-50 border-orange-200 text-gray-700">
              Ver
            </Button>
          </div>
          <p className="text-sm text-gray-600">5 confirmados • Quedan 3 plazas</p>
        </div>

        {/* Cancellation Protection */}
        <div className="flex items-center space-x-3 mb-8 text-sm text-gray-600">
          <Shield className="w-4 h-4 text-green-600" />
          <span>Protección de cancelación incluida</span>
        </div>

        {/* Confirm Button */}
        <div className="pb-24">
          <Button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-4 text-lg font-semibold rounded-2xl"
            size="lg"
          >
            {isConfirming ? "Confirmando plaza..." : "Confirmar plaza"}
          </Button>
          <p className="text-center text-sm text-gray-500 mt-3">No se hará ningún cargo si el partido no se completa</p>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}
