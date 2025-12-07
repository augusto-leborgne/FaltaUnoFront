"use client"


import { logger } from '@/lib/logger'
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { Star, ArrowLeft, Upload, MapPin, Users, DollarSign, Clock, AlertCircle, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { CompressedMap } from "@/components/google-maps/compressed-map"
import { GoogleMapsModal } from "@/components/google-maps/google-maps-modal"
import AuthService from "@/lib/auth"
import { PartidoAPI, InscripcionAPI, PartidoDTO, PartidoEstado, InscripcionEstado, API_BASE } from "@/lib/api"
import { formatMatchType, formatMatchDate, getSpotsLeftColor } from "@/lib/utils"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useWebSocket } from "@/hooks/use-websocket"
import { useToast } from "@/hooks/use-toast"
import { apiCache } from "@/lib/api-cache-manager"
import { useSearchParams } from "next/navigation"

interface MatchDetailProps {
  matchId: string
}

function getTipoPartido(match: PartidoDTO) {
  return (match as any).tipoPartido ?? (match as any).tipo_partido ?? "FUTBOL_5"
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
  const searchParams = useSearchParams()

  // Estado
  const [match, setMatch] = useState<PartidoDTO | null>(null)
  const [jugadores, setJugadores] = useState<any[]>([]) // ✅ NUEVO: Lista de jugadores inscriptos
  const [userInscriptionStatus, setUserInscriptionStatus] = useState<string | null>(null) // ✅ NUEVO: Estado de inscripción del usuario
  const [userInscripcionId, setUserInscripcionId] = useState<string | null>(null) // ID de inscripción del usuario
  const [isJoining, setIsJoining] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false) // Cambiar a false para UI inmediata
  const [error, setError] = useState<string>("")
  const [showMapModal, setShowMapModal] = useState(false)

  // Usuario actual (no forzamos re-render si cambia fuera)
  const currentUser = AuthService.getUser()
  const fromAdmin = searchParams?.get('fromAdmin') === 'true'
  const isAdmin = currentUser?.rol === 'ROLE_ADMIN'
  const isOrganizer = !!(currentUser?.id && match && (currentUser.id === (match as any).organizadorId))
  const canManage = isOrganizer || (fromAdmin && isAdmin)
  const { toast } = useToast()

  // 🔥 WebSocket: Actualizaciones en tiempo real del partido
  useWebSocket({
    partidoId: matchId,
    enabled: !!match, // Solo conectar cuando el partido esté cargado
    onEvent: (event) => {
      logger.log('[MatchDetail] 📡 WebSocket event:', event.type, event)

      switch (event.type) {
        case 'PARTIDO_UPDATED':
          // Actualizar datos del partido
          if (event.partido) {
            setMatch(event.partido)
            // Recargar para asegurar datos completos
            loadMatch()
            // Invalidar caché para que otras pantallas se actualicen
            if (currentUser?.id) {
              apiCache.invalidatePattern(`partidos`) // Invalida TODOS los listados
              apiCache.invalidatePattern(`partido-${matchId}`)
            }
            toast({
              title: "Partido actualizado",
              description: "El partido ha sido modificado por el organizador",
            })
          }
          break

        case 'INSCRIPCION_CREATED':
          // Nueva inscripción - recargar jugadores
          loadMatch()
          break

        case 'INSCRIPCION_STATUS_CHANGED':
          // Estado de inscripción cambiado
          if (event.inscripcion && event.inscripcion.usuarioId === currentUser?.id) {
            // La inscripción del usuario actual cambió
            setUserInscriptionStatus(event.newStatus || null)
            toast({
              title: event.newStatus === InscripcionEstado.ACEPTADO ? "¡Inscripción aceptada!" : "Inscripción rechazada",
              description: event.newStatus === InscripcionEstado.ACEPTADO
                ? "Tu solicitud ha sido aceptada por el organizador"
                : "Tu solicitud ha sido rechazada",
            })
          }
          loadMatch()
          break

        case 'INSCRIPCION_CANCELLED':
          // Jugador abandonó - recargar datos
          loadMatch()
          break

        case 'PARTIDO_CANCELLED':
          // Partido cancelado
          if (match) {
            setMatch({ ...match, estado: PartidoEstado.CANCELADO })
          }
          toast({
            title: "Partido cancelado",
            description: event.reason || "El partido ha sido cancelado por el organizador",
            variant: "destructive",
          })
          break

        case 'PARTIDO_COMPLETED':
          // Partido completado
          if (match) {
            setMatch({ ...match, estado: PartidoEstado.COMPLETADO })
          }
          toast({
            title: "Partido completado",
            description: "El partido ha finalizado",
          })
          break
      }
    }
  })

  // ====== CARGA / RE-CARGA SEGURA DEL PARTIDO ======
  const loadMatch = useCallback(async () => {
    try {
      // Solo mostrar loading si no hay partido cargado
      if (!match) {
        setIsLoading(true)
      }

      setError("")

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

      // ✅ Cargar jugadores y estado en background (no bloquear UI)
      Promise.all([
        // Cargar jugadores inscriptos (ACEPTADOS)
        PartidoAPI.getJugadores(matchId).then(jugadoresResponse => {
          if (jugadoresResponse.success && jugadoresResponse.data) {
            setJugadores(jugadoresResponse.data)
          }
        }).catch(err => {
          logger.error("[MatchDetail] Error cargando jugadores:", err)
        }),

        // Cargar estado de inscripción del usuario
        (async () => {
          const user = AuthService.getUser()
          if (user) {
            try {
              const estadoResponse = await InscripcionAPI.getEstado(matchId, user.id)
              if (estadoResponse.success && estadoResponse.data) {
                setUserInscriptionStatus(estadoResponse.data.estado)
                setUserInscripcionId(estadoResponse.data.inscripcionId || null)
              }
            } catch (err) {
              logger.error("[MatchDetail] Error cargando estado de inscripción:", err)
            }
          }
        })()
      ])

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
      // ✅ Validar si el usuario tiene reviews pendientes antes de inscribirse
      logger.log("[MatchDetail] Verificando reviews pendientes antes de unirse...")
      const token = AuthService.getToken()
      const pendingReviewsResponse = await fetch(
        `${API_BASE}/api/usuarios/${currentUser.id}/pending-reviews`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (pendingReviewsResponse.ok) {
        const reviewsData = await pendingReviewsResponse.json()
        const pendingReviews = Array.isArray(reviewsData.data) ? reviewsData.data : []

        if (pendingReviews.length > 0) {
          logger.warn("[MatchDetail] Usuario tiene reviews pendientes:", pendingReviews.length)
          setError(`Debes calificar a ${pendingReviews.length} jugador${pendingReviews.length > 1 ? 'es' : ''} antes de unirte a un partido`)
          setIsJoining(false)
          return
        }
      }

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

  const handleLeaveMatch = async () => {
    if (!userInscripcionId) {
      setError("No se encontró la inscripción")
      return
    }

    const confirmed = window.confirm(
      "¿Estás seguro de que quieres abandonar este partido? Perderás tu lugar y deberás volver a inscribirte si cambias de opinión."
    )

    if (!confirmed) return

    setIsLeaving(true)
    setError("")

    try {
      const response = await InscripcionAPI.cancelar(userInscripcionId)

      if (!response.success) {
        throw new Error(response.message || "Error al abandonar el partido")
      }

      // Actualizar estado local
      setUserInscriptionStatus(null)
      setUserInscripcionId(null)

      // Recargar datos del partido para actualizar contador
      await loadMatch()

      logger.log("[MatchDetail] Usuario abandonó el partido exitosamente")
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Error al abandonar el partido")
      }
    } finally {
      setIsLeaving(false)
    }
  }

  const handleShareMatch = async () => {
    if (!match) return
    const hora = (match as any).hora ? String((match as any).hora).slice(0, 5) : ""
    const shareData = {
      title: `Partido de ${formatMatchType(getTipoPartido(match))}`,
      text: `¡Únete a este partido! ${formatMatchDate(match.fecha, match.hora)} en ${getNombreUbicacion(match)}`,
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
      <div className="min-h-screen bg-white flex items-center justify-center px-2 xs:px-3 sm:px-4 md:px-6">
        <LoadingSpinner size="lg" variant="green" text="Cargando partido..." />
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-2 xs:px-3 sm:px-4 md:px-6">
        <div className="text-center mb-3 xs:mb-4 sm:mb-5 md:mb-6">
          <AlertCircle className="w-14 xs:w-16 sm:w-20 h-14 xs:h-16 sm:h-20 text-red-500 mx-auto mb-3 xs:mb-4" />
          <h2 className="text-xs xs:text-sm sm:text-base md:text-lg md:text-xl font-bold text-gray-900 mb-2">
            {error || "Partido no encontrado"}
          </h2>
          <p className="text-xs xs:text-sm sm:text-base text-gray-600">
            {error ? "Por favor intenta nuevamente" : "El partido que buscas no existe"}
          </p>
          {retryCount >= 2 && (
            <p className="text-xs xs:text-sm text-gray-500 mt-2">Si el problema persiste, vuelve al inicio.</p>
          )}
        </div>
        <div className="flex gap-2.5 xs:gap-3">
          <Button onClick={handleBack} variant="outline" className="min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] touch-manipulation active:scale-[0.98]">
            Volver
          </Button>
          <Button onClick={handleRetry} className="bg-green-600 hover:bg-green-700 min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] touch-manipulation active:scale-[0.98]">
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
  const isMatchConfirmed = match.estado === PartidoEstado.CONFIRMADO
  const canJoin = !isOrganizer && !isMatchFull && !isMatchCancelled && !isMatchCompleted && !isMatchConfirmed

  const hora = (match as any).hora ? String((match as any).hora).slice(0, 5) : ""
  const nombreUbicacion = getNombreUbicacion(match)

  // ====== RENDER ======
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="w-full pt-6 xs:pt-8 sm:pt-10 md:pt-12 pb-3 sm:pb-4 md:pb-5 px-3 sm:px-4 md:px-6 border-b border-gray-100 bg-white safe-top">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 xs:gap-3 flex-1 min-w-0">
            <button
              onClick={handleBack}
              className="p-2 xs:p-2.5 hover:bg-gray-100 active:bg-gray-200 rounded-lg xs:rounded-xl transition-colors touch-manipulation min-w-[40px] xs:min-w-[44px] sm:min-w-[48px] min-h-[40px] xs:min-h-[44px] sm:min-h-[48px] flex items-center justify-center active:scale-95 flex-shrink-0"
              aria-label="Volver"
            >
              <ArrowLeft className="w-5 h-5 xs:w-5.5 xs:h-5.5 sm:w-6 sm:h-6 text-gray-700" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">Detalle del partido</h1>
            </div>
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={handleShareMatch}
              className="p-2 xs:p-2.5 hover:bg-gray-100 active:bg-gray-200 rounded-lg xs:rounded-xl transition-colors touch-manipulation min-w-[40px] xs:min-w-[44px] sm:min-w-[48px] min-h-[40px] xs:min-h-[44px] sm:min-h-[48px] flex items-center justify-center active:scale-95"
              title="Compartir partido"
            >
              <Upload className="w-5 h-5 xs:w-5.5 xs:h-5.5 sm:w-6 sm:h-6 text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-2 xs:px-3 sm:px-4 md:px-6 py-3 xs:py-4 sm:py-6 overflow-y-auto pb-18 xs:pb-20 sm:pb-22 md:pb-24 safe-bottom">
        {/* Estado cancelado/completado */}
        {isMatchCancelled && (
          <div className="mb-3 xs:mb-4 sm:mb-6 p-3 xs:p-4 sm:p-5 bg-red-50 border-2 border-red-200 rounded-lg xs:rounded-xl sm:rounded-2xl">
            <p className="text-red-800 font-semibold text-xs xs:text-sm sm:text-base md:text-lg">⚠️ Partido cancelado</p>
            <p className="text-red-600 text-xs xs:text-sm sm:text-base mt-1.5">Este partido ha sido cancelado por el organizador</p>
          </div>
        )}

        {isMatchCompleted && (
          <div className="mb-3 xs:mb-4 sm:mb-6 p-3 xs:p-4 sm:p-5 bg-blue-50 border-2 border-blue-200 rounded-lg xs:rounded-xl sm:rounded-2xl">
            <p className="text-blue-800 font-semibold text-xs xs:text-sm sm:text-base md:text-lg">✓ Partido completado</p>
            <p className="text-blue-600 text-xs xs:text-sm sm:text-base mt-1.5">Este partido ya se ha jugado</p>
          </div>
        )}

        {/* Match Info Card */}
        <div className="bg-white border-2 border-gray-200 rounded-lg xs:rounded-xl sm:rounded-2xl p-4 xs:p-5 sm:p-6 mb-3 xs:mb-4 sm:mb-5 md:mb-6 shadow-sm">
          {/* Match Header */}
          <div className="flex items-start justify-between mb-1.5 xs:mb-2 sm:mb-3 md:mb-4 md:mb-5 gap-2.5 xs:gap-3">
            <div className="flex gap-1.5 xs:gap-2 flex-wrap">
              <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 text-xs xs:text-sm sm:text-base px-2.5 xs:px-3 py-1 font-semibold">
                {formatMatchType(getTipoPartido(match))}
              </Badge>
              {Boolean((match as any).genero) && (
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs xs:text-sm sm:text-base px-2.5 xs:px-3 py-1 font-semibold">
                  {(match as any).genero}
                </Badge>
              )}
            </div>
            <Badge className={`${getSpotsLeftColor(spotsLeft)} hover:bg-current text-xs xs:text-sm sm:text-base px-2.5 xs:px-3 py-1 font-semibold whitespace-nowrap flex-shrink-0`}>
              {spotsLeft === 0 ? "Completo" : spotsLeft === 1 ? "Falta 1" : `Faltan ${spotsLeft}`}
            </Badge>
          </div>

          {/* Match Time */}
          <h2 className="text-base xs:text-lg sm:text-xl md:text-2xl md:text-3xl font-bold text-gray-900 mb-1.5 xs:mb-2 sm:mb-3 md:mb-4 md:mb-5 leading-tight">
            {formatMatchDate(match.fecha, match.hora)}
          </h2>

          {/* Match Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 xs:gap-3 sm:gap-4 text-xs xs:text-sm sm:text-base mb-3 xs:mb-4 sm:mb-5 md:mb-6">
            <div className="flex items-center space-x-2 xs:space-x-2.5 text-gray-600 min-h-[32px] xs:min-h-[36px]">
              <MapPin className="w-4 xs:w-5 sm:w-6 h-4 xs:h-5 sm:h-6 flex-shrink-0" />
              <span className="line-clamp-2">{nombreUbicacion}</span>
            </div>
            <div className="flex items-center space-x-2 xs:space-x-2.5 text-gray-600 min-h-[32px] xs:min-h-[36px]">
              <DollarSign className="w-4 xs:w-5 sm:w-6 h-4 xs:h-5 sm:h-6 flex-shrink-0" />
              <span className="font-medium">${getPrecioPorJugador(match)} / jugador</span>
            </div>
            <div className="flex items-center space-x-2 xs:space-x-2.5 text-gray-600 min-h-[32px] xs:min-h-[36px]">
              <Clock className="w-4 xs:w-5 sm:w-6 h-4 xs:h-5 sm:h-6 flex-shrink-0" />
              <span className="font-medium">{getDuracionMinutos(match)} min</span>
            </div>
            <div className="flex items-center space-x-2 xs:space-x-2.5 text-gray-600 min-h-[32px] xs:min-h-[36px]">
              <Users className="w-4 xs:w-5 sm:w-6 h-4 xs:h-5 sm:h-6 flex-shrink-0" />
              <span className="font-medium">
                {getJugadoresActuales(match)}/{getCantidadJugadores(match)}
              </span>
            </div>
          </div>

          {/* Map */}
          {match && (match as any).latitud && (match as any).longitud && (
            <div onClick={(e) => {
              e.stopPropagation()
              setShowMapModal(true)
            }} className="cursor-pointer touch-manipulation active:scale-[0.98] transition-transform rounded-xl overflow-hidden">
              <CompressedMap
                location={(match as any).nombreUbicacion || ''}
                lat={Number((match as any).latitud)}
                lng={Number((match as any).longitud)}
                disableModal
              />
            </div>
          )}
        </div>

        {/* Organizer Section */}
        {Boolean((match as any).organizador) && (
          <div className="bg-white border-2 border-gray-200 rounded-lg xs:rounded-xl sm:rounded-2xl p-4 xs:p-5 sm:p-6 mb-3 xs:mb-4 sm:mb-5 md:mb-6 shadow-sm">
            <h3 className="text-xs xs:text-sm sm:text-base md:text-lg md:text-xl font-bold text-gray-900 mb-3 xs:mb-4">Organizador</h3>
            <div
              onClick={() => handlePlayerClick((match as any).organizador?.id)}
              className="flex items-center space-x-2.5 xs:space-x-3 sm:space-x-2 xs:space-x-3 sm:space-x-4 p-3 xs:p-4 sm:p-5 bg-gray-50 rounded-lg xs:rounded-xl hover:bg-gray-100 active:bg-gray-200 cursor-pointer transition-all touch-manipulation active:scale-[0.98] min-h-[64px] xxs:min-h-[66px] xs:min-h-[68px] sm:min-h-[70px] md:min-h-[72px] xs:min-h-[76px] sm:min-h-[80px]"
            >
              <Avatar className="w-12 xs:w-14 sm:w-16 h-12 xs:h-14 sm:h-16 ring-2 ring-white shadow-sm flex-shrink-0">
                {(match as any).organizador?.foto_perfil ? (
                  <AvatarImage src={`data:image/jpeg;base64,${(match as any).organizador.foto_perfil}`} />
                ) : (
                  <AvatarFallback className="bg-orange-100 text-orange-800 text-lg sm:text-xl font-bold">
                    {((match as any).organizador?.nombre?.[0] ?? "")}
                    {((match as any).organizador?.apellido?.[0] ?? "")}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-gray-900 block text-xs xs:text-sm sm:text-base md:text-lg truncate">
                  {(match as any).organizador?.nombre} {(match as any).organizador?.apellido}
                </span>
                <span className="text-xs xs:text-sm sm:text-base text-gray-500">Creador del partido</span>
              </div>
            </div>
          </div>
        )}

        {/* Players Section - Jugadores Inscriptos */}
        {jugadores.length > 0 && (
          <div className="mb-3 xs:mb-4 sm:mb-5 md:mb-6">
            <h3 className="text-xs xs:text-sm sm:text-base md:text-lg md:text-xl font-bold text-gray-900 mb-3 xs:mb-4">
              Jugadores Inscriptos ({jugadores.filter((p: any) => p.id !== (match as any)?.organizadorId).length}/{getCantidadJugadores(match) - 1})
            </h3>

            <div className="space-y-3">
              {jugadores
                .filter((player: any) => player.id !== (match as any)?.organizadorId) // Excluir organizador de la lista
                .map((player: any) => {
                  if (!player?.id) return null; // Skip invalid players

                  return (
                    <div
                      key={player.id}
                      onClick={() => handlePlayerClick(player.id)}
                      className="flex items-center justify-between p-3 xs:p-4 sm:p-5 bg-gray-50 rounded-lg xs:rounded-xl cursor-pointer hover:bg-gray-100 active:bg-gray-200 transition-all touch-manipulation active:scale-[0.98] min-h-[64px] xxs:min-h-[66px] xs:min-h-[68px] sm:min-h-[70px] md:min-h-[72px] xs:min-h-[76px] sm:min-h-[84px]"
                    >
                      <div className="flex items-center space-x-2.5 xs:space-x-3 sm:space-x-2 xs:space-x-3 sm:space-x-4 flex-1 min-w-0">
                        <Avatar className="w-12 xs:w-14 sm:w-16 h-12 xs:h-14 sm:h-16 ring-2 ring-white shadow-sm flex-shrink-0">
                          {player.foto_perfil ? (
                            <AvatarImage src={`data:image/jpeg;base64,${player.foto_perfil}`} />
                          ) : (
                            <AvatarFallback className="bg-gray-200 text-gray-700 text-lg sm:text-xl font-bold">
                              {(player?.nombre?.[0] ?? "")}
                              {(player?.apellido?.[0] ?? "")}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 text-xs xs:text-sm sm:text-base md:text-lg truncate">
                            {(player?.nombre ?? "")} {(player?.apellido ?? "")}
                          </div>
                          <div className="flex items-center space-x-1.5 xs:space-x-2 text-xs xs:text-sm sm:text-base text-gray-600 flex-wrap">
                            {player.posicion && <span className="truncate">{player.posicion}</span>}
                            {player.rating && (
                              <>
                                {player.posicion && <span className="hidden sm:inline">•</span>}
                                <div className="flex items-center space-x-1">
                                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                  <span className="font-medium">{player.rating}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Description */}
        {Boolean((match as any).descripcion) && (
          <div className="mb-3 xs:mb-4 sm:mb-5 md:mb-6">
            <h3 className="text-xs xs:text-sm sm:text-base md:text-lg md:text-xl font-bold text-gray-900 mb-2.5 xs:mb-3 sm:mb-4">Descripción</h3>
            <div className="bg-gray-50 rounded-lg xs:rounded-xl sm:rounded-2xl p-3 xs:p-4 sm:p-5 border border-gray-200">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-xs xs:text-sm sm:text-base">{(match as any).descripcion}</p>
            </div>
          </div>
        )}

        {/* Join Button */}
        <div>
          {canManage ? (
            <Button
              onClick={() => router.push(`/my-matches/${matchId}${fromAdmin ? '?fromAdmin=true' : ''}`)}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] xs:min-h-[52px] xs:min-h-[54px] sm:min-h-[48px] xs:min-h-[48px] xs:min-h-[52px] sm:min-h-[56px] text-xs xs:text-sm sm:text-base md:text-lg font-semibold rounded-lg xs:rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all touch-manipulation active:scale-[0.98]"
            >
              Gestionar partido
            </Button>
          ) : userInscriptionStatus === InscripcionEstado.ACEPTADO ? (
            // ✅ Usuario ya está aceptado
            <div className="space-y-2.5 xs:space-y-3">
              <Button
                onClick={() => router.push(`/matches/${matchId}/chat`)}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] xs:min-h-[52px] xs:min-h-[54px] sm:min-h-[48px] xs:min-h-[48px] xs:min-h-[52px] sm:min-h-[56px] text-xs xs:text-sm sm:text-base md:text-lg font-semibold rounded-lg xs:rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all touch-manipulation active:scale-[0.98]"
              >
                Ver chat del partido
              </Button>
              {/* Botón de abandonar (solo si el partido NO está confirmado, cancelado o completado) */}
              {!isMatchConfirmed && !isMatchCancelled && !isMatchCompleted && (
                <Button
                  onClick={handleLeaveMatch}
                  disabled={isLeaving}
                  variant="outline"
                  className="w-full border-2 border-red-300 text-red-600 hover:bg-red-50 active:bg-red-100 min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] xs:min-h-[50px] sm:min-h-[48px] xs:min-h-[52px] text-sm xs:text-base font-semibold rounded-lg xs:rounded-xl sm:rounded-2xl transition-all touch-manipulation active:scale-[0.98]"
                >
                  {isLeaving ? (
                    <span className="flex items-center justify-center">
                      <LoadingSpinner size="sm" variant="white" className="mr-2" />
                      Abandonando...
                    </span>
                  ) : (
                    "Abandonar partido"
                  )}
                </Button>
              )}
            </div>
          ) : userInscriptionStatus === InscripcionEstado.PENDIENTE ? (
            // ✅ Usuario tiene solicitud pendiente
            <Button
              disabled
              className="w-full bg-gray-400 text-white min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] xs:min-h-[52px] xs:min-h-[54px] sm:min-h-[48px] xs:min-h-[48px] xs:min-h-[52px] sm:min-h-[56px] text-xs xs:text-sm sm:text-base md:text-lg font-semibold rounded-lg xs:rounded-xl sm:rounded-2xl cursor-not-allowed opacity-75"
            >
              Solicitud pendiente
            </Button>
          ) : (
            <>
              <Button
                onClick={handleJoinMatch}
                disabled={isJoining || !canJoin}
                className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white min-h-[44px] xxs:min-h-[46px] xs:min-h-[48px] sm:min-h-[50px] md:min-h-[52px] xs:min-h-[52px] xs:min-h-[54px] sm:min-h-[48px] xs:min-h-[48px] xs:min-h-[52px] sm:min-h-[56px] text-xs xs:text-sm sm:text-base md:text-lg font-semibold rounded-lg xs:rounded-xl sm:rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all touch-manipulation active:scale-[0.98]"
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
                ) : isMatchConfirmed ? (
                  "Partido confirmado"
                ) : (
                  "Solicitar unirme"
                )}
              </Button>
              {canJoin && (
                <p className="text-center text-xs xs:text-sm sm:text-base text-gray-500 mt-2.5 xs:mt-3 px-3 xs:px-4">
                  Tu solicitud quedará pendiente de aprobación del organizador
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de mapa expandido */}
      {showMapModal && match && (match as any).latitud && (match as any).longitud && (
        <GoogleMapsModal
          isOpen={showMapModal}
          onClose={() => setShowMapModal(false)}
          location={getNombreUbicacion(match)}
          lat={Number((match as any).latitud)}
          lng={Number((match as any).longitud)}
        />
      )}

      <BottomNavigation />
    </div>
  )
}