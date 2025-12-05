"use client"


import { logger } from '@/lib/logger'
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { MapPin, Clock, CreditCard, Users, ArrowLeft, Shield } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { InscripcionAPI } from "@/lib/api"
import { AuthService } from "@/lib/auth"
import { usePartido, useInscripcionEstado } from "@/lib/api-hooks"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface MatchConfirmationProps {
  matchId: string
}

export function MatchConfirmation({ matchId }: MatchConfirmationProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isConfirming, setIsConfirming] = useState(false)
  const user = AuthService.getUser()
  
  const { partido: match, loading } = usePartido(matchId)
  const { estado, loading: loadingEstado } = useInscripcionEstado(matchId, user?.id || "")

  useEffect(() => {
    if (!user?.id) {
      router.push("/login")
      return
    }

    // Si ya está inscrito, redirigir
    if (!loadingEstado && estado.inscrito) {
      router.push(`/matches/${matchId}/confirmed`)
    }
  }, [user, estado, loadingEstado])

  const handleConfirm = async () => {
    if (!user?.id) {
      router.push("/login")
      return
    }

    setIsConfirming(true)
    
    try {
      // Verificar estado nuevamente
      const estadoResponse = await InscripcionAPI.getEstado(matchId, user.id)
      
      if (estadoResponse.data.inscrito) {
        toast({
          title: "Ya inscripto",
          description: "Ya tienes una solicitud para este partido",
          variant: "default"
        })
        router.push(`/matches/${matchId}/confirmed`)
        return
      }

      // Crear inscripción
      const response = await InscripcionAPI.crear(matchId, user.id)
      
      if (response.success) {
        toast({
          title: "¡Solicitud enviada!",
          description: "El organizador revisará tu solicitud"
        })
        router.push(`/matches/${matchId}/confirmed`)
      }
    } catch (error) {
      logger.error("Error confirmando inscripción:", error)
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo confirmar la inscripción",
        variant: "destructive"
      })
    } finally {
      setIsConfirming(false)
    }
  }

  const handleBack = () => {
    router.back()
  }

  if (loading || loadingEstado) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-3 xs:px-4 sm:px-6">
        <LoadingSpinner size="xl" variant="green" />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-3 xs:px-4 sm:px-6">
        <p className="text-xs xs:text-sm sm:text-base text-gray-600">Partido no encontrado</p>
      </div>
    )
  }

  const formatDate = (fecha: string, hora: string) => {
    try {
      const date = new Date(fecha)
      const weekday = date.toLocaleDateString("es-ES", { weekday: "long" })
      const formattedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)
      return `${formattedWeekday} ${hora.substring(0, 5)}`
    } catch {
      return `${fecha} ${hora}`
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-12 xs:pt-14 sm:pt-16 pb-4 xs:pb-5 sm:pb-6 px-3 xs:px-4 sm:px-6 border-b border-gray-100 safe-top">
        <div className="flex items-center space-x-3 xs:space-x-4">
          <button onClick={handleBack} className="p-2 sm:p-3 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation active:scale-95 hover:bg-gray-100 active:bg-gray-200 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-base xs:text-lg sm:text-xl font-bold text-gray-900">Confirmar asistencia</h1>
        </div>
      </div>

      <div className="flex-1 px-3 xs:px-4 sm:px-6 py-4 xs:py-5 sm:py-6 pb-18 xs:pb-20 sm:pb-22 md:pb-24 safe-bottom">
        {/* Profile Section */}
        <div className="bg-white border border-gray-200 rounded-xl xs:rounded-2xl p-4 xs:p-5 sm:p-6 mb-4 xs:mb-5 sm:mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 xs:space-x-4">
              <Avatar className="w-14 xs:w-16 sm:w-18 h-14 xs:h-16 sm:h-18">
                {user?.foto_perfil ? (
                  <AvatarImage src={`data:image/jpeg;base64,${user.foto_perfil}`} />
                ) : (
                  <AvatarFallback className="bg-gray-200">
                    {user?.nombre?.[0]}{user?.apellido?.[0]}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <h3 className="text-sm xs:text-base font-semibold text-gray-900">Tu perfil</h3>
                <p className="text-xs xs:text-sm text-gray-500">Listo para unirte</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-orange-50 border-orange-200 text-gray-700 min-h-[40px] text-xs xs:text-sm touch-manipulation active:scale-95"
              onClick={() => router.push("/profile")}
            >
              Editar
            </Button>
          </div>

          {/* Match Details */}
          <div className="mt-4 xs:mt-5 sm:mt-6 grid grid-cols-2 gap-3 xs:gap-4 text-xs xs:text-sm">
            <div className="flex items-center space-x-2 text-gray-600 min-h-[32px]">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="line-clamp-1">{formatDate(match.fecha, match.hora)}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600 min-h-[32px]">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="line-clamp-1">{match.nombreUbicacion}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600 min-h-[32px]">
              <CreditCard className="w-4 h-4 flex-shrink-0" />
              <span className="line-clamp-1">${match.precioPorJugador} / jugador</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600 min-h-[32px]">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="line-clamp-1">{match.duracionMinutos} min</span>
            </div>
          </div>

          {/* Map Placeholder */}
          <div className="mt-3 xs:mt-4 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg xs:rounded-xl h-28 xs:h-32 sm:h-36 flex items-center justify-center">
            <MapPin className="w-5 xs:w-6 h-5 xs:h-6 text-gray-600" />
          </div>
        </div>

        {/* Confirmed Players */}
        <div className="bg-white border border-gray-200 rounded-xl xs:rounded-2xl p-4 xs:p-5 sm:p-6 mb-4 xs:mb-5 sm:mb-6">
          <div className="flex items-center justify-between mb-3 xs:mb-4">
            <div className="flex items-center space-x-2">
              <Users className="w-4 xs:w-5 h-4 xs:h-5 text-gray-600" />
              <h3 className="text-sm xs:text-base font-semibold text-gray-900">Jugadores inscriptos</h3>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-orange-50 border-orange-200 text-gray-700 min-h-[40px] text-xs xs:text-sm touch-manipulation active:scale-95"
              onClick={() => router.push(`/matches/${matchId}/players`)}
            >
              Ver
            </Button>
          </div>
          <p className="text-xs xs:text-sm text-gray-600">
            {match.jugadoresActuales || 0} inscriptos • Quedan {(match.cantidadJugadores || 10) - (match.jugadoresActuales || 0)} plazas
          </p>
        </div>

        {/* Cancellation Protection */}
        <div className="flex items-center space-x-2.5 xs:space-x-3 mb-6 xs:mb-8 text-xs xs:text-sm text-gray-600">
          <Shield className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span>Protección de cancelación incluida</span>
        </div>

        {/* Confirm Button */}
        <div>
          <Button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="w-full bg-green-500 hover:bg-green-600 text-white min-h-[48px] text-sm xs:text-base sm:text-lg font-semibold rounded-xl xs:rounded-2xl touch-manipulation active:scale-[0.98]"
            size="lg"
          >
            {isConfirming ? "Confirmando plaza..." : "Confirmar plaza"}
          </Button>
          <p className="text-center text-xs xs:text-sm text-gray-500 mt-2.5 xs:mt-3">
            El organizador revisará tu solicitud
          </p>
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}