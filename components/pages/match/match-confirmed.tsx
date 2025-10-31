"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { Clock, MapPin, Info, MessageCircle, ExternalLink, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { CompressedMap } from "@/components/google-maps/compressed-map"
import { AuthService } from "@/lib/auth"
import { usePartido } from "@/lib/api-hooks"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface MatchConfirmedProps {
  matchId: string
}

export function MatchConfirmed({ matchId }: MatchConfirmedProps) {
  const router = useRouter()
  const { partido: match, loading } = usePartido(matchId)

  useEffect(() => {
    const user = AuthService.getUser()
    if (!user?.id) {
      router.push("/login")
    }
  }, [])

  const handleOpenChat = () => {
    router.push(`/matches/${matchId}/chat`)
  }

  const handleOpenGoogleMaps = () => {
    if (match?.latitud && match?.longitud) {
      window.open(`https://maps.google.com/?q=${match.latitud},${match.longitud}`, "_blank")
    } else {
      window.open(`https://maps.google.com/?q=${encodeURIComponent(match?.nombreUbicacion || "")}`, "_blank")
    }
  }

  const formatDate = (dateString: string, timeString: string) => {
    try {
      const date = new Date(dateString)
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      today.setHours(0, 0, 0, 0)
      tomorrow.setHours(0, 0, 0, 0)
      const compareDate = new Date(date)
      compareDate.setHours(0, 0, 0, 0)

      if (compareDate.getTime() === today.getTime()) {
        return `Hoy ${timeString.substring(0, 5)}`
      } else if (compareDate.getTime() === tomorrow.getTime()) {
        return `Mañana ${timeString.substring(0, 5)}`
      } else {
        const weekday = date.toLocaleDateString("es-ES", { weekday: "long" })
        const formattedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)
        return `${formattedWeekday} ${timeString.substring(0, 5)}`
      }
    } catch {
      return `${dateString} ${timeString}`
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner size="xl" variant="green" />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Partido no encontrado</p>
          <Button onClick={() => router.push("/matches")}>
            Ver partidos
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Solicitud enviada!</h1>
        <p className="text-gray-600 px-6">
          El organizador revisará tu solicitud y te notificará
        </p>
      </div>

      <div className="flex-1 px-6">
        {/* Status Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Solicitud pendiente</h2>
              <p className="text-sm text-gray-600">
                {formatDate(match.fecha, match.hora)}
              </p>
              <p className="text-sm text-gray-500">{match.nombreUbicacion}</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                El organizador revisará tu solicitud y te notificará. Podrás acceder al chat grupal una vez que seas aceptado.
              </p>
            </div>
          </div>
        </div>

        {/* Organizer Card */}
        {match.organizador && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Organizador</h3>
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => router.push(`/users/${match.organizador!.id}`)}
            >
              <div className="flex items-center space-x-3">
                <Avatar className="w-12 h-12">
                  {match.organizador.foto_perfil ? (
                    <AvatarImage src={`data:image/jpeg;base64,${match.organizador.foto_perfil}`} />
                  ) : (
                    <AvatarFallback className="bg-orange-100">
                      {match.organizador.nombre[0]}{match.organizador.apellido[0]}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {match.organizador.nombre} {match.organizador.apellido}
                  </h3>
                  <p className="text-sm text-gray-600">Capitán</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <Button
                onClick={handleOpenChat}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat grupal
              </Button>
              <p className="text-xs text-gray-500 text-center mt-2">
                Disponible una vez que tu solicitud sea aceptada
              </p>
            </div>
          </div>
        )}

        {/* Location Card */}
        {match.nombreUbicacion && match.latitud && match.longitud && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Ubicación</h3>
              <Button
                onClick={handleOpenGoogleMaps}
                variant="outline"
                size="sm"
                className="bg-transparent"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Google Maps
              </Button>
            </div>

            <CompressedMap
              location={match.nombreUbicacion}
              lat={match.latitud}
              lng={match.longitud}
            />
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Próximos pasos</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-start space-x-2">
              <span className="font-semibold">1.</span>
              <span>Espera la confirmación del organizador (recibirás una notificación)</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-semibold">2.</span>
              <span>Una vez aceptado, podrás acceder al chat grupal</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-semibold">3.</span>
              <span>Coordina el pago directamente con el organizador</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-semibold">4.</span>
              <span>¡Prepárate para el partido!</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pb-24 space-y-3">
          <Button
            onClick={() => router.push(`/matches/${matchId}`)}
            variant="outline"
            className="w-full py-4 text-lg font-semibold rounded-2xl bg-transparent"
          >
            Ver detalles del partido
          </Button>
          <Button
            onClick={() => router.push("/home")}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-2xl"
          >
            Volver al inicio
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}