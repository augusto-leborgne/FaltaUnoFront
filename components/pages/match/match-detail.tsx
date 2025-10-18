"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { Star, ArrowLeft, Share2, MapPin, Users, DollarSign, Clock, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { CompressedMap } from "@/components/google-maps/compressed-map"
import { AuthService } from "@/lib/auth"
import { PartidoAPI, InscripcionAPI, PartidoDTO, PartidoEstado, TipoPartido, NivelPartido } from "@/lib/api"

interface MatchDetailProps {
  matchId: string
}

export function MatchDetail({ matchId }: MatchDetailProps) {
  const router = useRouter()
  
  // Estados
  const [match, setMatch] = useState<PartidoDTO | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>("")

  // Usuario actual
  const currentUser = AuthService.getUser()
  const isOrganizer = currentUser?.id === match?.organizadorId

  // ============================================
  // EFECTOS
  // ============================================

  useEffect(() => {
    loadMatch()
  }, [matchId])

  // ============================================
  // FUNCIONES DE CARGA
  // ============================================

  const loadMatch = async () => {
    try {
      setIsLoading(true)
      setError("")

      // Validar autenticación
      if (!AuthService.isLoggedIn()) {
        router.push("/login")
        return
      }

      // Cargar partido usando la API refactorizada
      const response = await PartidoAPI.get(matchId)

      if (response.success && response.data) {
        setMatch(response.data)
      } else {
        throw new Error(response.message || "Error al cargar el partido")
      }
    } catch (err) {
      console.error("[MatchDetail] Error cargando partido:", err)
      const errorMessage = err instanceof Error ? err.message : "Error al cargar el partido"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================
  // HANDLERS
  // ============================================

  const handleJoinMatch = async () => {
    if (!match || !currentUser) return

    // Validar que no esté lleno
    if (match.jugadoresActuales >= match.cantidadJugadores) {
      setError("El partido está completo")
      return
    }

    setIsJoining(true)
    setError("")

    try {
      // Crear inscripción
      const response = await InscripcionAPI.crear(match.id!, currentUser.id)

      if (response.success) {
        // Redirigir a confirmación
        router.push(`/matches/${matchId}/confirmed`)
      } else {
        throw new Error(response.message || "Error al inscribirse")
      }
    } catch (err) {
      console.error("[MatchDetail] Error inscribiéndose:", err)
      const errorMessage = err instanceof Error ? err.message : "Error al inscribirse al partido"
      setError(errorMessage)
    } finally {
      setIsJoining(false)
    }
  }

  const handleShareMatch = async () => {
    if (!match) return

    const shareData = {
      title: `Partido de ${formatMatchType(match.tipoPartido)}`,
      text: `¡Únete a este partido! ${formatDate(match.fecha)} ${match.hora} en ${match.nombreUbicacion}`,
      url: `${window.location.origin}/matches/${matchId}`,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        console.log("[MatchDetail] Error compartiendo:", err)
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url)
        alert("Link copiado al portapapeles")
      } catch (err) {
        console.error("[MatchDetail] Error copiando:", err)
      }
    }
  }

  const handlePlayerClick = (playerId: string) => {
    router.push(`/users/${playerId}`)
  }

  const handleBack = () => {
    router.back()
  }

  // ============================================
  // HELPERS DE FORMATO
  // ============================================

  const formatMatchType = (type: string) => {
    const typeMap: Record<string, string> = {
      [TipoPartido.FUTBOL_5]: "Fútbol 5",
      [TipoPartido.FUTBOL_7]: "Fútbol 7",
      [TipoPartido.FUTBOL_8]: "Fútbol 8",
      [TipoPartido.FUTBOL_9]: "Fútbol 9",
      [TipoPartido.FUTBOL_11]: "Fútbol 11",
    }
    return typeMap[type] || type
  }

  const formatLevel = (level?: string) => {
    if (!level) return "Intermedio"
    
    const levelMap: Record<string, string> = {
      [NivelPartido.PRINCIPIANTE]: "Principiante",
      [NivelPartido.INTERMEDIO]: "Intermedio",
      [NivelPartido.AVANZADO]: "Avanzado",
      [NivelPartido.PROFESIONAL]: "Profesional"
    }
    return levelMap[level] || level
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    } catch {
      return dateString
    }
  }

  const getSpotsLeftColor = (spotsLeft: number) => {
    if (spotsLeft === 0) return "bg-red-100 text-red-800"
    if (spotsLeft <= 3) return "bg-yellow-100 text-yellow-800"
    return "bg-green-100 text-green-800"
  }

  // ============================================
  // ESTADOS DE CARGA Y ERROR
  // ============================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando partido...</p>
        </div>
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="text-center mb-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {error || "Partido no encontrado"}
          </h2>
          <p className="text-gray-600">
            {error ? "Por favor intenta nuevamente" : "El partido que buscas no existe"}
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => router.back()} variant="outline">
            Volver
          </Button>
          <Button onClick={loadMatch} className="bg-green-600 hover:bg-green-700">
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  // ============================================
  // CÁLCULOS
  // ============================================

  const spotsLeft = match.cantidadJugadores - match.jugadoresActuales
  const isMatchFull = spotsLeft === 0
  const isMatchCancelled = match.estado === PartidoEstado.CANCELADO
  const isMatchCompleted = match.estado === PartidoEstado.COMPLETADO
  const canJoin = !isOrganizer && !isMatchFull && !isMatchCancelled && !isMatchCompleted

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-6 px-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleBack} 
              className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Detalle del partido</h1>
          </div>
          <button 
            onClick={handleShareMatch} 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Share2 className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 overflow-y-auto">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-600 text-sm font-medium">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
            <button 
              onClick={() => setError("")}
              className="text-red-600 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Estado cancelado/completado */}
        {isMatchCancelled && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-red-800 font-medium">⚠️ Partido cancelado</p>
            <p className="text-red-600 text-sm mt-1">
              Este partido ha sido cancelado por el organizador
            </p>
          </div>
        )}

        {isMatchCompleted && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
            <p className="text-blue-800 font-medium">✓ Partido completado</p>
            <p className="text-blue-600 text-sm mt-1">
              Este partido ya se ha jugado
            </p>
          </div>
        )}

        {/* Match Info Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          {/* Match Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2 flex-wrap">
              <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100">
                {formatMatchType(match.tipoPartido)}
              </Badge>
              <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100">
                {formatLevel(match.nivel)}
              </Badge>
              <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100">
                {match.genero}
              </Badge>
            </div>
            <Badge className={`${getSpotsLeftColor(spotsLeft)} hover:bg-current`}>
              {spotsLeft === 0 ? "Completo" : `Quedan ${spotsLeft}`}
            </Badge>
          </div>

          {/* Match Time */}
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {formatDate(match.fecha)} {match.hora.substring(0, 5)}
          </h2>

          {/* Match Details */}
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div className="flex items-center space-x-2 text-gray-600">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{match.nombreUbicacion}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <DollarSign className="w-4 h-4 flex-shrink-0" />
              <span>${match.precioPorJugador} / jugador</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>{match.duracionMinutos} min</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Users className="w-4 h-4 flex-shrink-0" />
              <span>{match.jugadoresActuales}/{match.cantidadJugadores}</span>
            </div>
          </div>

          {/* Map */}
          {(match.latitud && match.longitud) && (
            <CompressedMap
              location={match.nombreUbicacion}
              lat={match.latitud}
              lng={match.longitud}
              className="mb-4"
            />
          )}
        </div>

        {/* Organizer Section */}
        {match.organizador && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Organizador</h3>
            <div
              onClick={() => handlePlayerClick(match.organizador!.id)}
              className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <Avatar className="w-12 h-12">
                {match.organizador.foto_perfil ? (
                  <AvatarImage src={`data:image/jpeg;base64,${match.organizador.foto_perfil}`} />
                ) : (
                  <AvatarFallback className="bg-orange-100">
                    {match.organizador.nombre?.[0]}{match.organizador.apellido?.[0]}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <span className="font-semibold text-gray-900 block">
                  {match.organizador.nombre} {match.organizador.apellido}
                </span>
                <div className="text-sm text-gray-600">Capitán</div>
              </div>
            </div>
          </div>
        )}

        {/* Players Section */}
        {match.jugadores && match.jugadores.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Jugadores ({match.jugadoresActuales}/{match.cantidadJugadores})
            </h3>

            <div className="space-y-3">
              {match.jugadores.map((player) => (
                <div
                  key={player.id}
                  onClick={() => handlePlayerClick(player.id)}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-12 h-12">
                      {player.foto_perfil ? (
                        <AvatarImage src={`data:image/jpeg;base64,${player.foto_perfil}`} />
                      ) : (
                        <AvatarFallback className="bg-gray-200">
                          {player.nombre[0]}{player.apellido[0]}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {player.nombre} {player.apellido[0]}.
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        {player.posicion && <span>{player.posicion}</span>}
                        {player.rating && (
                          <>
                            <span>•</span>
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span>{player.rating}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {match.descripcion && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Descripción</h3>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-gray-700 whitespace-pre-wrap">{match.descripcion}</p>
            </div>
          </div>
        )}

        {/* Join Button */}
        <div className="pb-24">
          {isOrganizer ? (
            <Button
              onClick={() => router.push(`/my-matches/${matchId}`)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg font-semibold rounded-2xl"
            >
              Gestionar partido
            </Button>
          ) : (
            <>
              <Button
                onClick={handleJoinMatch}
                disabled={isJoining || !canJoin}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isJoining ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Procesando...
                  </span>
                ) : isMatchFull ? (
                  "Partido completo"
                ) : isMatchCancelled ? (
                  "Partido cancelado"
                ) : isMatchCompleted ? (
                  "Partido finalizado"
                ) : (
                  "Solicitar unirme"
                )}
              </Button>
              {canJoin && (
                <p className="text-center text-sm text-gray-500 mt-3">
                  Tu solicitud quedará pendiente de aprobación del organizador
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}