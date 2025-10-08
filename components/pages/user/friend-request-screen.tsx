"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Check, X } from "lucide-react"
import { useRouter } from "next/navigation"
import type { FC } from "react"

interface FriendRequestScreenProps {
  userId: string
  name: string
  avatar?: string
  isFriend?: boolean
  alreadyRequested?: boolean
}

export const FriendRequestScreen: FC<FriendRequestScreenProps> = ({
  userId,
  name,
  avatar,
  isFriend = false,
  alreadyRequested = false,
}) => {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleBack = () => {
    router.back()
  }

  const handleSendRequest = async () => {
    setIsLoading(true)
    try {
      // Llamada real a tu backend para enviar solicitud
      await new Promise((resolve) => setTimeout(resolve, 1000))
      // Aquí podrías actualizar estado o mostrar toast
    } finally {
      setIsLoading(false)
      router.back()
    }
  }

  // Mensaje y botón dinámico según el estado
  let mainMessage = `¿Quieres enviar una solicitud de amistad a ${name}?`
  let buttonLabel = "Enviar solicitud"
  let buttonDisabled = isLoading
  let showButton = true

  if (isFriend) {
    mainMessage = `¡Ya eres amigo de ${name}!`
    showButton = false
  } else if (alreadyRequested) {
    mainMessage = `Ya enviaste una solicitud a ${name}. Esperando respuesta.`
    buttonLabel = "Solicitud pendiente"
    buttonDisabled = true
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
            {avatar ? (
              <AvatarImage src={avatar} />
            ) : (
              <AvatarFallback className="bg-orange-100 text-2xl">{name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
            )}
          </Avatar>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{name}</h2>
          <p className="text-gray-600">{mainMessage}</p>
        </div>

        {!isFriend && (
          <div className="bg-gray-50 rounded-xl p-4 mb-8">
            <p className="text-sm text-gray-600 text-center">
              Una vez que {name} acepte tu solicitud, podrán verse mutuamente en sus listas de amigos e invitarse a partidos.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {showButton && (
            <Button
              onClick={handleSendRequest}
              disabled={buttonDisabled}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-2xl flex items-center justify-center"
            >
              <Check className="w-5 h-5 mr-2" />
              {isLoading ? "Enviando..." : buttonLabel}
            </Button>
          )}

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