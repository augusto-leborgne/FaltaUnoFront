"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { Star, ArrowLeft, Share2, MapPin, Users, DollarSign, Clock, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { CompressedMap } from "@/components/google-maps/compressed-map"
import AuthService from "@/lib/auth"
import { PartidoAPI, InscripcionAPI, PartidoDTO, PartidoEstado } from "@/lib/api"
import { formatMatchType, formatLevel, formatDate, getSpotsLeftColor } from "@/lib/utils"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface MatchDetailProps {
  matchId: string
}

function getTipoPartido(match: PartidoDTO) {
  return (match as any).tipoPartido ?? (match as any).tipo_partido ?? "FUTBOL_5"
}
function getNivel(match: PartidoDTO) {
  return (match as any).nivel ?? "INTERMEDIO"
}
function getJugadoresActuales(match: PartidoDTO) {
  return (match as any).jugadoresActuales ?? (match as any).jugadores_actuales ?? 0
}
function getCantidadJugadores(match: PartidoDTO) {
  return (match as any).cantidadJugadores ?? (match as any).cantidad_jugadores ?? 10
}
function getPrecioPorJugador(match: PartidoDTO) {
  return (match as any).precioPorJugador ?? (match as any).precio_por_jugador ?? 0
}
function getDuracionMinutos(match: PartidoDTO) {
  return (match as any).duracionMinutos ?? (match as any).duracion_minutos ?? 90
}
function getNombreUbicacion(match: PartidoDTO) {
  return (match as any).nombreUbicacion ?? (match as any).nombre_ubicacion ?? ""
}

export default function MatchDetail({ matchId }: MatchDetailProps) {
  const router = useRouter()

  // Estado
  const [match, setMatch] = useState<PartidoDTO | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>("")

  // Usuario actual (no forzamos re-render si cambia fuera)
  const currentUser = AuthService.getUser()
  const isOrganizer = !!(currentUser?.id && match && (currentUser.id === (match as any).organizadorId))

  // ====== CARGA / RE-CARGA SEGURA DEL PARTIDO ======
  const loadMatch = useCallback(async () => {
    try {
      setIsLoading(true)
      setError("")
      setMatch(null)

      // Evitar condiciones de carrera al volver desde otra pantalla:
      // esperamos un tick para que AuthService cargue/normalice el token
      const token = await AuthService.ensureToken()
      if (!token) {
        router.push("/login")
        return
      }

      const response = await PartidoAPI.get(matchId) // firma original: sólo (id)

      if (!response.success || !response.data) {
        setError(response.message || "Error al cargar el partido")
        setMatch(null)
        return
      }

      setMatch(response.data)
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Error al cargar el partido")
        setMatch(null)
      }
    } finally {
      setIsLoading(false)
    }
  }, [matchId, router])

  // Carga inicial y cuando cambia el id
  useEffect(() => {
    loadMatch()
  }, [loadMatch])

  // Re-cargar al volver atrás (popstate) y al recuperar foco de la pestaña
  useEffect(() => {
    const onFocus = () => {
      // Solo recargar si el componente está montado y no hay error crítico
      if (!error) {
        loadMatch()
      }
    }
    const onPopState = () => {
      // Recargar cuando el usuario navega hacia atrás
      loadMatch()
    }

    window.addEventListener("focus", onFocus)
    window.addEventListener("popstate", onPopState)
    return () => {
      window.removeEventListener("focus", onFocus)
      window.removeEventListener("popstate", onPopState)
    }
  }, [loadMatch, error])

  // ====== HANDLERS ======
  const handleJoinMatch = async () => {
    if (!match || !currentUser) return

    if (getJugadoresActuales(match) >= getCantidadJugadores(match)) {
      setError("El partido está completo")
      return
    }

    setIsJoining(true)
    setError("")

    try {
      const response = await InscripcionAPI.crear(match.id!, currentUser.id)
      if (response.success) {
        router.push(`/matches/${matchId}/confirmed`)
      } else {
        throw new Error(response.message || "Error al inscribirse")
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Error al inscribirse al partido")
      }
    } finally {
      setIsJoining(false)
    }
  }

  const handleShareMatch = async () => {
    if (!match) return
    const hora = (match as any).hora ? String((match as any).hora).slice(0, 5) : ""
    const shareData = {
      title: `Partido de ${formatMatchType(getTipoPartido(match))}`,
      text: `¡Únete a este partido! ${formatDate(match.fecha)} ${hora} en ${getNombreUbicacion(match)}`,
      url: `${window.location.origin}/matches/${matchId}`,
    }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        /* noop */
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url)
        alert("Link copiado al portapapeles")
      } catch {
        /* noop */
      }
    }
  }

  const handlePlayerClick = (playerId?: string) => {
    if (!playerId || playerId === "undefined" || playerId === "null") {
      alert("Error: No se pudo obtener la información del usuario")
      return
    }
    router.push(`/users/${playerId}`)
  }

  const [retryCount, setRetryCount] = useState(0)
  const handleBack = () => {
    setError("")
    setMatch(null)
    router.back()
  }

  const handleRetry = () => {
    setError("")
    setMatch(null)
    setRetryCount((c) => c + 1)
    loadMatch()
  }

  // ====== ESTADOS DE CARGA/ERROR ======
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner size="lg" variant="green" text="Cargando partido..." />
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
          {retryCount >= 2 && (
            <p className="text-gray-500 mt-2">Si el problema persiste, vuelve al inicio.</p>
          )}
        </div>
        <div className="flex gap-3">
          <Button onClick={handleBack} variant="outline">
            Volver
          </Button>
          <Button onClick={handleRetry} className="bg-green-600 hover:bg-green-700">
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  // ====== CÁLCULOS ======
  const spotsLeft = getCantidadJugadores(match) - getJugadoresActuales(match)
  const isMatchFull = spotsLeft === 0
  const isMatchCancelled = match.estado === PartidoEstado.CANCELADO
  const isMatchCompleted = match.estado === PartidoEstado.COMPLETADO
  const canJoin = !isOrganizer && !isMatchFull && !isMatchCancelled && !isMatchCompleted

  const hora = (match as any).hora ? String((match as any).hora).slice(0, 5) : ""
  const nombreUbicacion = getNombreUbicacion(match)

  // ====== RENDER ======
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
        {/* Estado cancelado/completado */}
        {isMatchCancelled && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-red-800 font-medium">⚠️ Partido cancelado</p>
            <p className="text-red-600 text-sm mt-1">Este partido ha sido cancelado por el organizador</p>
          </div>
        )}

        {isMatchCompleted && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
            <p className="text-blue-800 font-medium">✓ Partido completado</p>
            <p className="text-blue-600 text-sm mt-1">Este partido ya se ha jugado</p>
          </div>
        )}

        {/* Match Info Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          {/* Match Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2 flex-wrap">
              <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100">
                {formatMatchType(getTipoPartido(match))}
              </Badge>
              <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100">
                {formatLevel(getNivel(match))}
              </Badge>
              {Boolean((match as any).genero) && (
                <Badge className="bg-orange-100 text-gray-800 hover:bg-orange-100">
                  {(match as any).genero}
                </Badge>
              )}
            </div>
            <Badge className={`${getSpotsLeftColor(spotsLeft)} hover:bg-current`}>
              {spotsLeft === 0 ? "Completo" : `Quedan ${spotsLeft}`}
            </Badge>
          </div>

          {/* Match Time */}
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {formatDate(match.fecha)} {hora}
          </h2>

          {/* Match Details */}
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div className="flex items-center space-x-2 text-gray-600">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{nombreUbicacion}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <DollarSign className="w-4 h-4 flex-shrink-0" />
              <span>${getPrecioPorJugador(match)} / jugador</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>{getDuracionMinutos(match)} min</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Users className="w-4 h-4 flex-shrink-0" />
              <span>
                {getJugadoresActuales(match)}/{getCantidadJugadores(match)}
              </span>
            </div>
          </div>

          {/* Map */}
          {Boolean((match as any).latitud && (match as any).longitud && nombreUbicacion) && (
            <CompressedMap
              location={nombreUbicacion}
              lat={(match as any).latitud}
              lng={(match as any).longitud}
              className="mb-4"
            />
          )}
        </div>

        {/* Organizer Section */}
        {Boolean((match as any).organizador) && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Organizador</h3>
            <div
              onClick={() => handlePlayerClick((match as any).organizador?.id)}
              className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <Avatar className="w-12 h-12">
                {(match as any).organizador?.foto_perfil ? (
                  <AvatarImage src={`data:image/jpeg;base64,${(match as any).organizador.foto_perfil}`} />
                ) : (
                  <AvatarFallback className="bg-orange-100">
                    {((match as any).organizador?.nombre?.[0] ?? "")}
                    {((match as any).organizador?.apellido?.[0] ?? "")}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <span className="font-semibold text-gray-900 block">
                  {[
                    (match as any).organizador?.nombre ?? "",
                    (match as any).organizador?.apellido ?? ""
                  ].filter(Boolean).join(" ")}
                </span>
                <div className="text-sm text-gray-600">Capitán</div>
              </div>
            </div>
          </div>
        )}

        {/* Players Section */}
        {Array.isArray((match as any).jugadores) && (match as any).jugadores.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Jugadores ({getJugadoresActuales(match)}/{getCantidadJugadores(match)})
            </h3>

            <div className="space-y-3">
              {(match as any).jugadores.map((player: any) => (
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
                          {(player?.nombre?.[0] ?? "")}
                          {(player?.apellido?.[0] ?? "")}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {(player?.nombre ?? "")} {(player?.apellido?.[0] ?? "")}.
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
        {Boolean((match as any).descripcion) && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Descripción</h3>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-gray-700 whitespace-pre-wrap">{(match as any).descripcion}</p>
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
                    <LoadingSpinner size="sm" variant="white" className="mr-2" />
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

      <BottomNavigation />
    </div>
  )
}