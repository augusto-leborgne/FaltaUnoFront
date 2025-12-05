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
      <div className="min-h-screen bg-white flex items-center justify-center px-2 xs:px-3 sm:px-4 md:px-6">
        <LoadingSpinner size="xl" variant="green" />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-2 xs:px-3 sm:px-4 md:px-6">
        <div className="text-center">
          <p className="text-xs xs:text-sm sm:text-base text-gray-600 mb-4">Partido no encontrado</p>
          <Button 
            onClick={() => router.push("/matches")}
            className="min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] touch-manipulation active:scale-[0.98]"
          >
            Ver partidos
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 xs:pt-20 sm:pt-24 pb-6 xs:pb-8 text-center safe-top">
        <div className="w-14 xs:w-16 sm:w-20 h-14 xs:h-16 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-7 xs:w-8 sm:w-10 h-7 xs:h-8 sm:h-10 text-green-600" />
        </div>
        <h1 className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2 px-3 xs:px-4">¡Solicitud enviada!</h1>
        <p className="text-xs xs:text-sm sm:text-base text-gray-600 px-2 xs:px-3 sm:px-4 md:px-6">
          El organizador revisará tu solicitud y te notificará
        </p>
      </div>

      <div className="flex-1 px-2 xs:px-3 sm:px-4 md:px-6 pb-18 xs:pb-20 sm:pb-22 md:pb-24 safe-bottom">
        {/* Status Card */}
        <div className="bg-white border border-gray-200 rounded-xl xs:rounded-2xl p-4 xs:p-5 sm:p-6 mb-3 xs:mb-4 sm:mb-5 md:mb-6">
          <div className="flex items-center space-x-3 mb-3 xs:mb-4 sm:mb-5 md:mb-6">
            <div className="w-11 xs:w-12 sm:w-14 h-11 xs:h-12 sm:h-14 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 xs:w-6 sm:w-7 h-5 xs:h-6 sm:h-7 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-xs xs:text-sm sm:text-base md:text-lg font-semibold text-gray-900">Solicitud pendiente</h2>
              <p className="text-xs xs:text-sm text-gray-600">
                {formatDate(match.fecha, match.hora)}
              </p>
              <p className="text-xs xs:text-sm text-gray-500">{match.nombreUbicacion}</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg xs:rounded-xl p-3 xs:p-4">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs xs:text-sm text-yellow-800">
                El organizador revisará tu solicitud y te notificará. Podrás acceder al chat grupal una vez que seas aceptado.
              </p>
            </div>
          </div>
        </div>

        {/* Organizer Card */}
        {match.organizador && (
          <div className="bg-white border border-gray-200 rounded-xl xs:rounded-2xl p-4 xs:p-5 sm:p-6 mb-3 xs:mb-4 sm:mb-5 md:mb-6">
            <h3 className="text-xs xs:text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-3 xs:mb-4">Organizador</h3>
            <div 
              className="flex items-center justify-between p-3 xs:p-4 bg-gray-50 rounded-lg xs:rounded-xl cursor-pointer hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation min-h-[56px] xxs:min-h-[58px] xs:min-h-[60px] sm:min-h-[62px] md:min-h-[64px]"
              onClick={() => router.push(`/users/${match.organizador!.id}`)}
            >
              <div className="flex items-center space-x-3">
                <Avatar className="w-11 xs:w-12 sm:w-14 h-11 xs:h-12 sm:h-14">
                  {match.organizador.foto_perfil ? (
                    <AvatarImage src={`data:image/jpeg;base64,${match.organizador.foto_perfil}`} />
                  ) : (
                    <AvatarFallback className="bg-orange-100">
                      {match.organizador.nombre?.[0] ?? ""}{match.organizador.apellido?.[0] ?? ""}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <h3 className="text-sm xs:text-base font-semibold text-gray-900">
                    {match.organizador.nombre} {match.organizador.apellido}
                  </h3>
                  <p className="text-xs xs:text-sm text-gray-600">Capitán</p>
                </div>
              </div>
            </div>
            
            <div className="mt-3 xs:mt-4">
              <Button
                onClick={handleOpenChat}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] text-sm xs:text-base rounded-lg xs:rounded-xl touch-manipulation active:scale-[0.98]"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat grupal
              </Button>
              <p className="text-[10px] xs:text-xs text-gray-500 text-center mt-2">
                Disponible una vez que tu solicitud sea aceptada
              </p>
            </div>
          </div>
        )}

        {/* Location Card */}
        {match.nombreUbicacion && match.latitud && match.longitud && (
          <div className="bg-white border border-gray-200 rounded-xl xs:rounded-2xl p-4 xs:p-5 sm:p-6 mb-3 xs:mb-4 sm:mb-5 md:mb-6">
            <div className="flex items-center justify-between mb-3 xs:mb-4">
              <h3 className="text-xs xs:text-sm sm:text-base md:text-lg font-semibold text-gray-900">Ubicación</h3>
              <Button
                onClick={handleOpenGoogleMaps}
                variant="outline"
                size="sm"
                className="bg-transparent min-h-[40px] text-xs xs:text-sm touch-manipulation active:scale-95"
              >
                <ExternalLink className="w-3.5 xs:w-4 h-3.5 xs:h-4 mr-1.5 xs:mr-2" />
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg xs:rounded-xl p-4 xs:p-5 sm:p-6 mb-3 xs:mb-4 sm:mb-5 md:mb-6">
          <h3 className="text-sm xs:text-base font-semibold text-gray-900 mb-2.5 xs:mb-3">Próximos pasos</h3>
          <div className="space-y-2 text-xs xs:text-sm text-gray-700">
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
        <div className="space-y-3">
          <Button
            onClick={() => router.push(`/matches/${matchId}`)}
            variant="outline"
            className="w-full min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] text-xs xs:text-sm sm:text-base md:text-lg font-semibold rounded-xl xs:rounded-2xl bg-transparent touch-manipulation active:scale-[0.98]"
          >
            Ver detalles del partido
          </Button>
          <Button
            onClick={() => router.push("/home")}
            className="w-full bg-green-600 hover:bg-green-700 text-white min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] text-xs xs:text-sm sm:text-base md:text-lg font-semibold rounded-xl xs:rounded-2xl touch-manipulation active:scale-[0.98]"
          >
            Volver al inicio
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}