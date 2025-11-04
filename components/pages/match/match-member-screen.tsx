"use client"

import { logger } from '@/lib/logger'
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { ArrowLeft, Share2, MapPin, Users, DollarSign, Clock, MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { CompressedMap } from "@/components/google-maps/compressed-map"
import AuthService from "@/lib/auth"
import { PartidoAPI, PartidoDTO } from "@/lib/api"
import { formatMatchType, formatDateRegional as formatDate } from "@/lib/utils"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/hooks/use-toast"

interface MatchMemberScreenProps {
  matchId: string
}

export default function MatchMemberScreen({ matchId }: MatchMemberScreenProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [match, setMatch] = useState<PartidoDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showMapModal, setShowMapModal] = useState(false)

  const currentUser = AuthService.getUser()

  const loadMatchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const token = await AuthService.ensureToken()
      if (!token) {
        router.push("/login")
        return
      }

      const matchResponse = await PartidoAPI.get(matchId)
      if (!matchResponse.success || !matchResponse.data) {
        throw new Error(matchResponse.message || "Error al cargar el partido")
      }

      setMatch(matchResponse.data)
    } catch (err) {
      logger.error("[MatchMember] Error:", err)
      setError(err instanceof Error ? err.message : "Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }, [matchId, router])

  useEffect(() => {
    loadMatchData()
  }, [loadMatchData])

  const handleBack = () => router.back()
  
  const handlePlayerClick = (playerId: string) => {
    if (playerId && playerId !== "undefined") {
      router.push(`/users/${playerId}`)
    }
  }

  const handleEnterGroupChat = () => {
    router.push(`/matches/${matchId}/chat`)
  }

  const handleShareMatch = async () => {
    const shareUrl = `${window.location.origin}/matches/${matchId}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Partido de ${formatMatchType((match as any)?.tipoPartido || "FUTBOL_5")}`,
          text: `¡Únete a este partido! ${(match as any)?.nombreUbicacion || ""}`,
          url: shareUrl,
        })
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          logger.error("Error compartiendo:", err)
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl)
        toast({
          title: "Link copiado",
          description: "El link del partido se copió al portapapeles",
        })
      } catch {
        /* noop */
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner size="lg" variant="green" text="Cargando partido..." />
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="pt-16 pb-6 px-6 border-b border-gray-100">
          <div className="flex items-center space-x-4">
            <button onClick={handleBack} className="p-2 -ml-2">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Partido</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || "Partido no encontrado"}</p>
            <Button onClick={handleBack}>Volver</Button>
          </div>
        </div>
        <BottomNavigation />
      </div>
    )
  }

  const isMatchCancelled = (match as any).estado === "CANCELADO"

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-6 px-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={handleBack} className="p-2 -ml-2">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Mi Partido</h1>
          </div>
          <button
            onClick={handleShareMatch}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            title="Compartir partido"
          >
            <Share2 className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 overflow-y-auto pb-24">
        {/* Estado cancelado */}
        {isMatchCancelled && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-red-800 font-medium">⚠️ Partido cancelado</p>
            <p className="text-red-600 text-sm mt-1">Este partido ha sido cancelado por el organizador</p>
          </div>
        )}

        {/* Match Info Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {formatMatchType((match as any).tipoPartido || "FUTBOL_5")}
            </h2>
          </div>

          <div className="space-y-4">
            {/* Fecha y Hora */}
            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Fecha y hora</p>
                <p className="font-semibold text-gray-900">
                  {formatDate((match as any).fecha)} - {(match as any).hora}
                </p>
              </div>
            </div>

            {/* Ubicación */}
            {(match as any).nombreUbicacion && (
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Ubicación</p>
                  <p className="font-semibold text-gray-900">{(match as any).nombreUbicacion}</p>
                </div>
              </div>
            )}

            {/* Jugadores */}
            <div className="flex items-start space-x-3">
              <Users className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Jugadores</p>
                <p className="font-semibold text-gray-900">
                  {(match as any).jugadoresActuales || 0} / {(match as any).cantidadJugadores || 10}
                </p>
              </div>
            </div>

            {/* Precio */}
            {(match as any).precioTotal > 0 && (
              <div className="flex items-start space-x-3">
                <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Precio por jugador</p>
                  <p className="font-semibold text-gray-900">
                    ${(match as any).precioPorJugador || 0}
                  </p>
                </div>
              </div>
            )}

            {/* Descripción */}
            {(match as any).descripcion && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-600 mb-2">Descripción</p>
                <p className="text-gray-900">{(match as any).descripcion}</p>
              </div>
            )}
          </div>

          {/* Botón Chat Grupal */}
          {!isMatchCancelled && (
            <div className="mt-4">
              <Button
                onClick={handleEnterGroupChat}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat grupal
              </Button>
            </div>
          )}
        </div>

        {/* Map */}
        {(match as any).latitud && (match as any).longitud && (match as any).nombreUbicacion && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Ubicación</h3>
            <div onClick={() => setShowMapModal(true)} className="cursor-pointer">
              <CompressedMap
                location={(match as any).nombreUbicacion}
                lat={(match as any).latitud}
                lng={(match as any).longitud}
              />
            </div>
          </div>
        )}

        {/* Organizador Section */}
        {(match as any).organizador && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Organizador</h3>
            <div
              onClick={() => (match as any).organizador?.id && handlePlayerClick((match as any).organizador.id)}
              className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <Avatar className="w-12 h-12">
                {(match as any).organizador?.foto_perfil ? (
                  <AvatarImage src={`data:image/jpeg;base64,${(match as any).organizador.foto_perfil}`} />
                ) : (
                  <AvatarFallback className="bg-orange-100">
                    {(match as any).organizador?.nombre?.[0] ?? ""}
                    {(match as any).organizador?.apellido?.[0] ?? ""}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <span className="font-semibold text-gray-900 block">
                  {(match as any).organizador?.nombre} {(match as any).organizador?.apellido}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Jugadores Inscriptos */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Jugadores inscriptos ({(match as any).jugadores?.filter((p: any) => p.id !== (match as any).organizadorId).length || 0})
          </h3>

          {(match as any).jugadores && (match as any).jugadores.length > 0 ? (
            <div className="space-y-3">
              {(match as any).jugadores
                .filter((player: any) => player.id !== (match as any).organizadorId)
                .map((player: any) => (
                <div 
                  key={player.id} 
                  className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handlePlayerClick(player.id)}
                >
                  <Avatar className="w-12 h-12">
                    {player.foto_perfil ? (
                      <AvatarImage src={`data:image/jpeg;base64,${player.foto_perfil}`} />
                    ) : (
                      <AvatarFallback className="bg-gray-200">
                        {player.nombre?.[0] ?? ""}{player.apellido?.[0] ?? ""}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {player.nombre} {player.apellido}
                    </div>
                    <div className="text-sm text-gray-600">
                      {player.posicion && `${player.posicion}`}
                      {player.rating && ` • ⭐ ${player.rating}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Aún no hay jugadores inscriptos
            </p>
          )}
        </div>
      </div>

      {/* Modal de mapa expandido */}
      {showMapModal && match && (match as any).latitud && (match as any).longitud && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Ubicación del partido</h3>
              <button
                onClick={() => setShowMapModal(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="flex-1 min-h-[400px]">
              <CompressedMap
                location={(match as any).nombreUbicacion}
                lat={(match as any).latitud}
                lng={(match as any).longitud}
              />
            </div>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  )
}
