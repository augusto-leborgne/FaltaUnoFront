"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Check } from "lucide-react"
import { useRouter } from "next/navigation"

interface FriendRequestScreenProps {
  userId: string
}

export function FriendRequestScreen({ userId }: FriendRequestScreenProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleBack = () => {
    router.back()
  }

  const handleSendRequest = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsLoading(false)
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
          <h1 className="text-xl font-bold text-gray-900">Enviar solicitud</h1>
        </div>
      </div>

      <div className="flex-1 px-6 py-8">
        <div className="text-center mb-8">
          <Avatar className="w-24 h-24 mx-auto mb-4">
            <AvatarImage src="/placeholder.svg?height=96&width=96" />
            <AvatarFallback className="bg-orange-100 text-2xl">CM</AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Carlos Martínez</h2>
          <p className="text-gray-600">¿Quieres enviar una solicitud de amistad?</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-8">
          <p className="text-sm text-gray-600 text-center">
            Una vez que Carlos acepte tu solicitud, podrán verse mutuamente en sus listas de amigos e invitarse a
            partidos.
          </p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleSendRequest}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-2xl"
          >
            <Check className="w-5 h-5 mr-2" />
            {isLoading ? "Enviando..." : "Enviar solicitud"}
          </Button>

          <Button
            onClick={handleBack}
            variant="outline"
            className="w-full py-4 text-lg font-semibold rounded-2xl bg-transparent"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
